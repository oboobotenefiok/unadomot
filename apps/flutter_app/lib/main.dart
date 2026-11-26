import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'data/local_cache.dart';
import 'screens/listings_screen.dart';
import 'state/app_state.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
  const fallbackBaseUrl = 'http://10.0.2.2:3000';
  const baseUrl = configuredBaseUrl.isNotEmpty
      ? configuredBaseUrl
      : (kReleaseMode ? '' : fallbackBaseUrl);

  if (baseUrl.isEmpty) {
    throw StateError(
      'API_BASE_URL must be provided for release builds, for example '
      '--dart-define=API_BASE_URL=https://unadomot.fly.dev',
    );
  }

  final api = ApiClient(baseUrl: baseUrl);
  final cache = LocalCache();
  final state = AppState(api: api, cache: cache);
  await state.restore();
  runApp(UnaDomotApp(state: state, api: api, cache: cache));
}

class UnaDomotApp extends StatelessWidget {
  final AppState state;
  final ApiClient api;
  final LocalCache cache;

  const UnaDomotApp({
    super.key,
    required this.state,
    required this.api,
    required this.cache,
  });

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'UnaDomot',
        theme: unaTheme(),
        home: ListingsScreen(
          api: api,
          cache: cache,
          appState: state,
        ),
      );
}
