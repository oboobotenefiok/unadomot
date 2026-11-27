import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../data/nigeria_locations.dart';
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
      if (!NigeriaLocations.centers.containsKey(listing.state)) continue;
      byState.putIfAbsent(listing.state, () => []).add(listing);
    }

    final markers = byState.entries.map((entry) {
      final count = entry.value.length;
      final selected = _selectedState == entry.key;
      return Marker(
        point: NigeriaLocations.centers[entry.key]!,
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
