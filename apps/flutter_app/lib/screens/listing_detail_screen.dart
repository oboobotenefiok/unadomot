import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../api/api_client_comments.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../utils/currency.dart';
import '../widgets/infinite_listing_gallery.dart';
import '../widgets/share_listing_sheet.dart';
import 'auth_sheet.dart';
import 'chat_screen.dart';
import 'listing_code_screen.dart';
import 'map_screen.dart';
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
  String? _myId;

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
      final profile = await widget.api.myProfile();
      if (mounted) setState(() => _myId = profile['id'] as String?);
    } catch (_) {
      // Comment ownership badges are optional.
    }
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
    final username = listing?.landlordUsername;
    if (listing == null || username == null || username.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PublicProfileScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          username: username,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
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
                      padding: const EdgeInsets.only(bottom: 96),
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
                                style: TextStyle(
                                  color: scheme.onSurface,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_listing!.address}, ${_listing!.lga}, ${_listing!.state}',
                                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
                              ),
                              const SizedBox(height: 12),
                              _propertyGrid(),
                              const SizedBox(height: 16),
                              _landlordCard(),
                              if (_listing!.amenities.isNotEmpty) ...[
                                const SizedBox(height: 20),
                                _sectionTitle('Amenities'),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: _listing!.amenities.map(_chip).toList(),
                                ),
                              ],
                              const SizedBox(height: 20),
                              _sectionTitle('Description'),
                              const SizedBox(height: 8),
                              Text(
                                _listing!.description,
                                style: TextStyle(
                                  color: scheme.onSurfaceVariant,
                                  fontSize: 14,
                                  height: 1.45,
                                ),
                              ),
                              const SizedBox(height: 20),
                              Row(
                                children: [
                                  TextButton.icon(
                                    onPressed: _openMap,
                                    icon: const Icon(Icons.map_outlined, size: 18),
                                    label: const Text('View on map'),
                                  ),
                                  const Spacer(),
                                  TextButton.icon(
                                    onPressed: _report,
                                    icon: const Icon(Icons.flag_outlined, size: 18),
                                    label: const Text('Report'),
                                  ),
                                ],
                              ),
                              const Divider(height: 32),
                              LayoutBuilder(
                                builder: (context, constraints) {
                                  if (constraints.maxWidth >= 700) {
                                    return Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        if (_similar.isNotEmpty)
                                          Expanded(flex: 4, child: _similarSection()),
                                        if (_similar.isNotEmpty) const SizedBox(width: 24),
                                        Expanded(
                                          flex: 5,
                                          child: SizedBox(
                                            height: 520,
                                            child: SingleChildScrollView(
                                              child: _commentsSection(),
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  }
                                  return Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      _commentsSection(),
                                      if (_similar.isNotEmpty) ...[
                                        const SizedBox(height: 24),
                                        _similarSection(),
                                      ],
                                    ],
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
      bottomNavigationBar: _listing == null ||
              _isOwner ||
              (_myId != null && _listing!.landlordId == _myId)
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: FilledButton.icon(
                  onPressed: _startingChat ? null : _openChat,
                  icon: _startingChat
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chat_bubble_outline),
                  label: Text(_startingChat ? 'Opening chat…' : 'Message lister'),
                ),
              ),
            ),
    );
  }

  Widget _gallery() => InfiniteListingGallery(media: _listing!.media);

  Widget _similarSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Similar nearby'),
          const SizedBox(height: 8),
          ..._similar.map(
            (item) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: UnaColors.green100,
                backgroundImage: item.media.isEmpty
                    ? null
                    : NetworkImage(item.media.first.url),
                child: item.media.isEmpty
                    ? const Icon(Icons.home_work_outlined, color: UnaColors.green700)
                    : null,
              ),
              title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text('${item.lga}, ${item.state} · ${formatNaira(item.price)}'),
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
            ),
          ),
        ],
      );

  Widget _propertyGrid() {
    final items = <Widget>[];
    if (_listing!.bedrooms != null) {
      items.add(_fact(Icons.bed_outlined, '${_listing!.bedrooms} bed'));
    }
    if (_listing!.bathrooms != null) {
      items.add(_fact(Icons.bathtub_outlined, '${_listing!.bathrooms} bath'));
    }
    if (_listing!.propertyType != null) {
      items.add(_fact(Icons.home_outlined, _listing!.propertyType!));
    }
    if (_listing!.furnishing != null) {
      items.add(_fact(Icons.chair_outlined, _listing!.furnishing!));
    }
    if (items.isEmpty) return const SizedBox.shrink();
    return Wrap(spacing: 8, runSpacing: 8, children: items);
  }

  Widget _fact(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: UnaColors.green100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: UnaColors.green900),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: UnaColors.green900,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );

  Widget _landlordCard() {
    final listing = _listing!;
    return Material(
      color: UnaColors.green100,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: listing.landlordUsername == null ? null : _openLandlord,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: UnaColors.green700,
                backgroundImage: listing.landlordPhotoUrl == null
                    ? null
                    : NetworkImage(listing.landlordPhotoUrl!),
                child: listing.landlordPhotoUrl == null
                    ? Text(
                        _initials(listing.landlordName),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            listing.landlordName.isEmpty ? 'Lister' : listing.landlordName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: UnaColors.green900,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        if (listing.landlordVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 15, color: UnaColors.green700),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      listing.isAgentListing ? 'Agent' : 'Landlord',
                      style: const TextStyle(color: UnaColors.green700, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (listing.landlordUsername != null)
                const Icon(Icons.chevron_right, color: UnaColors.green700),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) => Text(
        title,
        style: const TextStyle(
          color: UnaColors.text900,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      );

  Widget _chip(String label) => Chip(
        label: Text(label),
        backgroundColor: UnaColors.green100,
        side: BorderSide.none,
        labelStyle: const TextStyle(color: UnaColors.green900, fontSize: 12),
      );

  Widget _commentsSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Comments (${_comments.length})'),
          const SizedBox(height: 8),
          if (_loadingComments)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_comments.isEmpty)
            Text(
              'No comments yet. Ask a question about this listing.',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            )
          else
            ..._comments.map(_commentTile),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  minLines: 1,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: 'Ask about this listing',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _postingComment ? null : _postComment,
                icon: _postingComment
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ],
      );

  Widget _commentTile(Map<String, dynamic> comment) {
    final author = comment['author_name'] as String? ?? 'User';
    final body = comment['body'] as String? ?? '';
    final userId = comment['user_id'] as String?;
    final mine = _myId != null && userId == _myId;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: UnaColors.green100,
            child: Text(
              _initials(author),
              style: const TextStyle(
                color: UnaColors.green900,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  author,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(body, style: const TextStyle(fontSize: 13, height: 1.35)),
                Row(
                  children: [
                    TextButton(
                      onPressed: () => _react(comment, '👍'),
                      child: const Text('👍', style: TextStyle(fontSize: 13)),
                    ),
                    if (mine)
                      TextButton(
                        onPressed: () => _deleteComment(comment),
                        child: const Text('Delete', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.characters.first.toUpperCase();
  return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
}
