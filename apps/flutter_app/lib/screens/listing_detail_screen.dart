import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../models/listing.dart';

class ListingDetailScreen extends StatefulWidget {
  final ApiClient api;
  final String listingId;

  const ListingDetailScreen({
    super.key,
    required this.api,
    required this.listingId,
  });

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Listing? _listing;
  bool _loading = true;
  String? _error;

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
      if (mounted) setState(() => _listing = Listing.fromJson(data));
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(_listing?.title ?? 'Listing')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : _listing == null
                    ? const Center(child: Text('Listing not found'))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (_listing!.media.isNotEmpty)
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: Image.network(
                                _listing!.media.first.url,
                                fit: BoxFit.cover,
                              ),
                            ),
                          const SizedBox(height: 16),
                          Text(
                            '₦${_listing!.price.toStringAsFixed(0)}',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 8),
                          Text('${_listing!.lga}, ${_listing!.state}'),
                          const SizedBox(height: 16),
                          Text(_listing!.description),
                          const SizedBox(height: 24),
                          FilledButton.icon(
                            onPressed: () {},
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: const Text('Chat with lister'),
                          ),
                        ],
                      ),
      );
}
