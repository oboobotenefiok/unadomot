import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientLookup on ApiClient {
  Future<Map<String, dynamic>> listingByCode(String code) async {
    final response = await http.get(
      baseUrl.resolve('/api/listings/code/${Uri.encodeComponent(code)}'),
      headers: {'Accept': 'application/json'},
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode == 404) {
      throw const ApiException(404, 'No listing matches that code.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not look up that code.');
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }
}
