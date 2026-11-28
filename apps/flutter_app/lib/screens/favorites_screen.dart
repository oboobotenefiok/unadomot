import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../widgets/empty_state.dart';
import '../widgets/listing_card.dart';
import '../widgets/responsive_grid.dart';
import '../widgets/share_listing_sheet.dart';
import 'listing_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;
  final bool showAppBar;

  const FavoritesScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
    this.showAppBar = true,
  });

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Listing> _favorites = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final ids = await widget.cache.readFavoriteIds();
    final cached = await widget.cache.readListings();
    final listings = (cached?.listings ?? [])
        .map(Listing.fromJson)
        .where((listing) => ids.contains(listing.id))
        .toList();
    if (mounted) {
      setState(() {
        _favorites = listings;
        _loading = false;
      });
    }
  }

  Future<void> _removeFavorite(Listing listing) async {
    await widget.cache.setFavorite(listing.id, false);
    if (mounted) {
      setState(() => _favorites = _favorites.where((item) => item.id != listing.id).toList());
    }
  }

  Future<void> _removeUnavailable() async {
    final unavailable = _favorites.where((item) => item.status != 'available').toList();
    for (final listing in unavailable) {
      await widget.cache.setFavorite(listing.id, false);
    }
    if (mounted) {
      setState(() => _favorites = _favorites.where((item) => item.status == 'available').toList());
    }
  }

  Future<void> _share(Listing listing) async {
    await showShareListingSheet(context, listing);
  }

  @override
  Widget build(BuildContext context) {
    final available = _favorites.where((item) => item.status == 'available').toList();
    final unavailable = _favorites.where((item) => item.status != 'available').toList();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: widget.showAppBar ? AppBar(title: const Text('Favorites')) : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _favorites.isEmpty
              ? EmptyState(
                  icon: Icons.favorite_border,
                  title: 'No saved listings yet',
                  message: 'Tap the heart icon on any listing to save it here.',
                  actionLabel: 'Browse Listings',
                  onAction: () => Navigator.pop(context),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                  children: [
                    Text(
                      'Saved Listings',
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 20),
                    if (available.isNotEmpty) ...[
                      Text(
                        'Available Listings',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _grid(available, unavailable: false),
                    ],
                    if (unavailable.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Unavailable Listings',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: _removeUnavailable,
                            child: Text(
                              'Remove all',
                              style: TextStyle(color: theme.colorScheme.error),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _grid(unavailable, unavailable: true),
                    ],
                  ],
                ),
    );
  }

  Widget _grid(List<Listing> listings, {required bool unavailable}) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: listings.length,
        gridDelegate: responsiveGridDelegate(
          context,
          childAspectRatio: 0.78,
        ),
        itemBuilder: (context, index) {
          final listing = listings[index];
          final card = ListingCard(
            listing: listing,
            isFavorite: true,
            onFavorite: unavailable ? null : () => _removeFavorite(listing),
            onShare: unavailable ? null : () => _share(listing),
            onTap: unavailable
                ? null
                : () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ListingDetailScreen(
                          api: widget.api,
                          cache: widget.cache,
                          appState: widget.appState,
                          listingId: listing.id,
                        ),
                      ),
                    );
                    _load();
                  },
          );
          if (!unavailable) return card;
          return Stack(
            children: [
              ColorFiltered(
                colorFilter: const ColorFilter.matrix(<double>[
                  0.2126, 0.7152, 0.0722, 0, 0,
                  0.2126, 0.7152, 0.0722, 0, 0,
                  0.2126, 0.7152, 0.0722, 0, 0,
                  0, 0, 0, 1, 0,
                ]),
                child: card,
              ),
              Positioned(
                top: 8,
                left: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.error,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'This listing is no longer available',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onError,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      );
}
