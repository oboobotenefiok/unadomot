import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../state/app_state.dart';

Future<bool> requireAuth(
  BuildContext context,
  AppState appState, {
  bool register = false,
}) async {
  if (appState.signedIn) return true;

  final result = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => AuthSheet(
      appState: appState,
      startInRegister: register,
    ),
  );
  return result ?? false;
}

class AuthSheet extends StatefulWidget {
  final AppState appState;
  final bool startInRegister;

  const AuthSheet({
    super.key,
    required this.appState,
    this.startInRegister = false,
  });

  @override
  State<AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends State<AuthSheet> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  late bool _register;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _register = widget.startInRegister;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await widget.appState.authenticate(
        email: _email.text,
        password: _password.text,
        name: _register ? _name.text : null,
      );
      if (mounted) Navigator.pop(context, true);
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
      if (error.status == 401) {
        return 'Invalid email or password.';
      }
      if (error.status == 429) {
        return 'Too many attempts. Try again in a minute.';
      }
      if (error.status >= 500) {
        return 'Something went wrong on our side.';
      }
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 16, 24, 24 + bottom),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _register ? 'Create your account' : 'Welcome back',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                _register
                    ? 'Sign up to save listings, message listers and post your own.'
                    : 'Sign in to continue where you left off.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              if (_register) ...[
                TextFormField(
                  controller: _name,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Enter your name'
                      : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) => value == null || !value.contains('@')
                    ? 'Enter a valid email'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(labelText: 'Password'),
                validator: (value) => value == null || value.length < 8
                    ? 'Use at least 8 characters'
                    : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(
                  _busy
                      ? 'Please wait'
                      : _register
                          ? 'Create account'
                          : 'Sign in',
                ),
              ),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() => _register = !_register),
                child: Text(
                  _register
                      ? 'I already have an account'
                      : 'New to UnaDomot? Create an account',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
