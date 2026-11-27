import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../theme.dart';

class ResetPasswordScreen extends StatefulWidget {
  final ApiClient api;

  const ResetPasswordScreen({super.key, required this.api});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _email = TextEditingController();
  final _token = TextEditingController();
  final _password = TextEditingController();
  bool _requested = false;
  bool _busy = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _email.dispose();
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    if (!_email.text.contains('@')) {
      setState(() => _error = 'Enter a valid email');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.requestPasswordReset(_email.text);
      if (mounted) {
        setState(() {
          _requested = true;
          _success = 'If that email exists, a reset link is on its way.';
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    if (_token.text.trim().isEmpty) {
      setState(() => _error = 'Paste the reset token from your email');
      return;
    }
    if (_password.text.length < 6) {
      setState(() => _error = 'Use at least 6 characters');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.confirmPasswordReset(
        token: _token.text,
        newPassword: _password.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password updated. You can sign in now.')),
        );
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendlyError(Object error) {
    if (error is ApiException) {
      if (error.status == 0) {
        return "Can't reach UnaDomot. Check your connection.";
      }
      if (error.status == 429) {
        return 'Too many attempts. Try again in a minute.';
      }
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Reset password')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _requested
                    ? 'Enter the token from your email and choose a new password.'
                    : 'Enter your account email and we will send a reset link.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              if (!_requested) ...[
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _busy ? null : _request,
                  child: Text(_busy ? 'Please wait' : 'Send reset link'),
                ),
              ] else ...[
                TextField(
                  controller: _token,
                  decoration: const InputDecoration(labelText: 'Reset token'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _busy ? null : _confirm,
                  child: Text(_busy ? 'Please wait' : 'Update password'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                            _requested = false;
                            _success = null;
                          }),
                  child: const Text('Use a different email'),
                ),
              ],
              if (_success != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: UnaColors.green100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: UnaColors.green200),
                  ),
                  child: Text(
                    _success!,
                    style: const TextStyle(color: UnaColors.green900, fontSize: 13),
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: UnaColors.error, fontSize: 13),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
}
