import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
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

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Favorites')) : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _favorites.isEmpty
                ? const Center(
                    child: Text('No favorites yet. Tap the heart on a listing.'),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _favorites.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final listing = _favorites[index];
                      return Material(
                        color: UnaColors.surface,
                        borderRadius: BorderRadius.circular(8),
                        clipBehavior: Clip.antiAlias,
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: UnaColors.green100,
                            backgroundImage: listing.media.isEmpty
                                ? null
                                : NetworkImage(listing.media.first.url),
                            child: listing.media.isEmpty
                                ? const Icon(
                                    Icons.home_work_outlined,
                                    color: UnaColors.green700,
                                  )
                                : null,
                          ),
                          title: Text(listing.title),
                          subtitle: Text('${listing.lga}, ${listing.state}'),
                          trailing: Text(
                            'N${listing.price.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: UnaColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
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
                        ),
                      );
                    },
                  ),
      );
}
