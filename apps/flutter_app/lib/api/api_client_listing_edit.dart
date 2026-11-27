import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientListingEdit on ApiClient {
  Future<void> updateListing(String listingId, Map<String, dynamic> fields) async {
    final response = await http.patch(
      baseUrl.resolve('/api/listings/${Uri.encodeComponent(listingId)}'),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(fields),
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not update listing.');
    }
  }
}
