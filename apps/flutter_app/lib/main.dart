import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'app_settings.dart';
import 'data/local_cache.dart';
import 'screens/listing_detail_screen.dart';
import 'screens/main_shell.dart';
import 'screens/onboarding_screen.dart';
import 'screens/public_profile_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/static_page_screen.dart';
import 'state/app_state.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BootstrapApp());
}

class BootstrapApp extends StatefulWidget {
  const BootstrapApp({super.key});

  @override
  State<BootstrapApp> createState() => _BootstrapAppState();
}

class _BootstrapAppState extends State<BootstrapApp> {
  ApiClient? _api;
  LocalCache? _cache;
  AppState? _state;
  String? _initialUsername;
  String? _initialListingId;
  bool _showOnboarding = false;
  bool _ready = false;
  String? _bootError;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    const configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
    const fallbackBaseUrl = 'http://10.0.2.2:3000';
    final baseUrl = configuredBaseUrl.isNotEmpty
        ? configuredBaseUrl
        : (kReleaseMode ? '' : fallbackBaseUrl);

    if (baseUrl.isEmpty) {
      if (!mounted) return;
      setState(() {
        _bootError =
            'This build is missing API_BASE_URL. Rebuild with '
            '--dart-define=API_BASE_URL=https://unadomot.fly.dev';
      });
      return;
    }

    String? initialUsername;
    String? initialListingId;
    try {
      final uri = await AppLinks().getInitialLink();
      if (uri != null) {
        final segments = uri.pathSegments;
        if (segments.length >= 2 &&
            (segments.first == 'listings' || segments.first == 'listing')) {
          final candidate = segments[1];
          if (RegExp(r'^[0-9a-fA-F-]{36}$').hasMatch(candidate)) {
            initialListingId = candidate;
          }
        } else if (segments.isNotEmpty) {
          final segment = segments.first;
          if (RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(segment)) {
            initialUsername = segment;
          }
        }
      }
    } catch (_) {
      // Normal launch when no link is present.
    }

    final api = ApiClient(baseUrl: baseUrl);
    final cache = LocalCache();
    final state = AppState(api: api, cache: cache);
    await state.restore();

    final onboardingSeen = await cache.getSetting('onboarding_seen') == 'true';
    final savedTheme = await cache.getSetting('theme_mode');
    if (savedTheme == 'dark') appThemeMode.value = ThemeMode.dark;
    final savedContrast = await cache.getSetting('high_contrast');
    appHighContrast.value = savedContrast == 'true';
    final savedLargeText = await cache.getSetting('large_text');
    appLargeText.value = savedLargeText == 'true';

    if (!mounted) return;
    setState(() {
      _api = api;
      _cache = cache;
      _state = state;
      _initialUsername = initialUsername;
      _initialListingId = initialListingId;
      _showOnboarding = !onboardingSeen;
      _ready = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_bootError != null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: unaTheme(),
        darkTheme: unaDarkTheme(),
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.settings_ethernet, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'Configuration error',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _bootError!,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    if (!_ready) {
      return ValueListenableBuilder<bool>(
        valueListenable: appHighContrast,
        builder: (context, contrast, _) => MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: contrast ? unaHighContrastTheme() : unaTheme(),
          darkTheme: unaDarkTheme(),
          themeMode: appThemeMode.value,
          home: const SplashScreen(),
        ),
      );
    }

    return UnaDomotApp(
      state: _state!,
      api: _api!,
      cache: _cache!,
      initialUsername: _initialUsername,
      initialListingId: _initialListingId,
      showOnboarding: _showOnboarding,
    );
  }
}

class UnaDomotApp extends StatelessWidget {
  final AppState state;
  final ApiClient api;
  final LocalCache cache;
  final String? initialUsername;
  final String? initialListingId;
  final bool showOnboarding;

  const UnaDomotApp({
    super.key,
    required this.state,
    required this.api,
    required this.cache,
    this.initialUsername,
    this.initialListingId,
    this.showOnboarding = false,
  });

  Route<dynamic>? _route(RouteSettings settings) {
    final name = settings.name ?? '/';
    if (name == '/terms') {
      return MaterialPageRoute(settings: settings, builder: (_) => StaticPageScreen.terms());
    }
    if (name == '/privacy') {
      return MaterialPageRoute(settings: settings, builder: (_) => StaticPageScreen.privacy());
    }
    if (name == '/checkout-notice') {
      return MaterialPageRoute(settings: settings, builder: (_) => StaticPageScreen.checkoutNotice());
    }
    final listingMatch = RegExp(r'^/(?:listings|listing)/([0-9a-fA-F-]{36})$').firstMatch(name);
    if (listingMatch != null) {
      return MaterialPageRoute(
        settings: settings,
        builder: (_) => ListingDetailScreen(
          api: api,
          cache: cache,
          appState: state,
          listingId: listingMatch.group(1)!,
        ),
      );
    }
    final match = RegExp(r'^/([a-z0-9_]{3,20})$').firstMatch(name);
    if (match == null) return null;
    return MaterialPageRoute(
      settings: settings,
      builder: (_) => PublicProfileScreen(
        api: api,
        cache: cache,
        appState: state,
        username: match.group(1)!,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<ThemeMode>(
        valueListenable: appThemeMode,
        builder: (context, mode, _) => ValueListenableBuilder<bool>(
          valueListenable: appHighContrast,
          builder: (context, contrast, _) => ValueListenableBuilder<bool>(
            valueListenable: appLargeText,
            builder: (context, largeText, _) => MaterialApp(
              title: 'UnaDomot',
              navigatorKey: state.navigatorKey,
              theme: contrast ? unaHighContrastTheme() : unaTheme(),
              darkTheme: unaDarkTheme(),
              themeMode: mode,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: TextScaler.linear(largeText ? 1.25 : 1.0),
                ),
                child: child ?? const SizedBox.shrink(),
              ),
              onGenerateRoute: _route,
              onUnknownRoute: (settings) => MaterialPageRoute(
                settings: settings,
                builder: (_) => const NotFoundScreen(),
              ),
              home: showOnboarding
                  ? OnboardingScreen(
                      cache: cache,
                      api: api,
                      appState: state,
                    )
                  : initialListingId != null
                      ? ListingDetailScreen(
                          api: api,
                          cache: cache,
                          appState: state,
                          listingId: initialListingId!,
                        )
                      : initialUsername == null
                          ? MainShell(api: api, cache: cache, appState: state)
                          : PublicProfileScreen(
                              api: api,
                              cache: cache,
                              appState: state,
                              username: initialUsername!,
                            ),
            ),
          ),
        ),
      );
}
