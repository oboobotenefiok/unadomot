import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import 'auth_sheet.dart';
import 'messages_screen.dart';

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
  bool _loading = true;
  String? _error;
  DateTime? _cachedAt;
  bool _favorite = false;
  bool _startingChat = false;

  @override
  void initState() {
    super.initState();
    _load();
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
  }

  Future<void> _toggleFavorite() async {
    if (!await requireAuth(context, widget.appState)) return;
    final next = !_favorite;
    await widget.cache.setFavorite(widget.listingId, next);
    if (mounted) setState(() => _favorite = next);
  }

  Future<void> _openChat() async {
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

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(_listing?.title ?? 'Listing'),
          actions: [
            IconButton(
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
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_cachedAt != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Text(
                                'Offline view • updated ${_cachedAt!.toLocal()}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ),
                          if (_listing!.media.isNotEmpty)
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: Image.network(
                                _listing!.media.first.url,
                                fit: BoxFit.cover,
                              ),
                            ),
                          const SizedBox(height: 16),
                          Text(
                            '₦${_listing!.price.toStringAsFixed(0)}',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 8),
                          Text('${_listing!.lga}, ${_listing!.state}'),
                          const SizedBox(height: 16),
                          Text(_listing!.description),
                          const SizedBox(height: 24),
                          FilledButton.icon(
                            onPressed: _startingChat ? null : _openChat,
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: Text(
                              _startingChat ? 'Opening chat...' : 'Chat with lister',
                            ),
                          ),
                        ],
                      ),
      );
}
