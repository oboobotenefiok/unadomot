import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'auth_sheet.dart';
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
  final List<int> _history = [];
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
    if (index == _index) return;
    _history.add(_index);
    setState(() => _index = index);
    if (index == 4 && widget.appState.signedIn) _loadProfile();
  }

  void _goHome() {
    _history.clear();
    setState(() => _index = 0);
  }

  void _back() {
    if (_history.isEmpty) {
      _goHome();
      return;
    }
    final previous = _history.removeLast();
    setState(() => _index = previous);
  }

  Future<void> _openProfile() async {
    if (!widget.appState.signedIn) {
      final signedIn = await requireAuth(context, widget.appState);
      if (!signedIn || !mounted) return;
    }
    _go(4);
  }

  Future<void> _openPost() async {
    if (!widget.appState.signedIn) {
      final signedIn = await requireAuth(context, widget.appState, register: true);
      if (!signedIn || !mounted) return;
    }
    _go(2);
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
        onExit: _goHome,
      ),
      MessagesScreen(api: widget.api, showAppBar: false),
      ProfileScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
        showAppBar: false,
      ),
    ];
    final isDesktop = MediaQuery.sizeOf(context).width >= 900;
    final content = SafeArea(
      child: Column(
        children: [
          if (_index != 0)
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: 'Back',
                onPressed: _back,
                icon: const Icon(Icons.arrow_back),
              ),
            ),
          Expanded(
            child: IndexedStack(index: _index, children: pages),
          ),
        ],
      ),
    );

    return PopScope(
      canPop: _history.isEmpty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        body: isDesktop
            ? Row(
                children: [
                  _DesktopSidebar(
                    selected: _index,
                    photoUrl: _photoUrl,
                    displayName: _displayName,
                    onHome: _goHome,
                    onSelect: _go,
                    onPost: _openPost,
                    onProfile: _openProfile,
                  ),
                  Expanded(child: content),
                ],
              )
            : content,
        bottomNavigationBar: isDesktop
            ? null
            : BottomAppBar(
                height: 68,
                padding: EdgeInsets.zero,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _NavIcon(
                      label: 'Home',
                      selected: _index == 0,
                      onTap: _goHome,
                      iconWidget: _BrandIcon(selected: _index == 0),
                    ),
                    _NavIcon(
                      icon: Icons.favorite_border,
                      label: 'Favorites',
                      selected: _index == 1,
                      onTap: () => _go(1),
                    ),
                    GestureDetector(
                      onTap: _openPost,
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
                      onTap: _openProfile,
                      iconWidget: _ProfileIcon(
                        selected: _index == 4,
                        photoUrl: _photoUrl,
                        name: _displayName,
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _DesktopSidebar extends StatelessWidget {
  final int selected;
  final String? photoUrl;
  final String? displayName;
  final VoidCallback onHome;
  final ValueChanged<int> onSelect;
  final VoidCallback onPost;
  final VoidCallback onProfile;

  const _DesktopSidebar({
    required this.selected,
    required this.photoUrl,
    required this.displayName,
    required this.onHome,
    required this.onSelect,
    required this.onPost,
    required this.onProfile,
  });

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 248,
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF122019) : Colors.white,
        border: Border(right: BorderSide(color: dark ? Colors.white12 : Colors.black12)),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.asset(
                      'assets/unadomot.jpg',
                      width: 36,
                      height: 36,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.home_work, color: UnaColors.green700),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'UnaDomot',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
            _SidebarItem(
              icon: Icons.home_outlined,
              label: 'Home',
              selected: selected == 0,
              onTap: onHome,
            ),
            _SidebarItem(
              icon: Icons.favorite_border,
              label: 'Favorites',
              selected: selected == 1,
              onTap: () => onSelect(1),
            ),
            _SidebarItem(
              icon: Icons.add_circle_outline,
              label: 'Post a listing',
              selected: selected == 2,
              onTap: onPost,
            ),
            _SidebarItem(
              icon: Icons.chat_bubble_outline,
              label: 'Messages',
              selected: selected == 3,
              onTap: () => onSelect(3),
            ),
            _SidebarItem(
              icon: Icons.person_outline,
              label: displayName ?? 'Profile',
              selected: selected == 4,
              onTap: onProfile,
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'Find your next home in Nigeria.',
                style: TextStyle(
                  fontSize: 12,
                  color: dark ? Colors.white54 : Colors.black54,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SidebarItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: ListTile(
          dense: true,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          selected: selected,
          selectedTileColor: UnaColors.green100,
          leading: Icon(icon, color: selected ? UnaColors.green900 : null),
          title: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? UnaColors.green900 : null,
            ),
          ),
          onTap: onTap,
        ),
      );
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
