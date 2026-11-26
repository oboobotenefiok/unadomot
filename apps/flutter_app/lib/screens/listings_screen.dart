import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import 'auth_sheet.dart';
import 'listing_detail_screen.dart';
import 'messages_screen.dart';
import 'verification_screen.dart';

class ListingsScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;

  const ListingsScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
  });

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

  Future<void> _openMessages() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => MessagesScreen(api: widget.api)),
    );
  }

  Future<void> _openVerification() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => VerificationScreen(api: widget.api)),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Find a rental'),
          actions: [
            IconButton(
              tooltip: 'Messages',
              icon: const Icon(Icons.chat_bubble_outline),
              onPressed: _openMessages,
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'verification') _openVerification();
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
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                itemCount: _listings.length,
                                itemBuilder: (context, index) {
                                  final listing = _listings[index];
                                  return _ListingCard(
                                    listing: listing,
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ListingDetailScreen(
                                          api: widget.api,
                                          cache: widget.cache,
                                          appState: widget.appState,
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

class _ListingCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback onTap;

  const _ListingCard({required this.listing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final landlordName =
        listing.landlordName.trim().isEmpty ? 'Landlord' : listing.landlordName;
    final initial = landlordName.characters.first.toUpperCase();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.secondaryContainer,
                backgroundImage: listing.landlordPhotoUrl == null
                    ? null
                    : NetworkImage(listing.landlordPhotoUrl!),
                child: listing.landlordPhotoUrl == null
                    ? Text(initial)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '₦${listing.price.toStringAsFixed(0)} • ${listing.lga}, ${listing.state}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            landlordName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                        if (listing.landlordVerified) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.verified,
                            size: 15,
                            color: theme.colorScheme.primary,
                          ),
                        ],
                        if (listing.isAgentListing) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.secondaryContainer,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Agent',
                              style: theme.textTheme.labelSmall,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
