import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';

class AppState extends ChangeNotifier {
  final ApiClient api;
  final LocalCache cache;

  AppState({required this.api, required this.cache});

  bool get signedIn => api.signedIn;

  void signOut() {
    api.signOut();
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
}
