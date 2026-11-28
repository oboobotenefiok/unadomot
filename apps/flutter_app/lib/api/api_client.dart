import 'dart:async';
import 'dart:convert';
import 'dart:io';
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
  Future<bool>? _refreshInFlight;
  int _sessionEpoch = 0;

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

  bool get signedIn => _token != null;

  String? get token => _token;
  String? get refreshToken => _refreshToken;
  DateTime? get expiresAt => _expiresAt;
  int get sessionEpoch => _sessionEpoch;

  void restoreSession(String token, DateTime expiresAt, {String? refreshToken}) {
    if (token.isEmpty) return;
    _token = token;
    _expiresAt = expiresAt;
    _refreshToken = refreshToken;
  }

  void signOut() {
    _sessionEpoch++;
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
    _applySession(data);
  }

  Future<void> googleSignIn(String idToken) async {
    final data = await _request(
      'POST',
      '/api/auth/google',
      body: {'id_token': idToken},
    );
    _applySession(data);
  }

  Future<void> _applySession(dynamic data) async {
    final session = Map<String, dynamic>.from(data as Map);
    final token = session['token'] as String;
    final refreshToken = session['refresh_token'] as String?;
    final expiresAt = DateTime.fromMillisecondsSinceEpoch(
      (session['expires_at'] as num).toInt() * 1000,
      isUtc: true,
    );

    if (token.isEmpty) {
      throw const FormatException('Invalid session response');
    }

    _token = token;
    _refreshToken = refreshToken;
    _expiresAt = expiresAt;
    await onSessionChanged?.call(token, refreshToken, expiresAt);
  }

  Future<void> logout() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null) return;
    try {
      await _client
          .post(
            baseUrl.resolve('/api/auth/logout'),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({'refresh_token': refreshToken}),
          )
          .timeout(const Duration(seconds: 10));
    } catch (_) {
      // Local sign-out still proceeds if the server is unreachable.
    }
  }

  Future<void> requestPasswordReset(String email) async {
    await _request(
      'POST',
      '/api/auth/password-reset/request',
      body: {'email': email.trim()},
    );
  }

  Future<void> confirmPasswordReset({
    required String token,
    required String newPassword,
  }) async {
    await _request(
      'POST',
      '/api/auth/password-reset/confirm',
      body: {'token': token.trim(), 'new_password': newPassword},
    );
  }

  Future<bool> refreshSession() => _refreshSession();

  Future<bool> _refreshSession() {
    final inFlight = _refreshInFlight;
    if (inFlight != null) return inFlight;

    final future = _performRefresh();
    _refreshInFlight = future;
    future.whenComplete(() => _refreshInFlight = null);
    return future;
  }

  Future<bool> _performRefresh() async {
    final sessionEpoch = _sessionEpoch;
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

      if (sessionEpoch != _sessionEpoch) return false;

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

  Future<void> createReport(
    String listingId, {
    required String reason,
    String? details,
  }) async {
    await _request(
      'POST',
      '/api/listings/${Uri.encodeComponent(listingId)}/reports',
      body: {
        'reason': reason,
        if (details != null && details.trim().isNotEmpty) 'details': details.trim(),
      },
      authenticated: true,
    );
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
      '/api/conversations/${Uri.encodeComponent(conversationId)}/rich-messages',
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

  Future<Map<String, dynamic>> sendMessage(
    String conversationId,
    String body, {
    String? mediaUrl,
    String? mediaType,
    int? durationSeconds,
    String? replyToId,
  }) async {
    final result = await _request(
      'POST',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/rich-messages',
      body: {
        'body': body,
        if (mediaUrl != null) 'media_url': mediaUrl,
        if (mediaType != null) 'media_type': mediaType,
        if (durationSeconds != null) 'duration_seconds': durationSeconds,
        if (replyToId != null) 'reply_to_id': replyToId,
      },
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<void> reactToMessage(String messageId, String emoji) async {
    await _request(
      'POST',
      '/api/messages/${Uri.encodeComponent(messageId)}/reactions',
      body: {'emoji': emoji},
      authenticated: true,
    );
  }

  Future<Map<String, dynamic>> startCall(
    String conversationId, {
    required String kind,
    required String offerSdp,
  }) async {
    final result = await _request(
      'POST',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/calls',
      body: {'kind': kind, 'offer_sdp': offerSdp},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<List<Map<String, dynamic>>> incomingCalls() async {
    final result = await _request('GET', '/api/calls/incoming', authenticated: true);
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<List<Map<String, dynamic>>> callHistory(String conversationId) async {
    final result = await _request(
      'GET',
      '/api/conversations/${Uri.encodeComponent(conversationId)}/calls/history',
      authenticated: true,
    );
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<Map<String, dynamic>> getCall(String callId) async {
    final result = await _request(
      'GET',
      '/api/calls/${Uri.encodeComponent(callId)}',
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<Map<String, dynamic>> answerCall(
    String callId, {
    required String answerSdp,
  }) async {
    final result = await _request(
      'POST',
      '/api/calls/${Uri.encodeComponent(callId)}/answer',
      body: {'answer_sdp': answerSdp},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  Future<void> endCall(String callId) async {
    await _request(
      'POST',
      '/api/calls/${Uri.encodeComponent(callId)}/end',
      authenticated: true,
    );
  }

  Future<Map<String, dynamic>> myProfile() async {
    final result = await _request('GET', '/api/profile/me', authenticated: true);
    return Map<String, dynamic>.from(result as Map);
  }

  Future<void> updateProfile({
    required String name,
    String? phone,
    String? bio,
    String? photoUrl,
  }) async {
    await _request(
      'PATCH',
      '/api/profile/me',
      body: {
        'name': name,
        'phone': phone,
        'bio': bio,
        if (photoUrl != null) 'photo_url': photoUrl,
      },
      authenticated: true,
    );
  }

  Future<List<Map<String, dynamic>>> myListings() async {
    final result = await _request('GET', '/api/profile/me/listings', authenticated: true);
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<List<Map<String, dynamic>>> favorites() async {
    final result = await _request('GET', '/api/favorites', authenticated: true);
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<void> addFavorite(String listingId) async {
    await _request(
      'POST',
      '/api/favorites/${Uri.encodeComponent(listingId)}',
      authenticated: true,
    );
  }

  Future<void> removeFavorite(String listingId) async {
    await _request(
      'DELETE',
      '/api/favorites/${Uri.encodeComponent(listingId)}',
      authenticated: true,
    );
  }

  Future<Map<String, dynamic>> publicProfile(String username) async {
    final result = await _request(
      'GET',
      '/api/profile/${Uri.encodeComponent(username)}',
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

  /// Submits a verification document by Cloudinary public id. The document
  /// must have been uploaded with `mediaSignature(purpose: 'verification')`.
  Future<Map<String, dynamic>> submitVerification({
    required String documentPublicId,
    String? notes,
  }) async {
    final result = await _request(
      'POST',
      '/api/verification',
      body: {'document_public_id': documentPublicId, 'notes': notes},
      authenticated: true,
    );
    return Map<String, dynamic>.from(result as Map);
  }

  /// Requests a signed Cloudinary upload for a specific purpose. The server
  /// chooses the folder and upload constraints; the client cannot pick a path.
  Future<Map<String, dynamic>> mediaSignature({
    String purpose = 'listing',
  }) async {
    if (!signedIn) {
      throw const ApiException(401, 'Please sign in to upload photos.');
    }
    final result = await _request(
      'POST',
      '/api/media/signature',
      body: {'purpose': purpose},
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
    final resourceType = signature['resource_type'] as String? ?? 'image';
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.cloudinary.com/v1_1/$cloud/$resourceType/upload'),
    )
      ..fields['api_key'] = signature['api_key'] as String
      ..fields['timestamp'] = '${signature['timestamp']}'
      ..fields['signature'] = signature['signature'] as String
      ..fields['folder'] = signature['folder'] as String
      ..fields['allowed_formats'] = signature['allowed_formats'] as String;

    final uploadType = signature['type'] as String?;
    if (uploadType != null) {
      request.fields['type'] = uploadType;
    }

    request.files.add(
      http.MultipartFile.fromBytes('file', bytes, filename: filename),
    );

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, 'Media upload failed.');
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<void> attachMedia(
    String listingId, {
    required String publicId,
    required String url,
    String? altText,
    String mediaType = 'image',
    int position = 0,
  }) async {
    await _request(
      'POST',
      '/api/listings/$listingId/media',
      body: {
        'cloudinary_public_id': publicId,
        'url': url,
        'alt_text': altText,
        'media_type': mediaType,
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
    final sessionEpoch = _sessionEpoch;
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

      if (authenticated && sessionEpoch != _sessionEpoch) {
        throw const ApiException(401, 'Session ended.');
      }

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
    } on TimeoutException {
      throw const ApiException(
        0,
        'The request timed out. Check your connection and try again.',
      );
    } on SocketException {
      throw const ApiException(
        0,
        'You appear to be offline. Check your connection and try again.',
      );
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
