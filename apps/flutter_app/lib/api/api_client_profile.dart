import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientProfile on ApiClient {
  Map<String, String> get _authHeaders => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  Future<void> deleteListing(String listingId) async {
    final response = await http.delete(
      baseUrl.resolve('/api/listings/${Uri.encodeComponent(listingId)}'),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not delete listing.');
    }
  }
}
