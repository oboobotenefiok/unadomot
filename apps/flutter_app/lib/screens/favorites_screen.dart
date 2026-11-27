import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
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
                ? const Center(
                    child: Text('No favorites yet. Tap the heart on a listing.'),
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
                      return _FavoriteCard(
                        listing: listing,
                        onRemove: () => _removeFavorite(listing),
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

class _FavoriteCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback onRemove;
  final VoidCallback onShare;
  final VoidCallback onTap;

  const _FavoriteCard({
    required this.listing,
    required this.onRemove,
    required this.onShare,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.media.isEmpty ? null : listing.media.first.url;
    return Material(
      color: UnaColors.surface,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (imageUrl == null)
                    Container(
                      color: UnaColors.green100,
                      child: const Icon(Icons.home_work_outlined, size: 40, color: UnaColors.green700),
                    )
                  else
                    Image.network(imageUrl, fit: BoxFit.cover),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Row(
                      children: [
                        InkWell(
                          onTap: onShare,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                            child: const Icon(Icons.share_outlined, size: 15, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: onRemove,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                            child: const Icon(Icons.favorite, size: 16, color: Colors.red),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text900, fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₦${listing.price.toStringAsFixed(0)}',
                    style: const TextStyle(color: UnaColors.primary, fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${listing.lga}, ${listing.state}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text500, fontSize: 11),
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
