import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'data/local_cache.dart';
import 'screens/listings_screen.dart';
import 'state/app_state.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
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
