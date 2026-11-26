import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'app_settings.dart';
import 'data/local_cache.dart';
import 'screens/main_shell.dart';
import 'screens/onboarding_screen.dart';
import 'screens/public_profile_screen.dart';
import 'screens/splash_screen.dart';
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
  bool _showOnboarding = false;
  bool _ready = false;

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
      throw StateError(
        'API_BASE_URL must be provided for release builds, for example '
        '--dart-define=API_BASE_URL=https://unadomot.fly.dev',
      );
    }

    String? initialUsername;
    try {
      final uri = await AppLinks().getInitialLink();
      if (uri != null) {
        final segment = uri.pathSegments.isEmpty ? '' : uri.pathSegments.first;
        if (RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(segment)) {
          initialUsername = segment;
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

    if (!mounted) return;
    setState(() {
      _api = api;
      _cache = cache;
      _state = state;
      _initialUsername = initialUsername;
      _showOnboarding = !onboardingSeen;
      _ready = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: unaTheme(),
        darkTheme: unaDarkTheme(),
        themeMode: appThemeMode.value,
        home: const SplashScreen(),
      );
    }

    return UnaDomotApp(
      state: _state!,
      api: _api!,
      cache: _cache!,
      initialUsername: _initialUsername,
      showOnboarding: _showOnboarding,
    );
  }
}

class UnaDomotApp extends StatelessWidget {
  final AppState state;
  final ApiClient api;
  final LocalCache cache;
  final String? initialUsername;
  final bool showOnboarding;

  const UnaDomotApp({
    super.key,
    required this.state,
    required this.api,
    required this.cache,
    this.initialUsername,
    this.showOnboarding = false,
  });

  Route<dynamic>? _route(RouteSettings settings) {
    final name = settings.name ?? '/';
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
        builder: (context, mode, _) => MaterialApp(
          title: 'UnaDomot',
          theme: unaTheme(),
          darkTheme: unaDarkTheme(),
          themeMode: mode,
          onGenerateRoute: _route,
          home: showOnboarding
              ? OnboardingScreen(
                  cache: cache,
                  api: api,
                  appState: state,
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
      );
}
