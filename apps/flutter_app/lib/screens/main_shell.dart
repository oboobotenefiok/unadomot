import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'create_listing_screen.dart';
import 'favorites_screen.dart';
import 'listings_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;

  const MainShell({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  String? _photoUrl;
  String? _displayName;
  bool _wasSignedIn = false;

  @override
  void initState() {
    super.initState();
    widget.appState.addListener(_onAuthChanged);
    _wasSignedIn = widget.appState.signedIn;
    if (_wasSignedIn) _loadProfile();
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    final signedIn = widget.appState.signedIn;
    if (signedIn == _wasSignedIn) return;
    _wasSignedIn = signedIn;
    if (signedIn) {
      _loadProfile();
    } else if (mounted) {
      setState(() {
        _photoUrl = null;
        _displayName = null;
      });
    }
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await widget.api.myProfile();
      if (!mounted) return;
      setState(() {
        _photoUrl = profile['photo_url'] as String?;
        _displayName = profile['name'] as String?;
      });
    } catch (_) {
      // Keep the default icon when the profile cannot be loaded.
    }
  }

  void _go(int index) {
    setState(() => _index = index);
    if (index == 4 && widget.appState.signedIn) _loadProfile();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      ListingsScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
      ),
      FavoritesScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
        showAppBar: false,
      ),
      CreateListingScreen(
        api: widget.api,
        cache: widget.cache,
        showAppBar: false,
        onExit: () => _go(0),
      ),
      MessagesScreen(api: widget.api),
      ProfileScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
        showAppBar: false,
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            if (_index != 0)
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  tooltip: 'Back to home',
                  onPressed: () => _go(0),
                  icon: const Icon(Icons.arrow_back),
                ),
              ),
            Expanded(
              child: IndexedStack(index: _index, children: pages),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomAppBar(
        height: 68,
        padding: EdgeInsets.zero,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavIcon(
              label: 'Home',
              selected: _index == 0,
              onTap: () => _go(0),
              iconWidget: _BrandIcon(selected: _index == 0),
            ),
            _NavIcon(
              icon: Icons.favorite_border,
              label: 'Favorites',
              selected: _index == 1,
              onTap: () => _go(1),
            ),
            GestureDetector(
              onTap: () => _go(2),
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: _index == 2 ? UnaColors.green900 : UnaColors.green700,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: UnaColors.green900.withValues(alpha: 0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 28),
              ),
            ),
            _NavIcon(
              icon: Icons.chat_bubble_outline,
              label: 'Messages',
              selected: _index == 3,
              onTap: () => _go(3),
            ),
            _NavIcon(
              label: 'Profile',
              selected: _index == 4,
              onTap: () => _go(4),
              iconWidget: _ProfileIcon(
                selected: _index == 4,
                photoUrl: _photoUrl,
                name: _displayName,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BrandIcon extends StatelessWidget {
  final bool selected;

  const _BrandIcon({required this.selected});

  @override
  Widget build(BuildContext context) => Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.primary
                : Colors.transparent,
            width: 2,
          ),
        ),
        child: ClipOval(
          child: Image.asset(
            'assets/unadomot.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Icon(
              Icons.home,
              size: 22,
              color: selected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
}

class _ProfileIcon extends StatelessWidget {
  final bool selected;
  final String? photoUrl;
  final String? name;

  const _ProfileIcon({
    required this.selected,
    required this.photoUrl,
    required this.name,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.onSurfaceVariant;
    if (photoUrl == null || photoUrl!.isEmpty) {
      return Icon(Icons.person_outline, color: color);
    }
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent,
          width: 2,
        ),
      ),
      child: ClipOval(
        child: Image.network(
          photoUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(Icons.person_outline, color: color),
        ),
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  final IconData? icon;
  final Widget? iconWidget;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavIcon({
    this.icon,
    this.iconWidget,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: label,
        onPressed: onTap,
        icon: iconWidget ??
            Icon(
              icon,
              color: selected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      );
}
