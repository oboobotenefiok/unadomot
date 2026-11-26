import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
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
  String _query = '';

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

  List<Listing> get _visibleListings {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return _listings;
    return _listings.where((listing) {
      return listing.title.toLowerCase().contains(query) ||
          listing.state.toLowerCase().contains(query) ||
          listing.lga.toLowerCase().contains(query) ||
          listing.address.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final listings = _visibleListings;
    return Scaffold(
      appBar: AppBar(
        title: const Text('UnaDomot'),
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
                : Column(
                    children: [
                      if (_cachedAt != null)
                        Container(
                          width: double.infinity,
                          color: UnaColors.green100,
                          padding: const EdgeInsets.all(8),
                          child: Text(
                            'Offline view • updated ${_relative(_cachedAt!)}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: UnaColors.green900,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                        child: TextField(
                          onChanged: (value) => setState(() => _query = value),
                          decoration: const InputDecoration(
                            hintText: 'Search by title, state or LGA',
                            prefixIcon: Icon(Icons.search),
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: _SectionHeading('Available rentals'),
                      ),
                      Expanded(
                        child: listings.isEmpty
                            ? const Center(child: Text('No listings match your search'))
                            : ListView.builder(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                itemCount: listings.length,
                                itemBuilder: (context, index) {
                                  final listing = listings[index];
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: _ListingCard(
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
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
      ),
    );
  }

  String _relative(DateTime time) {
    final difference = DateTime.now().difference(time);
    if (difference.inMinutes < 1) return 'just now';
    if (difference.inHours < 1) return '${difference.inMinutes}m ago';
    if (difference.inDays < 1) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}

class _SectionHeading extends StatelessWidget {
  final String text;

  const _SectionHeading(this.text);

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              color: UnaColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: const TextStyle(
              color: UnaColors.text900,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      );
}

class _ListingCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback onTap;

  const _ListingCard({required this.listing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final landlordName =
        listing.landlordName.trim().isEmpty ? 'Landlord' : listing.landlordName;
    final imageUrl = listing.media.isEmpty ? null : listing.media.first.url;

    return Material(
      color: UnaColors.surface,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 170,
              width: double.infinity,
              child: imageUrl == null
                  ? Container(
                      color: UnaColors.green100,
                      child: const Icon(
                        Icons.home_work_outlined,
                        size: 48,
                        color: UnaColors.green700,
                      ),
                    )
                  : Image.network(imageUrl, fit: BoxFit.cover),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          listing.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: UnaColors.text900,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: UnaColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '₦${listing.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${listing.lga}, ${listing.state}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: UnaColors.text600,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          landlordName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: UnaColors.text500,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (listing.landlordVerified) ...[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.verified,
                          size: 15,
                          color: UnaColors.green700,
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
                            color: UnaColors.green100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Agent',
                            style: TextStyle(
                              color: UnaColors.green900,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
