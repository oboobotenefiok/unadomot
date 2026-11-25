import 'package:flutter/foundation.dart';
import '../api/api_client.dart';

class AppState extends ChangeNotifier {
  final ApiClient api;

  AppState({required this.api});

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
