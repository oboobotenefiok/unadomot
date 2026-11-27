import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'listing_detail_screen.dart';
import 'messages_screen.dart';

class MapScreen extends StatefulWidget {
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

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
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

  String? _selectedState;
  List<Listing> _selectedListings = const [];

  void _selectState(String state, List<Listing> listings) {
    setState(() {
      _selectedState = state;
      _selectedListings = listings;
    });
  }

  void _closePopup() {
    setState(() {
      _selectedState = null;
      _selectedListings = const [];
    });
  }

  Future<void> _openChat(Listing listing) async {
    try {
      final conversation = await widget.api.startConversation(listingId: listing.id);
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

  void _openListing(Listing listing) {
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
    final dark = Theme.of(context).brightness == Brightness.dark;
    final byState = <String, List<Listing>>{};
    for (final listing in widget.listings) {
      if (!_stateCenters.containsKey(listing.state)) continue;
      byState.putIfAbsent(listing.state, () => []).add(listing);
    }

    final markers = byState.entries.map((entry) {
      final count = entry.value.length;
      final selected = _selectedState == entry.key;
      return Marker(
        point: _stateCenters[entry.key]!,
        width: 52,
        height: 52,
        child: GestureDetector(
          onTap: () => _selectState(entry.key, entry.value),
          child: Container(
            decoration: BoxDecoration(
              color: selected
                  ? const Color(0xFFF59E0B)
                  : dark
                      ? const Color(0xFF22C55E)
                      : const Color(0xFF166534),
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

    final map = FlutterMap(
      options: const MapOptions(
        initialCenter: LatLng(9.0820, 8.6753),
        initialZoom: 6,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.unadomot',
        ),
        MarkerLayer(markers: markers),
      ],
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Map view')),
      body: Stack(
        children: [
          Positioned.fill(
            child: dark
                ? ColorFiltered(
                    colorFilter: ColorFilter.mode(
                      const Color(0xFF0B1510).withValues(alpha: 0.55),
                      BlendMode.multiply,
                    ),
                    child: map,
                  )
                : map,
          ),
          if (_selectedState != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: 16,
              child: _MapPopup(
                state: _selectedState!,
                listings: _selectedListings,
                onClose: _closePopup,
                onOpen: _openListing,
                onChat: _openChat,
              ),
            ),
        ],
      ),
    );
  }
}

class _MapPopup extends StatelessWidget {
  final String state;
  final List<Listing> listings;
  final VoidCallback onClose;
  final ValueChanged<Listing> onOpen;
  final ValueChanged<Listing> onChat;

  const _MapPopup({
    required this.state,
    required this.listings,
    required this.onClose,
    required this.onOpen,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) => Material(
        elevation: 10,
        borderRadius: BorderRadius.circular(14),
        color: UnaColors.surface,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '$state • ${listings.length} listing${listings.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                        color: UnaColors.text900,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: onClose,
                    icon: const Icon(Icons.close, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              SizedBox(
                height: 190,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: listings.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final listing = listings[index];
                    final image = listing.media.isEmpty ? null : listing.media.first.url;
                    return SizedBox(
                      width: 210,
                      child: Container(
                        decoration: BoxDecoration(
                          color: UnaColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: UnaColors.border),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: 90,
                              width: double.infinity,
                              child: image == null
                                  ? Container(
                                      color: UnaColors.green100,
                                      child: const Icon(Icons.home_work_outlined, color: UnaColors.green700),
                                    )
                                  : Image.network(image, fit: BoxFit.cover),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    listing.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                                  ),
                                  Text(
                                    'N${listing.price.toStringAsFixed(0)} • ${listing.lga}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: UnaColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: () => onOpen(listing),
                                          style: OutlinedButton.styleFrom(
                                            visualDensity: VisualDensity.compact,
                                            padding: EdgeInsets.zero,
                                          ),
                                          child: const Text('View', style: TextStyle(fontSize: 11)),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      IconButton.filledTonal(
                                        visualDensity: VisualDensity.compact,
                                        onPressed: () => onChat(listing),
                                        icon: const Icon(Icons.chat_bubble_outline, size: 15),
                                      ),
                                    ],
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
          ),
        ),
      );
}
