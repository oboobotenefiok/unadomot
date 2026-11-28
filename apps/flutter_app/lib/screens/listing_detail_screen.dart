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

  /// Resolves the reader's own id once, so comments can tell their author
  /// apart from everyone else without a second lookup per tile.
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
                                  height: 1.5,
                                ),
                              ),
                              const SizedBox(height: 20),
                              _mapCard(),
                              const SizedBox(height: 24),
                              _tabs(),
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
  }

  Widget _sectionTitle(String text) => Text(
        text,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      );

  Widget _gallery() => InfiniteListingGallery(media: _listing!.media);

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

  Widget _landlordCard() {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: _openLandlord,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: scheme.outlineVariant),
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
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: scheme.onSurface,
                          ),
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
            Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  /// Similar listings and comments share one card with two tabs, so neither
  /// can push the page taller than the other. The tab body has a fixed height
  /// and scrolls on its own, which is what stops a long comment thread from
  /// growing the whole detail page.
  Widget _tabs() {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: DefaultTabController(
        length: 2,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TabBar(
              labelColor: UnaColors.primary,
              unselectedLabelColor: scheme.onSurfaceVariant,
              indicatorColor: UnaColors.primary,
              tabs: [
                Tab(text: 'Similar (${_similar.length})'),
                Tab(text: 'Comments (${_comments.length})'),
              ],
            ),
            SizedBox(
              height: 420,
              child: TabBarView(
                children: [
                  _similarTab(),
                  _commentsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _similarTab() {
    if (_similar.isEmpty) {
      return Center(
        child: Text(
          'No similar listings yet.',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(10),
      itemCount: _similar.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.82,
      ),
      itemBuilder: (context, index) {
        final item = _similar[index];
        final scheme = Theme.of(context).colorScheme;
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
              color: scheme.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: scheme.outlineVariant),
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
                      Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: scheme.onSurface),
                      ),
                      Text(
                        formatNaira(item.price),
                        style: const TextStyle(color: UnaColors.primary, fontSize: 12, fontWeight: FontWeight.w700),
                      ),
                      Text(
                        '${item.lga}, ${item.state}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _commentsTab() {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Expanded(
          child: _loadingComments
              ? const Center(child: CircularProgressIndicator())
              : _comments.isEmpty
                  ? Center(
                      child: Text(
                        'No comments yet.',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      itemCount: _comments.length,
                      itemBuilder: (context, index) => _commentTile(_comments[index]),
                    ),
        ),
        Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  minLines: 1,
                  maxLines: 3,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Add a comment',
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Post comment',
                onPressed: _postingComment ? null : _postComment,
                icon: _postingComment
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send, size: 18),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _commentTile(Map<String, dynamic> comment) {
    final scheme = Theme.of(context).colorScheme;
    final author = (comment['author_name'] ?? comment['user_name'] ?? comment['name'] ?? 'User') as String;
    final body = (comment['body'] ?? '') as String;
    final reactions = (comment['reactions'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];
    final mine = _myId != null && comment['user_id'] == _myId;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: UnaColors.green100,
            child: Text(
              author.isEmpty ? '?' : author.characters.first.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: UnaColors.green900,
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
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  body,
                  style: TextStyle(fontSize: 13, height: 1.35, color: scheme.onSurfaceVariant),
                ),
                if (reactions.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Wrap(
                      spacing: 4,
                      children: reactions.map((reaction) {
                        final count = (reaction['count'] as num?)?.toInt() ?? 1;
                        final selected = reaction['reacted_by_me'] == true;
                        return GestureDetector(
                          onTap: () => _react(comment, reaction['emoji'] as String),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: selected
                                  ? UnaColors.green100
                                  : scheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: selected ? UnaColors.green700 : Colors.transparent,
                              ),
                            ),
                            child: Text(
                              '${reaction['emoji']} $count',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            tooltip: 'React',
            onPressed: () => _react(comment, '👍'),
            icon: Icon(Icons.favorite_border, size: 16, color: scheme.onSurfaceVariant),
          ),
          if (mine)
            IconButton(
              visualDensity: VisualDensity.compact,
              tooltip: 'Delete',
              onPressed: () => _deleteComment(comment),
              icon: Icon(Icons.delete_outline, size: 16, color: scheme.onSurfaceVariant),
            ),
        ],
      ),
    );
  }

  Widget _chip(String label) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
      ),
    );
  }

  Widget _mapCard() {
    final scheme = Theme.of(context).colorScheme;
    final listing = _listing!;
    return InkWell(
      onTap: _openMap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: UnaColors.green100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.map_outlined, color: UnaColors.green900),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Location',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${listing.lga}, ${listing.state}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            const Text(
              'View on map',
              style: TextStyle(color: UnaColors.primary, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
