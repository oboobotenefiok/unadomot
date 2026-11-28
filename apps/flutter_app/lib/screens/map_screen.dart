import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../api/api_client.dart';
import '../data/lga_coordinates.dart';
import '../data/local_cache.dart';
import '../data/nigeria_locations.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../utils/currency.dart';
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

class _LgaGroup {
  final String state;
  final String lga;
  final LatLng point;
  final List<Listing> listings;

  const _LgaGroup({
    required this.state,
    required this.lga,
    required this.point,
    required this.listings,
  });

  String get key => '$state|$lga';
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  String? _selectedKey;
  List<Listing> _selectedListings = const [];
  String? _selectedLabel;
  LatLng? _myLocation;
  LatLng? _pinnedLocation;
  bool _locating = false;
  String? _locationError;
  late int _lastSessionEpoch;

  @override
  void initState() {
    super.initState();
    _lastSessionEpoch = widget.appState.sessionEpoch;
    widget.appState.addListener(_handleSessionChange);
  }

  @override
  void dispose() {
    widget.appState.removeListener(_handleSessionChange);
    super.dispose();
  }

  void _handleSessionChange() {
    final epoch = widget.appState.sessionEpoch;
    if (epoch == _lastSessionEpoch) return;
    _lastSessionEpoch = epoch;
    if (!mounted) return;
    setState(() {
      _myLocation = null;
      _pinnedLocation = null;
      _selectedKey = null;
      _selectedListings = const [];
      _selectedLabel = null;
      _locationError = null;
      _locating = false;
    });
    _mapController.move(const LatLng(9.0820, 8.6753), 6);
  }

  void _selectGroup(_LgaGroup group) {
    setState(() {
      _selectedKey = group.key;
      _selectedListings = group.listings;
      _selectedLabel = '${group.lga}, ${group.state}';
    });
  }

  void _closePopup() {
    setState(() {
      _selectedKey = null;
      _selectedListings = const [];
      _selectedLabel = null;
    });
  }

  Future<void> _locateMe() async {
    if (_locating) return;
    final sessionEpoch = widget.appState.sessionEpoch;
    setState(() {
      _locating = true;
      _locationError = null;
    });

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const _LocationFailure('Turn on location services to find your position.');
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        throw const _LocationFailure('Location permission was denied.');
      }
      if (permission == LocationPermission.deniedForever) {
        throw const _LocationFailure(
          'Location permission is blocked. Enable it in system settings.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 12));
      if (!mounted || sessionEpoch != widget.appState.sessionEpoch) return;
      final point = LatLng(position.latitude, position.longitude);
      setState(() {
        _myLocation = point;
        _pinnedLocation = point;
        _selectedKey = null;
        _selectedListings = const [];
        _selectedLabel = null;
      });
      _mapController.move(point, 14);
    } on TimeoutException {
      if (mounted && sessionEpoch == widget.appState.sessionEpoch) {
        setState(() => _locationError = 'Location timed out. Try again.');
      }
    } on _LocationFailure catch (error) {
      if (mounted && sessionEpoch == widget.appState.sessionEpoch) {
        setState(() => _locationError = error.message);
      }
    } catch (_) {
      if (mounted && sessionEpoch == widget.appState.sessionEpoch) {
        setState(() => _locationError = 'Could not get your location.');
      }
    } finally {
      if (mounted && sessionEpoch == widget.appState.sessionEpoch) {
        setState(() => _locating = false);
      }
    }
  }

  void _pinAt(LatLng point) {
    setState(() {
      _pinnedLocation = point;
      _selectedKey = null;
      _selectedListings = const [];
      _selectedLabel = null;
    });
  }

  void _clearPin() {
    setState(() => _pinnedLocation = null);
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

  /// One marker per LGA that has listings. LGAs without a coordinate entry
  /// fall back to their state centre so nothing drops off the map.
  List<_LgaGroup> _groupByLga() {
    final buckets = <String, List<Listing>>{};
    final states = <String, String>{};
    final lgas = <String, String>{};

    for (final listing in widget.listings) {
      final state = listing.state;
      final lga = listing.lga.isEmpty ? NigeriaLocations.capitalFor(state) : listing.lga;
      final key = '$state|$lga';
      buckets.putIfAbsent(key, () => []).add(listing);
      states[key] = state;
      lgas[key] = lga;
    }

    final groups = <_LgaGroup>[];
    for (final entry in buckets.entries) {
      final state = states[entry.key]!;
      final lga = lgas[entry.key]!;
      final point = LgaCoordinates.forLga(state, lga) ??
          NigeriaLocations.centers[state];
      if (point == null) continue;
      groups.add(_LgaGroup(
        state: state,
        lga: lga,
        point: point,
        listings: entry.value,
      ));
    }
    groups.sort((a, b) => b.listings.length.compareTo(a.listings.length));
    return groups;
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final groups = _groupByLga();

    final markers = groups.map((group) {
      final count = group.listings.length;
      final selected = _selectedKey == group.key;
      return Marker(
        point: group.point,
        width: 52,
        height: 52,
        child: GestureDetector(
          onTap: () => _selectGroup(group),
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

    if (_myLocation != null) {
      markers.add(
        Marker(
          point: _myLocation!,
          width: 44,
          height: 44,
          child: const _PulsingDot(),
        ),
      );
    }

    if (_pinnedLocation != null) {
      markers.add(
        Marker(
          point: _pinnedLocation!,
          width: 44,
          height: 44,
          child: const Icon(
            Icons.location_on,
            color: Color(0xFFDC2626),
            size: 44,
            shadows: [Shadow(color: Colors.black38, blurRadius: 6)],
          ),
        ),
      );
    }

    final map = FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: const LatLng(9.0820, 8.6753),
        initialZoom: 6,
        onLongPress: (_, point) => _pinAt(point),
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
      appBar: AppBar(
        title: Text(
          groups.isEmpty
              ? 'Map view'
              : 'Map view · ${groups.length} area${groups.length == 1 ? '' : 's'}',
        ),
      ),
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
          Positioned(
            top: 12,
            right: 12,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                FloatingActionButton.small(
                  heroTag: 'locate-me',
                  tooltip: 'Find my location',
                  onPressed: _locating ? null : _locateMe,
                  child: _locating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location),
                ),
                if (_pinnedLocation != null) ...[
                  const SizedBox(height: 8),
                  FloatingActionButton.small(
                    heroTag: 'clear-pin',
                    tooltip: 'Clear pin',
                    onPressed: _clearPin,
                    child: const Icon(Icons.location_off_outlined),
                  ),
                ],
              ],
            ),
          ),
          if (_locationError != null)
            Positioned(
              left: 12,
              right: 12,
              top: 12,
              child: Material(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _locationError!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onErrorContainer,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: () => setState(() => _locationError = null),
                        icon: const Icon(Icons.close, size: 18),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_selectedKey != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: 16,
              child: _MapPopup(
                label: _selectedLabel ?? '',
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

class _PulsingDot extends StatefulWidget {
  const _PulsingDot();

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final progress = _controller.value;
          final size = 26 + (18 * progress);
          return Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF2563EB)
                      .withValues(alpha: 0.28 * (1 - progress)),
                ),
              ),
              child!,
            ],
          );
        },
        child: Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
          ),
        ),
      );
}

class _LocationFailure implements Exception {
  final String message;

  const _LocationFailure(this.message);
}

class _MapPopup extends StatelessWidget {
  final String label;
  final List<Listing> listings;
  final VoidCallback onClose;
  final ValueChanged<Listing> onOpen;
  final ValueChanged<Listing> onChat;

  const _MapPopup({
    required this.label,
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
                      '$label • ${listings.length} listing${listings.length == 1 ? '' : 's'}',
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
                                    '${formatNaira(listing.price)}${listing.lga.isEmpty ? '' : ' • ${listing.lga}'}',
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
