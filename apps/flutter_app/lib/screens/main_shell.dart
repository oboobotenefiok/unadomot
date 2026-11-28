import 'dart:async';
import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'auth_sheet.dart';
import 'create_listing_screen.dart';
import 'favorites_screen.dart';
import 'listings_screen.dart';
import 'map_screen.dart';
import 'messages_screen.dart';
import 'notifications_screen.dart';
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
  final ValueNotifier<String> _search = ValueNotifier('');
  String? _photoUrl;
  String? _displayName;
  int _unreadCount = 0;
  bool _wasSignedIn = false;
  bool _mapMode = false;
  bool _mapLoading = false;
  List<Listing> _mapListings = [];

  /// Bumped every time the profile tab is opened. The profile screen lives in
  /// an IndexedStack, so without this it keeps whatever listings it loaded the
  /// first time and never shows a newly posted property.
  int _profileEpoch = 0;

  EventStream? _events;
  StreamSubscription<Map<String, dynamic>>? _eventsSub;

  @override
  void initState() {
    super.initState();
    widget.appState.addListener(_onAuthChanged);
    _wasSignedIn = widget.appState.signedIn;
    if (_wasSignedIn) {
      _loadProfile();
      _loadUnread();
    }
    _restoreHomeView();
    _listenForChanges();
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onAuthChanged);
    _eventsSub?.cancel();
    _events?.dispose();
    _search.dispose();
    super.dispose();
  }

  /// Keeps the unread badge honest when a message arrives on another device.
  void _listenForChanges() {
    _events = EventStream(widget.api)..start();
    _eventsSub = _events!.events.listen((event) {
      if (event['type'] == 'message' && widget.appState.signedIn) {
        _loadUnread();
      }
    });
  }

  Future<void> _restoreHomeView() async {
    final saved = await widget.cache.getSetting('home_view');
    if (!mounted || saved != 'map') return;
    setState(() => _mapMode = true);
    _loadMapListings();
  }

  void _onAuthChanged() {
    final signedIn = widget.appState.signedIn;
    if (signedIn == _wasSignedIn) return;
    _wasSignedIn = signedIn;
    if (signedIn) {
      // The stream is a no-op while signed out, so it needs a nudge now that
      // there is a token to poll with.
      _events?.start();
      _loadProfile();
      _loadUnread();
    } else if (mounted) {
      setState(() {
        _photoUrl = null;
        _displayName = null;
        _unreadCount = 0;
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

  Future<void> _loadUnread() async {
    if (!widget.appState.signedIn) return;
    try {
      final conversations = await widget.api.conversations();
      var total = 0;
      for (final item in conversations) {
        final value = item['unread_count'] ?? item['unread'] ?? 0;
        if (value is num) total += value.toInt();
      }
      if (mounted) setState(() => _unreadCount = total);
    } catch (_) {
      // Keep the last known badge count.
    }
  }

  Future<void> _loadMapListings() async {
    if (_mapLoading) return;
    setState(() => _mapLoading = true);
    try {
      final page = await widget.api.browse(limit: 100);
      if (!mounted) return;
      setState(() => _mapListings = page.items.map(Listing.fromJson).toList());
    } catch (_) {
      // The map still renders with whatever was loaded before.
    } finally {
      if (mounted) setState(() => _mapLoading = false);
    }
  }

  Future<void> _toggleMap() async {
    final next = !_mapMode;
    setState(() => _mapMode = next);
    await widget.cache.setSetting('home_view', next ? 'map' : 'list');
    if (next && _mapListings.isEmpty) _loadMapListings();
  }

  void _go(int index) {
    if (index == _index) return;
    _history.add(_index);
    setState(() {
      _index = index;
      // Rebuild the profile tab so it re-fetches the user's listings.
      if (index == 4) _profileEpoch++;
    });
    if (index == 4 && widget.appState.signedIn) _loadProfile();
    if (index == 3 && widget.appState.signedIn) _loadUnread();
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
    setState(() {
      _index = previous;
      if (previous == 4) _profileEpoch++;
    });
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

  Future<void> _openNotifications() async {
    if (!widget.appState.signedIn) {
      final signedIn = await requireAuth(context, widget.appState);
      if (!signedIn || !mounted) return;
    }
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => NotificationsScreen(api: widget.api),
      ),
    );
    if (mounted) _loadUnread();
  }

  Widget _homeView() {
    if (!_mapMode) {
      return ListingsScreen(
        api: widget.api,
        cache: widget.cache,
        appState: widget.appState,
        searchNotifier: _search,
        onNotifications: _openNotifications,
        unreadCount: _unreadCount,
      );
    }

    return Stack(
      children: [
        if (_mapListings.isEmpty && _mapLoading)
          const Center(child: CircularProgressIndicator())
        else
          MapScreen(
            api: widget.api,
            cache: widget.cache,
            appState: widget.appState,
            listings: _mapListings,
          ),
        Positioned(
          top: 12,
          right: 12,
          child: SafeArea(
            child: FloatingActionButton.small(
              heroTag: 'home-view-toggle',
              tooltip: 'List view',
              onPressed: _toggleMap,
              child: const Icon(Icons.view_list),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild every tab when the session changes so signed-out placeholders,
    // favorites and ownership badges update without restarting the app.
    final authKey = '${widget.appState.signedIn}-${widget.appState.sessionEpoch}';
    final pages = [
      KeyedSubtree(
        key: ValueKey('home-$authKey'),
        child: _homeView(),
      ),
      KeyedSubtree(
        key: ValueKey('favorites-$authKey'),
        child: FavoritesScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          showAppBar: false,
        ),
      ),
      KeyedSubtree(
        key: ValueKey('post-$authKey'),
        child: CreateListingScreen(
          api: widget.api,
          cache: widget.cache,
          showAppBar: false,
          onExit: _goHome,
        ),
      ),
      KeyedSubtree(
        key: ValueKey('messages-$authKey'),
        child: MessagesScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          showAppBar: false,
        ),
      ),
      KeyedSubtree(
        key: ValueKey('profile-$authKey-$_profileEpoch'),
        child: ProfileScreen(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
          showAppBar: false,
        ),
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
                  Expanded(
                    child: Column(
                      children: [
                        _DesktopTopBar(
                          search: _search,
                          onMessages: () => _go(3),
                          onNotifications: _openNotifications,
                          onMap: _toggleMap,
                          mapMode: _mapMode,
                          unreadCount: _unreadCount,
                        ),
                        Expanded(child: content),
                      ],
                    ),
                  ),
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

class _DesktopTopBar extends StatefulWidget {
  final ValueNotifier<String> search;
  final VoidCallback onMessages;
  final VoidCallback onNotifications;
  final VoidCallback onMap;
  final bool mapMode;
  final int unreadCount;

  const _DesktopTopBar({
    required this.search,
    required this.onMessages,
    required this.onNotifications,
    required this.onMap,
    required this.mapMode,
    required this.unreadCount,
  });

  @override
  State<_DesktopTopBar> createState() => _DesktopTopBarState();
}

class _DesktopTopBarState extends State<_DesktopTopBar> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.search.value);

  @override
  void initState() {
    super.initState();
    widget.search.addListener(_sync);
  }

  @override
  void dispose() {
    widget.search.removeListener(_sync);
    _controller.dispose();
    super.dispose();
  }

  void _sync() {
    if (_controller.text == widget.search.value) return;
    _controller.value = TextEditingValue(
      text: widget.search.value,
      selection: TextSelection.collapsed(offset: widget.search.value.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF122019) : Colors.white,
        border: Border(bottom: BorderSide(color: dark ? Colors.white12 : Colors.black12)),
      ),
      child: Row(
        children: [
          Expanded(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: TextField(
                controller: _controller,
                onChanged: (value) => widget.search.value = value,
                decoration: InputDecoration(
                  hintText: 'Search properties, locations...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: widget.search.value.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Clear search',
                          onPressed: () {
                            _controller.clear();
                            widget.search.value = '';
                          },
                          icon: const Icon(Icons.close, size: 18),
                        ),
                  isDense: true,
                  filled: true,
                  fillColor: dark ? const Color(0xFF0B1510) : const Color(0xFFF3F4F6),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: widget.mapMode ? 'List view' : 'Map view',
            onPressed: widget.onMap,
            icon: Icon(widget.mapMode ? Icons.view_list : Icons.map_outlined),
          ),
          const Spacer(),
          IconButton(
            tooltip: 'Notifications',
            onPressed: widget.onNotifications,
            icon: Badge(
              isLabelVisible: widget.unreadCount > 0,
              label: Text(widget.unreadCount > 99 ? '99+' : '${widget.unreadCount}'),
              child: const Icon(Icons.notifications_none),
            ),
          ),
          IconButton(
            tooltip: 'Messages',
            onPressed: widget.onMessages,
            icon: const Icon(Icons.chat_bubble_outline),
          ),
        ],
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
