import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';

class AppState extends ChangeNotifier {
  static const _tokenKey = 'unadomot_access_token';
  static const _refreshKey = 'unadomot_refresh_token';
  static const _expiryKey = 'unadomot_access_expiry';

  final ApiClient api;
  final LocalCache cache;
  final FlutterSecureStorage _storage;

  AppState({
    required this.api,
    required this.cache,
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  bool get signedIn => api.signedIn;

  Future<void> restore() async {
    final token = await _storage.read(key: _tokenKey);
    final refresh = await _storage.read(key: _refreshKey);
    final expiry = await _storage.read(key: _expiryKey);
    if (token == null || expiry == null) return;
    final expiresAt = DateTime.tryParse(expiry);
    if (expiresAt == null) return;
    api.restoreSession(token, expiresAt, refreshToken: refresh);
    notifyListeners();
  }

  Future<void> authenticate({
    required String email,
    required String password,
    String? name,
  }) async {
    await api.authenticate(email: email, password: password, name: name);
    final token = api.token;
    final refresh = api.refreshToken;
    final expiresAt = api.expiresAt;
    if (token != null && expiresAt != null) {
      await _storage.write(key: _tokenKey, value: token);
      await _storage.write(key: _expiryKey, value: expiresAt.toIso8601String());
      if (refresh != null) {
        await _storage.write(key: _refreshKey, value: refresh);
      }
    }
    notifyListeners();
  }

  Future<void> signOut() async {
    api.signOut();
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _expiryKey);
    notifyListeners();
  }
}
