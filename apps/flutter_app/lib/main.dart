import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'data/local_cache.dart';
import 'screens/auth_screen.dart';
import 'screens/listings_screen.dart';
import 'state/app_state.dart';

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
        theme: ThemeData(colorSchemeSeed: Colors.green, useMaterial3: true),
        home: ListenableBuilder(
          listenable: state,
          builder: (context, _) => state.signedIn
              ? ListingsScreen(api: api, cache: cache)
              : AuthScreen(appState: state),
        ),
      );
}
