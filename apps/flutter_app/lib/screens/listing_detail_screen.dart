import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../api/api_client_comments.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../utils/currency.dart';
import '../widgets/share_listing_sheet.dart';
import 'auth_sheet.dart';
import 'listing_code_screen.dart';
import 'map_screen.dart';
import 'messages_screen.dart';
import 'public_profile_screen.dart';
import 'report_listing_screen.dart';

class ListingDetailScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;
  final String listingId;

  const ListingDetailScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
    required this.listingId,
  });

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Listing? _listing;
  List<Listing> _similar = [];
  List<Map<String, dynamic>> _comments = [];
  final _commentController = TextEditingController();
  bool _loading = true;
  bool _loadingComments = true;
  bool _postingComment = false;
  bool _isOwner = false;
  String? _error;
  DateTime? _cachedAt;
  bool _favorite = false;
  bool _startingChat = false;
  int _photoIndex = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await widget.api.detail(widget.listingId);
      await widget.cache.cacheDetail(data);
      if (mounted) {
        setState(() {
          _listing = Listing.fromJson(data);
          _cachedAt = null;
        });
      }
      _loadSimilar(Listing.fromJson(data));
    } catch (error) {
      final cached = await widget.cache.readDetail(widget.listingId);
      if (mounted) {
        setState(() {
          if (cached != null) {
            _listing = Listing.fromJson(cached.listing);
            _cachedAt = cached.updatedAt;
          } else {
            _error = error.toString();
          }
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }

    final favorite = await widget.cache.isFavorite(widget.listingId);
    if (mounted) setState(() => _favorite = favorite);
    await _loadOwnership();
    _loadComments();
  }

  Future<void> _loadOwnership() async {
    if (!widget.appState.signedIn) return;
    try {
      final mine = await widget.api.myListings();
      if (mounted) {
        setState(() => _isOwner = mine.any((item) => item['id'] == widget.listingId));
      }
    } catch (_) {
      // Ownership controls are optional if this request fails.
    }
  }

  Future<void> _loadComments() async {
    try {
      final comments = await widget.api.comments(widget.listingId);
      if (mounted) setState(() => _comments = comments);
    } catch (_) {
      // Comments are optional if the request fails.
    } finally {
      if (mounted) setState(() => _loadingComments = false);
    }
  }

  Future<void> _postComment() async {
    if (!await requireAuth(context, widget.appState)) return;
    final body = _commentController.text.trim();
    if (body.isEmpty || _postingComment) return;
    setState(() => _postingComment = true);
    try {
      final comment = await widget.api.postComment(widget.listingId, body);
      if (!mounted) return;
      setState(() {
        _comments = [..._comments, comment];
        _commentController.clear();
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _postingComment = false);
    }
  }

  Future<void> _deleteComment(Map<String, dynamic> comment) async {
    if (!await requireAuth(context, widget.appState)) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete comment?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await widget.api.deleteComment(comment['id'] as String);
      if (!mounted) return;
      setState(() {
        _comments = _comments.where((item) => item['id'] != comment['id']).toList();
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  Future<void> _react(Map<String, dynamic> comment, String emoji) async {
    if (!await requireAuth(context, widget.appState)) return;
    try {
      final data = await widget.api.reactToComment(comment['id'] as String, emoji);
      if (!mounted) return;
      setState(() {
        final index = _comments.indexWhere((item) => item['id'] == comment['id']);
        if (index >= 0) {
          _comments[index] = {
            ..._comments[index],
            'reactions': data['reactions'],
          };
        }
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  Future<void> _loadSimilar(Listing listing) async {
    try {
      final page = await widget.api.browse(
        filters: {'state': listing.state, 'lga': listing.lga},
        limit: 8,
      );
      if (!mounted) return;
      setState(() {
        _similar = page.items
            .map(Listing.fromJson)
            .where((item) => item.id != listing.id)
            .take(6)
            .toList();
      });
    } catch (_) {
      // Similar listings are optional.
    }
  }

  Future<void> _toggleFavorite() async {
    if (!await requireAuth(context, widget.appState)) return;
    final next = !_favorite;
    await widget.cache.setFavorite(widget.listingId, next);
    if (mounted) setState(() => _favorite = next);
  }

  Future<void> _openChat() async {
    if (_isOwner) return;
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted || _startingChat) return;
    setState(() => _startingChat = true);
    try {
      final conversation = await widget.api.startConversation(
        listingId: widget.listingId,
      );
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            api: widget.api,
            conversationId: conversation['id'] as String,
            initialMessage: 'Is this still available?',
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _startingChat = false);
    }
  }

  Future<void> _share() async {
    final listing = _listing;
    if (listing == null) return;
    await showShareListingSheet(context, listing);
  }

  void _openCode() {
    final listing = _listing;
    if (listing?.code == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ListingCodeScreen(
          code: listing!.code!,
          title: listing.title,
        ),
      ),
    );
  }

  Future<void> _report() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;

    final submitted = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => ReportListingScreen(
          api: widget.api,
          listingId: widget.listingId,
        ),
      ),
    );

    if (submitted == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Report submitted')),
      );
    }
  }

  void _openMap() {
    final listing = _listing;
    if (listing == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MapScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          listings: [listing],
        ),
      ),
    );
  }

  void _openLandlord() {
    final listing = _listing;
    if (listing == null || listing.landlordName.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PublicProfileScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          username: listing.landlordName.toLowerCase().replaceAll(' ', ''),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(_listing?.title ?? 'Listing'),
          actions: [
            if (_listing?.code != null)
              IconButton(
                tooltip: 'Listing code',
                onPressed: _openCode,
                icon: const Icon(Icons.qr_code_2),
              ),
            IconButton(
              tooltip: 'Share',
              onPressed: _share,
              icon: const Icon(Icons.share_outlined),
            ),
            IconButton(
              tooltip: 'Favorite',
              onPressed: _toggleFavorite,
              icon: Icon(_favorite ? Icons.favorite : Icons.favorite_border),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : _listing == null
                    ? const Center(child: Text('Listing not found'))
                    : ListView(
                        padding: EdgeInsets.zero,
                        children: [
                          if (_cachedAt != null)
                            Container(
                              width: double.infinity,
                              color: UnaColors.green100,
                              padding: const EdgeInsets.all(8),
                              child: Text(
                                'Offline view - updated ${_cachedAt!.toLocal()}',
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: UnaColors.green900, fontSize: 12),
                              ),
                            ),
                          _gallery(),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        formatNaira(_listing!.price),
                                        style: const TextStyle(
                                          color: UnaColors.primary,
                                          fontSize: 24,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _listing!.status == 'available'
                                            ? UnaColors.green100
                                            : Colors.orange.shade100,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        _listing!.status == 'available'
                                            ? (_listing!.isAgentListing ? 'Agent' : 'Owner')
                                            : _listing!.status.toUpperCase(),
                                        style: TextStyle(
                                          color: _listing!.status == 'available'
                                              ? UnaColors.green900
                                              : Colors.orange.shade900,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _listing!.title,
                                  style: const TextStyle(
                                    color: UnaColors.text900,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_listing!.address}, ${_listing!.lga}, ${_listing!.state}',
                                  style: const TextStyle(color: UnaColors.text600, fontSize: 13),
                                ),
                                const SizedBox(height: 12),
                                _propertyGrid(),
                                const SizedBox(height: 16),
                                _landlordCard(),
                                if (_listing!.amenities.isNotEmpty) ...[
                                  const SizedBox(height: 20),
                                  const Text(
                                    'Amenities',
                                    style: TextStyle(
                                      color: UnaColors.text900,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _listing!.amenities.map((item) => _chip(item)).toList(),
                                  ),
                                ],
                                const SizedBox(height: 20),
                                const Text(
                                  'Description',
                                  style: TextStyle(
                                    color: UnaColors.text900,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _listing!.description,
                                  style: const TextStyle(
                                    color: UnaColors.text700,
                                    fontSize: 14,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 20),
                                _mapCard(),
                                const SizedBox(height: 24),
                                LayoutBuilder(
                                  builder: (context, constraints) {
                                    if (constraints.maxWidth >= 700) {
                                      return Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(child: _similarSection()),
                                          const SizedBox(width: 20),
                                          Expanded(child: _commentsSection()),
                                        ],
                                      );
                                    }
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        _similarSection(),
                                        const SizedBox(height: 24),
                                        _commentsSection(),
                                      ],
                                    );
                                  },
                                ),
                                const SizedBox(height: 20),
                                if (_isOwner)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: UnaColors.green100,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.home_work_outlined, color: UnaColors.green900),
                                        SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            'This is your listing. Manage it from your profile.',
                                            style: TextStyle(color: UnaColors.green900, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                else
                                  FilledButton.icon(
                                    onPressed: _startingChat ? null : _openChat,
                                    icon: const Icon(Icons.chat_bubble_outline),
                                    label: Text(_startingChat ? 'Opening chat...' : 'Chat with lister'),
                                  ),
                                if (!_isOwner) ...[
                                  const SizedBox(height: 8),
                                  TextButton.icon(
                                    onPressed: _report,
                                    icon: const Icon(Icons.flag_outlined),
                                    label: const Text('Report this listing'),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
      );

  Widget _gallery() {
    final media = _listing!.media;
    if (media.isEmpty) {
      return Container(
        height: 240,
        color: UnaColors.green100,
        child: const Center(
          child: Icon(Icons.home_work_outlined, size: 72, color: UnaColors.green700),
        ),
      );
    }
    return Column(
      children: [
        SizedBox(
          height: 260,
          child: PageView.builder(
            itemCount: media.length,
            onPageChanged: (index) => setState(() => _photoIndex = index),
            itemBuilder: (context, index) => Image.network(media[index].url, fit: BoxFit.cover),
          ),
        ),
        if (media.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(media.length, (index) {
                final active = index == _photoIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? UnaColors.green700 : UnaColors.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _propertyGrid() => Row(
        children: [
          _propertyTile(Icons.bed_outlined, 'Bedrooms', _listing!.bedrooms?.toString() ?? '—'),
          const SizedBox(width: 8),
          _propertyTile(Icons.bathtub_outlined, 'Bathrooms', _listing!.bathrooms?.toString() ?? '—'),
          const SizedBox(width: 8),
          _propertyTile(Icons.square_foot, 'Type', _listing!.propertyType ?? '—'),
          const SizedBox(width: 8),
          _propertyTile(Icons.chair_outlined, 'Furnishing', _listing!.furnishing ?? '—'),
        ],
      );

  Widget _propertyTile(IconData icon, String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          decoration: BoxDecoration(
            color: UnaColors.green100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Icon(icon, size: 22, color: UnaColors.green900),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(fontSize: 10, color: UnaColors.text500)),
              const SizedBox(height: 2),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: UnaColors.text900),
              ),
            ],
          ),
        ),
      );

  Widget _landlordCard() => InkWell(
        onTap: _openLandlord,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: UnaColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: UnaColors.border),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: UnaColors.green100,
                backgroundImage: _listing!.landlordPhotoUrl == null
                    ? null
                    : NetworkImage(_listing!.landlordPhotoUrl!),
                child: _listing!.landlordPhotoUrl == null
                    ? const Icon(Icons.person, color: UnaColors.green900)
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            _listing!.landlordName.isEmpty ? 'Landlord' : _listing!.landlordName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                        ),
                        if (_listing!.landlordVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 15, color: Color(0xFF16A34A)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text('View profile', style: TextStyle(color: UnaColors.primary, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: UnaColors.text500),
            ],
          ),
        ),
      );

  Widget _similarSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Similar listings',
            style: TextStyle(color: UnaColors.text900, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          if (_similar.isEmpty)
            const Text('No similar listings yet.', style: TextStyle(color: UnaColors.text500))
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _similar.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.8,
              ),
              itemBuilder: (context, index) {
                final item = _similar[index];
                return InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ListingDetailScreen(
                        api: widget.api,
                        cache: widget.cache,
                        appState: widget.appState,
                        listingId: item.id,
                      ),
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      color: UnaColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: UnaColors.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: item.media.isEmpty
                              ? Container(color: UnaColors.green100, child: const Icon(Icons.home_work_outlined))
                              : Image.network(item.media.first.url, fit: BoxFit.cover, width: double.infinity),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                              Text(formatNaira(item.price), style: const TextStyle(color: UnaColors.primary, fontSize: 12, fontWeight: FontWeight.w700)),
                              Text('${item.lga}, ${item.state}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: UnaColors.text500, fontSize: 10)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      );

  Widget _commentsSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Comments',
                style: TextStyle(color: UnaColors.text900, fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: 8),
              Text('${_comments.length}', style: const TextStyle(color: UnaColors.text500, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  maxLength: 1000,
                  minLines: 1,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Ask a question or leave a note',
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _postingComment ? null : _postComment,
                icon: _postingComment
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loadingComments)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_comments.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('No comments yet. Start the conversation.', style: TextStyle(color: UnaColors.text500)),
            )
          else
            ..._comments.map(_commentTile),
        ],
      );

  Widget _commentTile(Map<String, dynamic> comment) {
    final reactions = (comment['reactions'] as List? ?? [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final photo = comment['photo_url'] as String?;
    final name = comment['name'] as String? ?? 'User';
    return GestureDetector(
      onLongPress: () => _deleteComment(comment),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: UnaColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: UnaColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: UnaColors.green100,
                  backgroundImage: photo == null ? null : NetworkImage(photo),
                  child: photo == null
                      ? Text(
                          name.characters.first.toUpperCase(),
                          style: const TextStyle(color: UnaColors.green900, fontWeight: FontWeight.w700),
                        )
                      : null,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(comment['body'] as String? ?? '', style: const TextStyle(fontSize: 13, height: 1.4)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: ['Love', 'Laugh', 'Cry', 'Dislike', 'Hate'].map((emoji) {
                final count = reactions
                    .where((item) => item['emoji'] == emoji)
                    .fold<int>(0, (sum, item) => sum + ((item['count'] as num?)?.toInt() ?? 0));
                return InkWell(
                  onTap: () => _react(comment, emoji),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: UnaColors.green100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('$emoji $count', style: const TextStyle(fontSize: 11)),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mapCard() => InkWell(
        onTap: _openMap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: UnaColors.green100,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              const Icon(Icons.map_outlined, color: UnaColors.green900),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${_listing!.lga}, ${_listing!.state}',
                  style: const TextStyle(color: UnaColors.green900, fontWeight: FontWeight.w600),
                ),
              ),
              const Icon(Icons.chevron_right, color: UnaColors.green900),
            ],
          ),
        ),
      );

  Widget _chip(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: UnaColors.green100,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          text,
          style: const TextStyle(color: UnaColors.green900, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      );
}
