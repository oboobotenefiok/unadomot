import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../api/api_client_lookup.dart';
import '../app_settings.dart';
import '../data/local_cache.dart';
import '../data/nigeria_locations.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../utils/feed_ranker.dart';
import '../widgets/home_carousel.dart';
import '../widgets/listing_card.dart';
import '../widgets/share_listing_sheet.dart';
import '../widgets/skeletons.dart';
import 'auth_sheet.dart';
import 'create_listing_screen.dart';
import 'favorites_screen.dart';
import 'listing_detail_screen.dart';
import 'map_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';

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
  final _scrollController = ScrollController();
  List<Listing> _listings = [];
  Set<String> _favoriteIds = {};
  Set<String> _myListingIds = {};
  Map<String, double> _affinity = {};
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  bool _showScrollTop = false;
  int _offset = 0;
  String? _error;
  DateTime? _cachedAt;
  String _query = '';
  Map<String, String> _filters = {};

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _load();
    _loadFavorites();
    _loadAffinity();
    _loadOwnedListings();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadFavorites() async {
    final ids = await widget.cache.readFavoriteIds();
    if (mounted) setState(() => _favoriteIds = ids);
  }

  Future<void> _loadAffinity() async {
    final affinity = await widget.cache.readAffinity();
    if (mounted) setState(() => _affinity = affinity);
  }

  Future<void> _loadOwnedListings() async {
    if (!widget.appState.signedIn) return;
    try {
      final mine = await widget.api.myListings();
      if (mounted) {
        setState(() => _myListingIds = mine.map((item) => item['id'] as String).toSet());
      }
    } catch (_) {
      // Ownership controls are optional if this request fails.
    }
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 300) {
      _loadMore();
    }
    final show = position.pixels > 400;
    if (show != _showScrollTop) {
      setState(() => _showScrollTop = show);
    }
  }

  void _scrollToTop() {
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _offset = 0;
    });

    try {
      final page = await widget.api.browse(filters: _filters);
      await widget.cache.cacheListings(page.items);
      if (mounted) {
        setState(() {
          _listings = page.items.map(Listing.fromJson).toList();
          _hasMore = page.hasMore;
          _offset = page.nextOffset;
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
            _hasMore = false;
          } else {
            _error = error.toString();
          }
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore || _loading) return;
    setState(() => _loadingMore = true);
    try {
      final page = await widget.api.browse(
        filters: _filters,
        offset: _offset,
      );
      await widget.cache.cacheListings(page.items);
      if (mounted) {
        setState(() {
          _listings = [
            ..._listings,
            ...page.items.map(Listing.fromJson),
          ];
          _hasMore = page.hasMore;
          _offset = page.nextOffset;
        });
      }
    } catch (_) {
      // Keep the already loaded pages visible.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _toggleFavorite(Listing listing) async {
    if (!await requireAuth(context, widget.appState)) return;
    final next = !_favoriteIds.contains(listing.id);
    await widget.cache.setFavorite(listing.id, next);
    if (!mounted) return;
    setState(() {
      if (next) {
        _favoriteIds = {..._favoriteIds, listing.id};
      } else {
        _favoriteIds = {..._favoriteIds}..remove(listing.id);
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(next ? 'Saved to favorites' : 'Removed from favorites'),
      ),
    );
  }

  Future<void> _share(Listing listing) async {
    await showShareListingSheet(context, listing);
  }

  Future<void> _messageListing(Listing listing) async {
    if (_myListingIds.contains(listing.id)) return;
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;
    try {
      final conversation = await widget.api.startConversation(
        listingId: listing.id,
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

  Future<void> _openFavorites() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FavoritesScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
        ),
      ),
    );
  }

  Future<void> _openProfile() async {
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProfileScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
        ),
      ),
    );
  }

  Future<void> _openPost() async {
    if (!await requireAuth(context, widget.appState, register: true)) return;
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CreateListingScreen(
          api: widget.api,
          cache: widget.cache,
        ),
      ),
    );
    if (mounted) _load();
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _FilterSheet(initial: _filters),
    );
    if (result == null) return;
    setState(() => _filters = result);
    _load();
  }

  Future<void> _openCodeLookup() async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Find by code'),
        content: TextField(
          controller: controller,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Listing code',
            hintText: 'e.g. A1B2C3D4',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Open'),
          ),
        ],
      ),
    );
    if (code == null || code.isEmpty || !mounted) return;

    try {
      final data = await widget.api.listingByCode(code);
      final id = data['id'] as String?;
      if (id == null || !mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ListingDetailScreen(
            api: widget.api,
            cache: widget.cache,
            appState: widget.appState,
            listingId: id,
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  void _openMap() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MapScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          listings: _visibleListings,
        ),
      ),
    );
  }

  Future<void> _openAccessibility() async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Accessibility',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            ValueListenableBuilder<ThemeMode>(
              valueListenable: appThemeMode,
              builder: (context, mode, _) => SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Dark mode'),
                subtitle: const Text('Use a darker palette across the app'),
                value: mode == ThemeMode.dark,
                onChanged: (value) async {
                  appThemeMode.value = value ? ThemeMode.dark : ThemeMode.light;
                  await widget.cache.setSetting('theme_mode', value ? 'dark' : 'light');
                },
              ),
            ),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.text_fields),
              title: Text('Larger text'),
              subtitle: Text('Use your device text size setting'),
            ),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.contrast),
              title: Text('High contrast'),
              subtitle: Text('Coming soon'),
            ),
          ],
        ),
      ),
    );
  }

  List<Listing> get _visibleListings {
    final query = _query.trim().toLowerCase();
    final filtered = query.isEmpty
        ? _listings
        : _listings.where((listing) {
            return listing.title.toLowerCase().contains(query) ||
                listing.state.toLowerCase().contains(query) ||
                listing.lga.toLowerCase().contains(query) ||
                listing.address.toLowerCase().contains(query);
          }).toList();
    return FeedRanker.rank(
      listings: filtered,
      affinity: _affinity,
      favorites: _favoriteIds,
    );
  }

  Future<void> _openDetail(Listing listing) async {
    try {
      await widget.cache.addAffinity(FeedRanker.affinityFor(listing));
      if (mounted) {
        setState(() {
          _affinity = {
            ..._affinity,
            ...FeedRanker.affinityFor(listing),
          };
        });
      }
    } catch (_) {
      // A cache failure must never block opening the listing.
    }
    if (!mounted) return;
    Navigator.push(
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
  }

  @override
  Widget build(BuildContext context) {
    final listings = _visibleListings;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Filters',
          icon: Badge(
            isLabelVisible: _filters.isNotEmpty,
            child: const Icon(Icons.tune),
          ),
          onPressed: _openFilters,
        ),
        titleSpacing: 0,
        title: TextField(
          onChanged: (value) => setState(() => _query = value),
          decoration: const InputDecoration(
            hintText: 'Search homes, states, LGAs',
            prefixIcon: Icon(Icons.search),
            isDense: true,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Find by code',
            icon: const Icon(Icons.qr_code_2),
            onPressed: _openCodeLookup,
          ),
          IconButton(
            tooltip: 'Map view',
            icon: const Icon(Icons.map_outlined),
            onPressed: _openMap,
          ),
          IconButton(
            tooltip: 'Accessibility',
            icon: const Icon(Icons.accessibility_new),
            onPressed: _openAccessibility,
          ),
        ],
      ),
      floatingActionButton: _showScrollTop
          ? FloatingActionButton.small(
              tooltip: 'Back to top',
              onPressed: _scrollToTop,
              child: const Icon(Icons.keyboard_arrow_up),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const ListingSkeletonList()
            : _error != null
                ? Center(child: Text(_error!))
                : CustomScrollView(
                    controller: _scrollController,
                    slivers: [
                      if (_cachedAt != null)
                        SliverToBoxAdapter(
                          child: Container(
                            width: double.infinity,
                            color: UnaColors.green100,
                            padding: const EdgeInsets.all(8),
                            child: Text(
                              'Offline view - updated ${_relative(_cachedAt!)}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: UnaColors.green900,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Welcome home',
                              style: TextStyle(
                                color: UnaColors.green900,
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (listings.isNotEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: HomeCarousel(
                              listings: listings.take(5).toList(),
                              onTap: _openDetail,
                            ),
                          ),
                        ),
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
                          child: _SectionHeading('Available rentals'),
                        ),
                      ),
                      if (listings.isEmpty)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(child: Text('No listings match your search')),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          sliver: SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 0.66,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final listing = listings[index];
                                return ListingCard(
                                  listing: listing,
                                  isFavorite: _favoriteIds.contains(listing.id),
                                  isOwner: _myListingIds.contains(listing.id),
                                  onFavorite: () => _toggleFavorite(listing),
                                  onMessage: _myListingIds.contains(listing.id) ? null : () => _messageListing(listing),
                                  onShare: () => _share(listing),
                                  onTap: () => _openDetail(listing),
                                );
                              },
                              childCount: listings.length,
                            ),
                          ),
                        ),
                      if (_loadingMore)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(child: CircularProgressIndicator()),
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

class _FilterSheet extends StatefulWidget {
  final Map<String, String> initial;

  const _FilterSheet({required this.initial});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  static const _types = [
    'Apartment', 'House', 'Self Contain', 'Room', 'Duplex',
  ];

  static const _furnishingOptions = [
    'Furnished', 'Semi-furnished', 'Unfurnished',
  ];

  late String? _state;
  late String? _type;
  late String? _bedrooms;
  late String? _furnishing;
  final _lga = TextEditingController();
  final _minPrice = TextEditingController();
  final _maxPrice = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = widget.initial['state'];
    _type = widget.initial['property_type'];
    _bedrooms = widget.initial['bedrooms'];
    _furnishing = widget.initial['furnishing'];
    _lga.text = widget.initial['lga'] ?? '';
    _minPrice.text = widget.initial['min_price'] ?? '';
    _maxPrice.text = widget.initial['max_price'] ?? '';
  }

  @override
  void dispose() {
    _lga.dispose();
    _minPrice.dispose();
    _maxPrice.dispose();
    super.dispose();
  }

  void _apply() {
    final filters = <String, String>{};
    if (_state != null) filters['state'] = _state!;
    if (_lga.text.trim().isNotEmpty) filters['lga'] = _lga.text.trim();
    if (_type != null) filters['property_type'] = _type!;
    if (_bedrooms != null) filters['bedrooms'] = _bedrooms!;
    if (_furnishing != null) filters['furnishing'] = _furnishing!;
    if (_minPrice.text.trim().isNotEmpty) filters['min_price'] = _minPrice.text.trim();
    if (_maxPrice.text.trim().isNotEmpty) filters['max_price'] = _maxPrice.text.trim();
    Navigator.pop(context, filters);
  }

  void _clear() {
    setState(() {
      _state = null;
      _type = null;
      _bedrooms = null;
      _furnishing = null;
      _lga.clear();
      _minPrice.clear();
      _maxPrice.clear();
    });
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(
          24,
          16,
          24,
          24 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: UnaColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Filter listings',
                style: TextStyle(
                  color: UnaColors.text900,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _state,
                decoration: const InputDecoration(labelText: 'State'),
                items: NigeriaLocations.states
                    .map((state) => DropdownMenuItem(value: state, child: Text(state)))
                    .toList(),
                onChanged: (value) => setState(() => _state = value),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _lga,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'LGA',
                  hintText: 'e.g. Ikeja, Gwarinpa, Port Harcourt',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Property type'),
                items: _types
                    .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                    .toList(),
                onChanged: (value) => setState(() => _type = value),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _bedrooms,
                decoration: const InputDecoration(labelText: 'Bedrooms'),
                items: const [
                  DropdownMenuItem(value: '1', child: Text('1+')),
                  DropdownMenuItem(value: '2', child: Text('2+')),
                  DropdownMenuItem(value: '3', child: Text('3+')),
                  DropdownMenuItem(value: '4', child: Text('4+')),
                ],
                onChanged: (value) => setState(() => _bedrooms = value),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _furnishing,
                decoration: const InputDecoration(labelText: 'Furnishing'),
                items: _furnishingOptions
                    .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                    .toList(),
                onChanged: (value) => setState(() => _furnishing = value),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _minPrice,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Min price'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _maxPrice,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Max price'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _clear,
                      child: const Text('Clear'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _apply,
                      child: const Text('Apply filters'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
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
