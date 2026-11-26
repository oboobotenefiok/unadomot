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

  void _go(int index) => setState(() => _index = index);

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
      ),
      CreateListingScreen(
        api: widget.api,
        cache: widget.cache,
      ),
      MessagesScreen(api: widget.api),
      ProfileScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
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
        height: 64,
        padding: EdgeInsets.zero,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavIcon(
              icon: Icons.home,
              label: 'Home',
              selected: _index == 0,
              onTap: () => _go(0),
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
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _index == 2 ? UnaColors.green900 : UnaColors.green700,
                  shape: BoxShape.circle,
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
              icon: Icons.person_outline,
              label: 'Profile',
              selected: _index == 4,
              onTap: () => _go(4),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavIcon({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: label,
        onPressed: onTap,
        icon: Icon(
          icon,
          color: selected
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      );
}
