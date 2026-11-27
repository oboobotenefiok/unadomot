import 'package:flutter/material.dart';
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
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  int _sessionEpoch = 0;

  AppState({
    required this.api,
    required this.cache,
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage() {
    api.onSessionChanged = _persistSession;
  }

  bool get signedIn => api.signedIn;

  int get sessionEpoch => _sessionEpoch;

  Future<void> restore() async {
    final token = await _storage.read(key: _tokenKey);
    final refresh = await _storage.read(key: _refreshKey);
    final expiry = await _storage.read(key: _expiryKey);
    if (token == null || expiry == null) return;
    final expiresAt = DateTime.tryParse(expiry);
    if (expiresAt == null) return;
    api.restoreSession(token, expiresAt, refreshToken: refresh);

    if (refresh != null &&
        expiresAt.isBefore(DateTime.now().toUtc().add(const Duration(minutes: 2)))) {
      await api.refreshSession();
    }
    notifyListeners();
  }

  Future<void> authenticate({
    required String email,
    required String password,
    String? name,
  }) async {
    await api.authenticate(email: email, password: password, name: name);
    notifyListeners();
  }

  Future<void> googleSignIn(String idToken) async {
    await api.googleSignIn(idToken);
    notifyListeners();
  }

  Future<void> _persistSession(
    String token,
    String? refreshToken,
    DateTime expiresAt,
  ) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _expiryKey, value: expiresAt.toIso8601String());
    if (refreshToken != null) {
      await _storage.write(key: _refreshKey, value: refreshToken);
    } else {
      await _storage.delete(key: _refreshKey);
    }
  }

  Future<void> signOut() async {
    try {
      await api.logout();
    } finally {
      await _resetSession();
    }
  }

  Future<void> _resetSession() async {
    api.signOut();
    _sessionEpoch++;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _expiryKey);
    await cache.clearUserData();
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    notifyListeners();
  }
}
