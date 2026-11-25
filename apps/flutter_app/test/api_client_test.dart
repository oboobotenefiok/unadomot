import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:unadomot/api/api_client.dart';

void main() {
  test('public browse sends filters without authentication', () async {
    final api = ApiClient(
      baseUrl: 'https://example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/listings');
        expect(request.url.queryParameters['state'], 'Rivers');
        expect(request.headers['Authorization'], isNull);
        return http.Response(
          jsonEncode({
            'items': [
              {'id': 'one', 'title': 'Flat'}
            ],
            'has_more': false,
            'next_offset': 20,
          }),
          200,
        );
      }),
    );
    addTearDown(api.close);

    final page = await api.browse(filters: {'state': 'Rivers'});
    expect(page.items.single['id'], 'one');
    expect(page.hasMore, isFalse);
  });

  test('creation requires a session', () async {
    final api = ApiClient(baseUrl: 'https://example.test');
    addTearDown(api.close);

    await expectLater(
      api.createListing({}),
      throwsA(
        isA<ApiException>().having((error) => error.status, 'status', 401),
      ),
    );
  });

  test('login supplies bearer token and sign out clears it', () async {
    final api = ApiClient(
      baseUrl: 'https://example.test',
      client: MockClient((request) async {
        if (request.url.path == '/api/auth/login') {
          expect(jsonDecode(request.body)['email'], 'test@example.test');
          return http.Response(
            jsonEncode({
              'token': 'test-token',
              'refresh_token': 'test-refresh-token',
              'expires_at': DateTime.now()
                  .add(const Duration(hours: 1))
                  .millisecondsSinceEpoch ~/
                  1000,
            }),
            200,
          );
        }

        expect(request.headers['Authorization'], 'Bearer test-token');
        return http.Response('{"id":"one"}', 200);
      }),
    );
    addTearDown(api.close);

    await api.authenticate(
      email: 'test@example.test',
      password: 'test-password',
    );
    expect(api.signedIn, isTrue);

    final created = await api.createListing({'title': 'Flat'});
    expect(created['id'], 'one');

    api.signOut();
    expect(api.signedIn, isFalse);
  });

  test('server failures do not expose internal response details', () async {
    final api = ApiClient(
      baseUrl: 'https://example.test',
      client: MockClient((_) async => http.Response('database secret', 503)),
    );
    addTearDown(api.close);

    await expectLater(
      api.browse(),
      throwsA(
        isA<ApiException>().having(
          (error) => error.message,
          'message',
          'The service is temporarily unavailable.',
        ),
      ),
    );
  });
}
