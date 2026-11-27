import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../widgets/empty_state.dart';
import '../widgets/listing_card.dart';
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

  Future<void> _share(Listing listing) async {
    await showShareListingSheet(context, listing);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Favorites')) : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _favorites.isEmpty
                ? const EmptyState(
                    icon: Icons.favorite_border,
                    title: 'No favorites yet',
                    message: 'Tap the heart on a listing to save it here.',
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _favorites.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.66,
                    ),
                    itemBuilder: (context, index) {
                      final listing = _favorites[index];
                      return ListingCard(
                        listing: listing,
                        isFavorite: true,
                        onFavorite: () => _removeFavorite(listing),
                        onShare: () => _share(listing),
                        onTap: () async {
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
                    },
                  ),
      );
}
