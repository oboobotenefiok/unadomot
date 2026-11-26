import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../utils/share_helper.dart';
import 'auth_sheet.dart';
import 'map_screen.dart';
import 'messages_screen.dart';
import 'report_listing_screen.dart';

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
  List<Listing> _similar = [];
  bool _loading = true;
  String? _error;
  DateTime? _cachedAt;
  bool _favorite = false;
  bool _startingChat = false;
  int _photoIndex = 0;

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
      _loadSimilar(Listing.fromJson(data));
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

  Future<void> _loadSimilar(Listing listing) async {
    try {
      final page = await widget.api.browse(
        filters: {'state': listing.state, 'lga': listing.lga},
        limit: 8,
      );
      if (!mounted) return;
      setState(() {
        _similar = page.items
            .map(Listing.fromJson)
            .where((item) => item.id != listing.id)
            .take(6)
            .toList();
      });
    } catch (_) {
      // Similar listings are optional.
    }
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
    } finally {
      if (mounted) setState(() => _startingChat = false);
    }
  }

  Future<void> _share() async {
    final listing = _listing;
    if (listing == null) return;
    final link = 'https://unadomot.fly.dev/listings/${widget.listingId}';
    final text = '${naijaShareText(listing)}\n$link';
    await Share.share(text, subject: listing.title);
  }

  Future<void> _report() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;

    final submitted = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => ReportListingScreen(
          api: widget.api,
          listingId: widget.listingId,
        ),
      ),
    );

    if (submitted == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Report submitted')),
      );
    }
  }

  void _openMap() {
    final listing = _listing;
    if (listing == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MapScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          listings: [listing],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(_listing?.title ?? 'Listing'),
          actions: [
            IconButton(
              tooltip: 'Share',
              onPressed: _share,
              icon: const Icon(Icons.share_outlined),
            ),
            IconButton(
              tooltip: 'Favorite',
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
                        padding: EdgeInsets.zero,
                        children: [
                          if (_cachedAt != null)
                            Container(
                              width: double.infinity,
                              color: UnaColors.green100,
                              padding: const EdgeInsets.all(8),
                              child: Text(
                                'Offline view - updated ${_cachedAt!.toLocal()}',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: UnaColors.green900,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          _gallery(),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'N${_listing!.price.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          color: UnaColors.primary,
                                          fontSize: 24,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _listing!.status == 'available'
                                            ? UnaColors.green100
                                            : Colors.orange.shade100,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        _listing!.status == 'available'
                                            ? (_listing!.isAgentListing ? 'Agent' : 'Owner')
                                            : _listing!.status.toUpperCase(),
                                        style: TextStyle(
                                          color: _listing!.status == 'available'
                                              ? UnaColors.green900
                                              : Colors.orange.shade900,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _listing!.title,
                                  style: const TextStyle(
                                    color: UnaColors.text900,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_listing!.address}, ${_listing!.lga}, ${_listing!.state}',
                                  style: const TextStyle(
                                    color: UnaColors.text600,
                                    fontSize: 13,
                                  ),
                                ),
                                if (_listing!.viewCount > 0) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    '${_listing!.viewCount} views',
                                    style: const TextStyle(color: UnaColors.text500, fontSize: 12),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    if (_listing!.bedrooms != null)
                                      _chip('${_listing!.bedrooms} bed'),
                                    if (_listing!.bathrooms != null)
                                      _chip('${_listing!.bathrooms} bath'),
                                    if (_listing!.propertyType != null)
                                      _chip(_listing!.propertyType!),
                                    if (_listing!.furnishing != null)
                                      _chip(_listing!.furnishing!),
                                  ],
                                ),
                                if (_listing!.amenities.isNotEmpty) ...[
                                  const SizedBox(height: 20),
                                  const Text(
                                    'Amenities',
                                    style: TextStyle(
                                      color: UnaColors.text900,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _listing!.amenities
                                        .map((item) => _chip(item))
                                        .toList(),
                                  ),
                                ],
                                const SizedBox(height: 20),
                                const Text(
                                  'Description',
                                  style: TextStyle(
                                    color: UnaColors.text900,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _listing!.description,
                                  style: const TextStyle(
                                    color: UnaColors.text700,
                                    fontSize: 14,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 20),
                                _mapCard(),
                                if (_similar.isNotEmpty) ...[
                                  const SizedBox(height: 20),
                                  _similarSection(),
                                ],
                                const SizedBox(height: 20),
                                _landlordCard(),
                                const SizedBox(height: 20),
                                FilledButton.icon(
                                  onPressed: _startingChat ? null : _openChat,
                                  icon: const Icon(Icons.chat_bubble_outline),
                                  label: Text(
                                    _startingChat ? 'Opening chat...' : 'Chat with lister',
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextButton.icon(
                                  onPressed: _report,
                                  icon: const Icon(Icons.flag_outlined),
                                  label: const Text('Report this listing'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
      );

  Widget _similarSection() => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Similar listings',
            style: TextStyle(
              color: UnaColors.text900,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 190,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _similar.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final item = _similar[index];
                return InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ListingDetailScreen(
                        api: widget.api,
                        cache: widget.cache,
                        appState: widget.appState,
                        listingId: item.id,
                      ),
                    ),
                  ),
                  child: Container(
                    width: 150,
                    decoration: BoxDecoration(
                      color: UnaColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: UnaColors.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: item.media.isEmpty
                              ? Container(
                                  color: UnaColors.green100,
                                  child: const Icon(Icons.home_work_outlined, color: UnaColors.green700),
                                )
                              : Image.network(item.media.first.url, fit: BoxFit.cover, width: double.infinity),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'N${item.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  color: UnaColors.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                item.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12),
                              ),
                              Text(
                                item.lga,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: UnaColors.text500),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      );

  Widget _mapCard() => InkWell(
        onTap: _openMap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: UnaColors.green100,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: UnaColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.map_outlined, color: UnaColors.green900),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_listing!.lga}, ${_listing!.state}',
                      style: const TextStyle(fontWeight: FontWeight.w600, color: UnaColors.green900),
                    ),
                    const Text(
                      'View this area on the map',
                      style: TextStyle(fontSize: 12, color: UnaColors.text600),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: UnaColors.green900),
            ],
          ),
        ),
      );

  Widget _gallery() {
    final media = _listing!.media;
    if (media.isEmpty) {
      return Container(
        height: 220,
        color: UnaColors.green100,
        child: const Icon(
          Icons.home_work_outlined,
          size: 64,
          color: UnaColors.green700,
        ),
      );
    }

    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: media.length,
            onPageChanged: (index) => setState(() => _photoIndex = index),
            itemBuilder: (context, index) => Image.network(
              media[index].url,
              fit: BoxFit.cover,
              width: double.infinity,
            ),
          ),
          if (media.length > 1)
            Positioned(
              bottom: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_photoIndex + 1}/${media.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _chip(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: UnaColors.green100,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: UnaColors.green900,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      );

  Widget _landlordCard() {
    final name = _listing!.landlordName.trim().isEmpty
        ? 'Landlord'
        : _listing!.landlordName;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: UnaColors.surface,
        border: Border.all(color: UnaColors.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: UnaColors.green100,
            backgroundImage: _listing!.landlordPhotoUrl == null
                ? null
                : NetworkImage(_listing!.landlordPhotoUrl!),
            child: _listing!.landlordPhotoUrl == null
                ? Text(
                    name.characters.first.toUpperCase(),
                    style: const TextStyle(
                      color: UnaColors.green900,
                      fontWeight: FontWeight.w700,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: UnaColors.text900,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (_listing!.landlordVerified) ...[
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.verified,
                        size: 16,
                        color: UnaColors.green700,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _listing!.landlordVerified ? 'Verified lister' : 'Lister',
                  style: const TextStyle(
                    color: UnaColors.text500,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
