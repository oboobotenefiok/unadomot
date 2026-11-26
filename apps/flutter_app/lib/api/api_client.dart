import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int status;
  final String message;

  const ApiException(this.status, this.message);

  @override
  String toString() => message;
}

class ListingPage {
  final List<Map<String, dynamic>> items;
  final bool hasMore;
  final int nextOffset;

  const ListingPage({
    required this.items,
    required this.hasMore,
    required this.nextOffset,
  });
}

class ApiClient {
  final Uri baseUrl;
  final http.Client _client;
  String? _token;
  String? _refreshToken;
  DateTime? _expiresAt;

  Future<void> Function(String token, String? refreshToken, DateTime expiresAt)?
      onSessionChanged;

  ApiClient({required String baseUrl, http.Client? client})
      : baseUrl = Uri.parse(baseUrl),
        _client = client ?? http.Client() {
    if (!['http', 'https'].contains(this.baseUrl.scheme) ||
        this.baseUrl.host.isEmpty) {
      throw ArgumentError('An HTTP(S) API URL is required');
    }
  }

  bool get signedIn =>
      _token != null &&
      _expiresAt != null &&
      _expiresAt!.isAfter(DateTime.now());

  String? get token => _token;
  String? get refreshToken => _refreshToken;
  DateTime? get expiresAt => _expiresAt;

  void restoreSession(String token, DateTime expiresAt, {String? refreshToken}) {
    if (token.isEmpty || !expiresAt.isAfter(DateTime.now())) return;
    _token = token;
    _expiresAt = expiresAt;
    _refreshToken = refreshToken;
  }

  void signOut() {
    _token = null;
    _refreshToken = null;
    _expiresAt = null;
  }

  Future<void> authenticate({
    required String email,
    required String password,
    String? name,
  }) async {
    final path = name == null ? '/api/auth/login' : '/api/auth/register';
    final body = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      if (name != null) 'name': name.trim(),
    };

    final data = await _request('POST', path, body: body);
    final session = Map<String, dynamic>.from(data as Map);
    final token = session['token'] as String;
    final refreshToken = session['refresh_token'] as String?;
    final expiresAt = DateTime.fromMillisecondsSinceEpoch(
      (session['expires_at'] as num).toInt() * 1000,
      isUtc: true,
    );

    if (token.isEmpty || !expiresAt.isAfter(DateTime.now())) {
      throw const FormatException('Invalid session response');
    }

    _token = token;
    _refreshToken = refreshToken;
    _expiresAt = expiresAt;
    await onSessionChanged?.call(token, refreshToken, expiresAt);
  }

  Future<bool> _refreshSession() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null) return false;

    try {
      final response = await _client.post(
        baseUrl.resolve('/api/auth/refresh'),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'refresh_token': refreshToken}),
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode < 200 || response.statusCode >= 300) {
        signOut();
        return false;
      }

      final session = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      final token = session['token'] as String;
      final nextRefresh = session['refresh_token'] as String?;
      final expiresAt = DateTime.fromMillisecondsSinceEpoch(
        (session['expires_at'] as num).toInt() * 1000,
        isUtc: true,
      );
      _token = token;
      _refreshToken = nextRefresh;
      _expiresAt = expiresAt;
      await onSessionChanged?.call(token, nextRefresh, expiresAt);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<ListingPage> browse({
    Map<String, String> filters = const {},
    int limit = 20,
    int offset = 0,
  }) async {
    final query = {
      ...filters,
      'limit': '$limit',
      'offset': '$offset',
    };
    final result = await _request('GET', '/api/listings', query: query);
    final page = Map<String, dynamic>.from(result as Map);
    return ListingPage(
      items: (page['items'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(),
      hasMore: page['has_more'] as bool? ?? false,
      nextOffset: (page['next_offset'] as num?)?.toInt() ?? offset + limit,
    );
  }

  Future<Map<String, dynamic>> detail(String id) async {
    final result = await _request(
      'GET',
      '/api/listings/${Uri.encodeComponent(id)}',
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>> createListing(Map<String, dynamic> input) async {
    if (!signedIn) {
      signOut();
      throw const ApiException(401, 'Please sign in to post a listing.');
    }

    final result = await _request(
      'POST',
      '/api/listings',
      body: input,
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<List<Map<String, dynamic>>> conversations() async {
    final result = await _request('GET', '/api/conversations', authenticated: true);
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<List<Map<String, dynamic>>> messages(
    String conversationId, {
    String? before,
    int limit = 50,
  }) async {
    final result = await _request(
      'GET',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/messages',
      query: {
        'limit': '$limit',
        if (before != null) 'before': before,
      },
      authenticated: true,
    );
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<Map<String, dynamic>> sendMessage(String conversationId, String body) async {
    final result = await _request(
      'POST',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/messages',
      body: {'body': body},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<void> markRead(String conversationId) async {
    await _request(
      'POST',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/read',
      authenticated: true,
    );
  }

  Future<Map<String, dynamic>> startConversation({required String listingId}) async {
    final result = await _request(
      'POST',
      '/api/listings/${Uri.encodeComponent(listingId)}/conversations',
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>?> myVerification() async {
    final result = await _request('GET', '/api/verification/me', authenticated: true);
    if (result == null) return null;
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>> submitVerification({
    required String documentUrl,
    String? notes,
  }) async {
    final result = await _request(
      'POST',
      '/api/verification',
      body: {'document_url': documentUrl, 'notes': notes},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>> mediaSignature({String folder = 'unadomot/listings'}) async {
    if (!signedIn) {
      throw const ApiException(401, 'Please sign in to upload photos.');
    }
    final result = await _request(
      'POST',
      '/api/media/signature',
      body: {'folder': folder},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>> uploadToCloudinary({
    required Uint8List bytes,
    required String filename,
    required Map<String, dynamic> signature,
  }) async {
    final cloud = signature['cloud_name'] as String;
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.cloudinary.com/v1_1/$cloud/image/upload'),
    )
      ..fields['api_key'] = signature['api_key'] as String
      ..fields['timestamp'] = '${signature['timestamp']}'
      ..fields['signature'] = signature['signature'] as String
      ..fields['folder'] = signature['folder'] as String
      ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Photo upload failed.');
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<void> attachMedia(
    String listingId, {
    required String publicId,
    required String url,
    String? altText,
    int position = 0,
  }) async {
    await _request(
      'POST',
      '/api/listings/$listingId/media',
      body: {
        'cloudinary_public_id': publicId,
        'url': url,
        'alt_text': altText,
        'position': position,
      },
      authenticated: true,
    );
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
    bool authenticated = false,
    bool retried = false,
  }) async {
    final uri = baseUrl.resolve(path).replace(queryParameters: query);
    final request = http.Request(method, uri)
      ..headers['Accept'] = 'application/json';

    if (authenticated) {
      request.headers['Authorization'] = 'Bearer $_token';
    }

    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    try {
      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed)
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 401 && authenticated && !retried) {
        if (await _refreshSession()) {
          return await _request(
            method,
            path,
            query: query,
            body: body,
            authenticated: true,
            retried: true,
          );
        }
        signOut();
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(
          response.statusCode,
          _errorMessage(response),
        );
      }

      return response.body.isEmpty ? null : jsonDecode(response.body);
    } on http.ClientException {
      throw const ApiException(
        0,
        'Unable to reach UnaDomot. Check your connection.',
      );
    }
  }

  String _errorMessage(http.Response response) {
    if (response.statusCode >= 500) {
      return 'The service is temporarily unavailable.';
    }
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['error'] is Map) {
        final message = (decoded['error'] as Map)['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
      }
    } catch (_) {
      // Fall through to the generic message.
    }
    return 'Request failed (${response.statusCode}).';
  }

  void close() => _client.close();
}
