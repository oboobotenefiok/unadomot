import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientLookup on ApiClient {
  Future<Map<String, dynamic>> listingByCode(String code) async {
    final scannedId = _listingIdFromLink(code);
    if (scannedId != null) {
      return detail(scannedId);
    }

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

  /// The share sheet encodes a listing link, while the code screen encodes a
  /// short code. Accept both so either QR opens the right listing.
  String? _listingIdFromLink(String value) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null) return null;
    final segments = uri.pathSegments;
    final index = segments.indexOf('listing');
    if (index < 0 || index + 1 >= segments.length) return null;
    final id = segments[index + 1];
    return id.isEmpty ? null : id;
  }
}
