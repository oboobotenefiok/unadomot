import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientProfile on ApiClient {
  Map<String, String> get _authHeaders => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  Future<void> updateProfile({
    required String name,
    required String phone,
    required String bio,
    String? photoUrl,
  }) async {
    final response = await http.patch(
      baseUrl.resolve('/api/profile/me'),
      headers: _authHeaders,
      body: jsonEncode({
        'name': name,
        'phone': phone,
        'bio': bio,
        if (photoUrl != null) 'photo_url': photoUrl,
      }),
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not save profile.');
    }
  }

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
