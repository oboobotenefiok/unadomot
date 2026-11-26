import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'auth_sheet.dart';
import 'messages_screen.dart';

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
    final link = 'https://unadomot.fly.dev/listings/${widget.listingId}';
    await Clipboard.setData(ClipboardData(text: link));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Listing link copied')),
      );
    }
  }

  Future<void> _report() async {
    if (!await requireAuth(context, widget.appState)) return;
    if (!mounted) return;

    final reason = TextEditingController();
    final details = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report listing'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: reason,
              decoration: const InputDecoration(labelText: 'Reason'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: details,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Details (optional)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (submitted != true) return;
    if (reason.text.trim().isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a reason for the report')),
        );
      }
      return;
    }

    try {
      await widget.api.createReport(
        widget.listingId,
        reason: reason.text.trim(),
        details: details.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report submitted')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
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
                                'Offline view • updated ${_cachedAt!.toLocal()}',
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
                                        '₦${_listing!.price.toStringAsFixed(0)}',
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
                                        color: UnaColors.green100,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        _listing!.isAgentListing ? 'Agent' : 'Owner',
                                        style: const TextStyle(
                                          color: UnaColors.green900,
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
