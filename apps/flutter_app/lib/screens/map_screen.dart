import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import 'listing_detail_screen.dart';

class MapScreen extends StatelessWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;
  final List<Listing> listings;

  const MapScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
    required this.listings,
  });

  static const _stateCenters = <String, LatLng>{
    'Abia': LatLng(5.4167, 7.5000),
    'Adamawa': LatLng(9.3265, 12.3984),
    'Akwa Ibom': LatLng(5.0378, 7.9128),
    'Anambra': LatLng(6.2209, 6.9370),
    'Bauchi': LatLng(10.3103, 9.8439),
    'Bayelsa': LatLng(4.7719, 6.0699),
    'Benue': LatLng(7.3369, 8.7404),
    'Borno': LatLng(11.8846, 13.1510),
    'Cross River': LatLng(5.8702, 8.5988),
    'Delta': LatLng(5.5325, 5.8987),
    'Ebonyi': LatLng(6.2649, 8.0137),
    'Edo': LatLng(6.6342, 5.9304),
    'Ekiti': LatLng(7.7190, 5.3110),
    'Enugu': LatLng(6.5364, 7.4356),
    'FCT': LatLng(9.0765, 7.3986),
    'Gombe': LatLng(10.3638, 11.1920),
    'Imo': LatLng(5.5720, 7.0588),
    'Jigawa': LatLng(12.2280, 9.5616),
    'Kaduna': LatLng(10.5222, 7.4383),
    'Kano': LatLng(12.0022, 8.5920),
    'Katsina': LatLng(12.9908, 7.6018),
    'Kebbi': LatLng(12.4539, 4.1975),
    'Kogi': LatLng(7.8023, 6.7333),
    'Kwara': LatLng(8.4966, 4.5421),
    'Lagos': LatLng(6.5244, 3.3792),
    'Nasarawa': LatLng(8.4900, 8.5200),
    'Niger': LatLng(9.6139, 5.5983),
    'Ogun': LatLng(6.9980, 3.4739),
    'Ondo': LatLng(7.2500, 5.2000),
    'Osun': LatLng(7.5629, 4.5200),
    'Oyo': LatLng(7.3775, 3.9470),
    'Plateau': LatLng(9.2182, 9.5179),
    'Rivers': LatLng(4.8396, 6.9112),
    'Sokoto': LatLng(13.0059, 5.2476),
    'Taraba': LatLng(8.0000, 10.5000),
    'Yobe': LatLng(11.7480, 11.9660),
    'Zamfara': LatLng(12.1700, 6.6600),
  };

  void _openState(BuildContext context, String state, List<Listing> stateListings) {
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (context) => ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            '$state • ${stateListings.length} listing${stateListings.length == 1 ? '' : 's'}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          ...stateListings.map(
            (listing) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.home_work_outlined),
              title: Text(listing.title),
              subtitle: Text('${listing.lga} • ₦${listing.price.toStringAsFixed(0)}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ListingDetailScreen(
                      api: api,
                      cache: cache,
                      appState: appState,
                      listingId: listing.id,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final byState = <String, List<Listing>>{};
    for (final listing in listings) {
      if (!_stateCenters.containsKey(listing.state)) continue;
      byState.putIfAbsent(listing.state, () => []).add(listing);
    }

    final markers = byState.entries.map((entry) {
      final count = entry.value.length;
      return Marker(
        point: _stateCenters[entry.key]!,
        width: 48,
        height: 48,
        child: GestureDetector(
          onTap: () => _openState(context, entry.key, entry.value),
          child: Container(
            decoration: BoxDecoration(
              color: dark ? const Color(0xFF22C55E) : const Color(0xFF166534),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
            ),
            alignment: Alignment.center,
            child: Text(
              '$count',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ),
      );
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Map view')),
      body: FlutterMap(
        options: const MapOptions(
          initialCenter: LatLng(9.0820, 8.6753),
          initialZoom: 6,
        ),
        children: [
          TileLayer(
            urlTemplate: dark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.unadomot',
          ),
          MarkerLayer(markers: markers),
        ],
      ),
    );
  }
}
