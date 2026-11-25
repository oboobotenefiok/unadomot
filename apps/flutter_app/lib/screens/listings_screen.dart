import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import 'listing_detail_screen.dart';
import 'messages_screen.dart';
import 'verification_screen.dart';

class ListingsScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;

  const ListingsScreen({super.key, required this.api, required this.cache});

  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  List<Listing> _listings = [];
  bool _loading = true;
  String? _error;
  DateTime? _cachedAt;

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
      final page = await widget.api.browse();
      await widget.cache.cacheListings(page.items);
      if (mounted) {
        setState(() {
          _listings = page.items.map(Listing.fromJson).toList();
          _cachedAt = null;
        });
      }
    } catch (error) {
      final cached = await widget.cache.readListings();
      if (mounted) {
        setState(() {
          if (cached != null) {
            _listings = cached.listings.map(Listing.fromJson).toList();
            _cachedAt = cached.updatedAt;
          } else {
            _error = error.toString();
          }
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Find a rental'),
          actions: [
            IconButton(
              tooltip: 'Messages',
              icon: const Icon(Icons.chat_bubble_outline),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => MessagesScreen(api: widget.api),
                ),
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'verification') {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => VerificationScreen(api: widget.api),
                    ),
                  );
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'verification', child: Text('Verification')),
              ],
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _listings.isEmpty
                      ? const Center(child: Text('No listings yet'))
                      : Column(
                          children: [
                            if (_cachedAt != null)
                              Container(
                                width: double.infinity,
                                color: Theme.of(context).colorScheme.secondaryContainer,
                                padding: const EdgeInsets.all(8),
                                child: Text(
                                  'Offline view • updated ${_relative(_cachedAt!)}',
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            Expanded(
                              child: ListView.builder(
                                itemCount: _listings.length,
                                itemBuilder: (context, index) {
                                  final listing = _listings[index];
                                  return ListTile(
                                    title: Text(listing.title),
                                    subtitle: Text(
                                      '₦${listing.price.toStringAsFixed(0)} • ${listing.lga}, ${listing.state}',
                                    ),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ListingDetailScreen(
                                          api: widget.api,
                                          cache: widget.cache,
                                          listingId: listing.id,
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
        ),
      );

  String _relative(DateTime time) {
    final difference = DateTime.now().difference(time);
    if (difference.inMinutes < 1) return 'just now';
    if (difference.inHours < 1) return '${difference.inMinutes}m ago';
    if (difference.inDays < 1) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}
