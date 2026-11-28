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
                  ...[truncated]