import 'package:flutter_test/flutter_test.dart';
import 'package:unadomot/api/api_client.dart';
import 'package:unadomot/data/local_cache.dart';
import 'package:unadomot/main.dart';
import 'package:unadomot/state/app_state.dart';

class _PublicApi extends ApiClient {
  _PublicApi() : super(baseUrl: 'https://example.test');

  @override
  Future<ListingPage> browse({
    Map<String, String> filters = const {},
    int limit = 20,
    int offset = 0,
  }) async => const ListingPage(items: [], hasMore: false, nextOffset: 0);
}

class _MemoryCache extends LocalCache {
  @override
  Future<void> cacheListings(List<Map<String, dynamic>> listings) async {}
}

void main() {
  testWidgets('Home opens signed out and Post prompts for signup', (tester) async {
    final api = _PublicApi();
    final cache = _MemoryCache();
    final state = AppState(api: api, cache: cache);
    addTearDown(api.close);
    addTearDown(state.dispose);

    await tester.pumpWidget(UnaDomotApp(state: state, api: api, cache: cache));
    await tester.pumpAndSettle();
    expect(find.text('Available rentals'), findsOneWidget);
    expect(find.text('Create your account'), findsNothing);

    await tester.tap(find.text('Post listing'));
    await tester.pumpAndSettle();
    expect(find.text('Create your account'), findsOneWidget);
  });
}
