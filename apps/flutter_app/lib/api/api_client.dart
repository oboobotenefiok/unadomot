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

class ApiClient {
  final Uri baseUrl;
  final http.Client _client;
  String? _token;
  DateTime? _expiresAt;

  ApiClient({required String baseUrl, http.Client? client})
      : baseUrl = Uri.parse(baseUrl),
        _client = client ?? http.Client() {
    if (!['http', 'https'].contains(baseUrl.scheme) || baseUrl.host.isEmpty) {
      throw ArgumentError('An HTTP(S) API URL is required');
    }
  }

  bool get signedIn =>
      _token != null &&
      _expiresAt != null &&
      _expiresAt!.isAfter(DateTime.now());

  void signOut() {
    _token = null;
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
    final expiresAt = DateTime.fromMillisecondsSinceEpoch(
      (session['expires_at'] as num).toInt() * 1000,
      isUtc: true,
    );

    if (token.isEmpty || !expiresAt.isAfter(DateTime.now())) {
      throw const FormatException('Invalid session response');
    }

    _token = token;
    _expiresAt = expiresAt;
  }

  Future<List<Map<String, dynamic>>> browse({
    Map<String, String> filters = const {},
  }) async {
    final result = await _request('GET', '/api/listings', query: filters);
    return (result as List)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
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

      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (response.statusCode == 401 && authenticated) {
          signOut();
        }
        throw ApiException(
          response.statusCode,
          response.statusCode >= 500
              ? 'The service is temporarily unavailable.'
              : 'Request failed (${response.statusCode}).',
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

  void close() => _client.close();
}
