import 'package:flutter/material.dart';
import '../api/api_client.dart';

class VerificationScreen extends StatefulWidget {
  final ApiClient api;

  const VerificationScreen({super.key, required this.api});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _urlController = TextEditingController();
  final _notesController = TextEditingController();
  Map<String, dynamic>? _request;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _urlController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final request = await widget.api.myVerification();
      if (mounted) setState(() => _request = request);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final url = _urlController.text.trim();
    if (url.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final request = await widget.api.submitVerification(
        documentUrl: url,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      if (mounted) {
        setState(() => _request = request);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verification request submitted.')),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Verification')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_request != null) ...[
                    Card(
                      child: ListTile(
                        leading: Icon(
                          _request!['status'] == 'approved'
                              ? Icons.verified
                              : _request!['status'] == 'rejected'
                                  ? Icons.cancel
                                  : Icons.hourglass_top,
                        ),
                        title: Text('Status: ${_request!['status']}'),
                        subtitle: Text(
                          _request!['review_notes'] as String? ?? 'Awaiting review',
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (_request == null || _request!['status'] != 'pending') ...[
                    TextField(
                      controller: _urlController,
                      decoration: const InputDecoration(
                        labelText: 'Document URL',
                        hintText: 'https://...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Notes (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Submitting...' : 'Submit for verification'),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                ],
              ),
      );
}
