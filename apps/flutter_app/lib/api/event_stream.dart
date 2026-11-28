import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

/// Long-polls `/api/events` so a signed-in client learns about new messages
/// without holding a socket open. Each response carries one event; the loop
/// reconnects immediately, backing off when the server or network fails.
class EventStream {
  final ApiClient api;
  final http.Client _client = http.Client();
  final StreamController<Map<String, dynamic>> _controller =
      StreamController<Map<String, dynamic>>.broadcast();

  bool _running = false;

  EventStream(this.api);

  Stream<Map<String, dynamic>> get events => _controller.stream;

  void start() {
    if (_running) return;
    _running = true;
    unawaited(_loop());
  }

  Future<void> _loop() async {
    while (_running) {
      final token = api.token;
      if (token == null) {
        await Future<void>.delayed(const Duration(seconds: 5));
        continue;
      }

      try {
        final response = await _client
            .get(
              api.baseUrl.resolve('/api/events'),
              headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )
            .timeout(const Duration(seconds: 45));

        if (!_running) return;

        if (response.statusCode == 200 && response.body.isNotEmpty) {
          final decoded = jsonDecode(response.body);
          if (decoded is Map) {
            _controller.add(Map<String, dynamic>.from(decoded));
          }
        } else if (response.statusCode == 401) {
          await Future<void>.delayed(const Duration(seconds: 15));
        }
      } catch (_) {
        if (!_running) return;
        await Future<void>.delayed(const Duration(seconds: 5));
      }
    }
  }

  void dispose() {
    _running = false;
    _client.close();
    _controller.close();
  }
}
