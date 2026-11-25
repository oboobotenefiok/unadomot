import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../models/listing.dart';
import 'listing_detail_screen.dart';

class ListingsScreen extends StatefulWidget {
  final ApiClient api;

  const ListingsScreen({super.key, required this.api});

  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  List<Listing> _listings = [];
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
      final rows = await widget.api.browse();
      if (mounted) {
        setState(() => _listings = rows.map(Listing.fromJson).toList());
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Find a rental')),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _listings.isEmpty
                      ? const Center(child: Text('No listings yet'))
                      : ListView.builder(
                          itemCount: _listings.length,
                          itemBuilder: (context, index) {
                            final listing = _listings[index];
                            return ListTile(
                              title: Text(listing.title),
                              subtitle: Text(
                                '₦${listing.price.toStringAsFixed(0)} • ${listing.lga}, ${listing.state}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ListingDetailScreen(
                                    api: widget.api,
                                    listingId: listing.id,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
        ),
      );
}
