import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

extension ApiClientComments on ApiClient {
  Map<String, String> get _authHeaders => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  Future<List<Map<String, dynamic>>> comments(String listingId) async {
    final response = await http.get(
      baseUrl.resolve('/api/listings/${Uri.encodeComponent(listingId)}/comments'),
      headers: {'Accept': 'application/json'},
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Comments unavailable.');
    }
    return (jsonDecode(response.body) as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<Map<String, dynamic>> postComment(String listingId, String body) async {
    final response = await http.post(
      baseUrl.resolve('/api/listings/${Uri.encodeComponent(listingId)}/comments'),
      headers: _authHeaders,
      body: jsonEncode({'body': body}),
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not post comment.');
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<void> deleteComment(String commentId) async {
    final response = await http.delete(
      baseUrl.resolve('/api/comments/${Uri.encodeComponent(commentId)}'),
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not delete comment.');
    }
  }

  Future<Map<String, dynamic>> reactToComment(String commentId, String emoji) async {
    final response = await http.post(
      baseUrl.resolve('/api/comments/${Uri.encodeComponent(commentId)}/reactions'),
      headers: _authHeaders,
      body: jsonEncode({'emoji': emoji}),
    ).timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Could not react.');
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }
}
