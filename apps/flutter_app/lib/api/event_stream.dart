import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

/// Keeps a request open against `/api/events` and republishes whatever the
/// server sends. The server holds the request for up to 25 seconds, so a
/// change made on another device arrives within milliseconds of being written.
///
/// Every screen that needs live updates listens to [events] and refreshes the
/// slice it owns. Nothing here knows about messages or listings specifically.
class EventStream {
  final ApiClient api;
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  bool _running = false;
  int _backoffSeconds = 1;

  EventStream(this.api);

  Stream<Map<String, dynamic>> get events => _controller.stream;

  void start() {
    if (_running) return;
    _running = true;
    _loop();
  }

  void stop() {
    _running = false;
  }

  void dispose() {
    _running = false;
    _controller.close();
  }

  Future<void> _loop() async {
    while (_running) {
      if (!api.signedIn) {
        await Future<void>.delayed(const Duration(seconds: 2));
        continue;
      }

      try {
        final response = await http
            .get(
              api.baseUrl.resolve('/api/events'),
              headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ${api.token}',
              },
            )
            .timeout(const Duration(seconds: 40));

        if (response.statusCode == 401) {
          // The session may be mid-refresh; try again shortly rather than
          // tearing the stream down.
          await Future<void>.delayed(const Duration(seconds: 5));
          continue;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          await _waitBeforeRetry();
          continue;
        }

        _backoffSeconds = 1;
        final decoded = jsonDecode(response.body);
        if (decoded is Map) {
          final batch = decoded['events'];
          if (batch is List) {
            for (final item in batch) {
              if (item is Map) {
                _controller.add(Map<String, dynamic>.from(item));
              }
            }
          }
        }
      } catch (_) {
        await _waitBeforeRetry();
      }
    }
  }

  Future<void> _waitBeforeRetry() async {
    await Future<void>.delayed(Duration(seconds: _backoffSeconds));
    _backoffSeconds = (_backoffSeconds * 2).clamp(1, 30);
  }
}
