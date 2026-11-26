import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'auth_sheet.dart';
import 'create_listing_screen.dart';
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
  final _scrollController = ScrollController();
  List<Listing> _listings = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
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
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 300) {
      _loadMore();
    }
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
            tooltip: 'Filters',
            icon: Badge(
              isLabelVisible: _filters.isNotEmpty,
              child: const Icon(Icons.tune),
            ),
            onPressed: _openFilters,
          ),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openPost,
        backgroundColor: UnaColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_home_work_outlined),
        label: const Text('Post listing'),
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
                                controller: _scrollController,
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                                itemCount: listings.length + (_loadingMore ? 1 : 0),
                                itemBuilder: (context, index) {
                                  if (index >= listings.length) {
                                    return const Padding(
                                      padding: EdgeInsets.all(16),
                                      child: Center(child: CircularProgressIndicator()),
                                    );
                                  }
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

class _FilterSheet extends StatefulWidget {
  final Map<String, String> initial;

  const _FilterSheet({required this.initial});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  static const _states = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
    'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
    'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  ];

  static const _types = [
    'Apartment', 'House', 'Self Contain', 'Room', 'Duplex',
  ];

  late String? _state;
  late String? _type;
  late String? _bedrooms;
  final _minPrice = TextEditingController();
  final _maxPrice = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = widget.initial['state'];
    _type = widget.initial['property_type'];
    _bedrooms = widget.initial['bedrooms'];
    _minPrice.text = widget.initial['min_price'] ?? '';
    _maxPrice.text = widget.initial['max_price'] ?? '';
  }

  @override
  void dispose() {
    _minPrice.dispose();
    _maxPrice.dispose();
    super.dispose();
  }

  void _apply() {
    final filters = <String, String>{};
    if (_state != null) filters['state'] = _state!;
    if (_type != null) filters['property_type'] = _type!;
    if (_bedrooms != null) filters['bedrooms'] = _bedrooms!;
    if (_minPrice.text.trim().isNotEmpty) filters['min_price'] = _minPrice.text.trim();
    if (_maxPrice.text.trim().isNotEmpty) filters['max_price'] = _maxPrice.text.trim();
    Navigator.pop(context, filters);
  }

  void _clear() {
    setState(() {
      _state = null;
      _type = null;
      _bedrooms = null;
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
                items: _states
                    .map((state) => DropdownMenuItem(value: state, child: Text(state)))
                    .toList(),
                onChanged: (value) => setState(() => _state = value),
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
