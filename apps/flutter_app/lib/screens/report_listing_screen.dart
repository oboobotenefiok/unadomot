import 'package:flutter/material.dart';
import '../api/api_client.dart';

class ReportListingScreen extends StatefulWidget {
  final ApiClient api;
  final String listingId;

  const ReportListingScreen({
    super.key,
    required this.api,
    required this.listingId,
  });

  @override
  State<ReportListingScreen> createState() => _ReportListingScreenState();
}

class _ReportListingScreenState extends State<ReportListingScreen> {
  final _reason = TextEditingController();
  final _details = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason.text.trim().isEmpty) {
      setState(() => _error = 'Enter a reason for the report');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.createReport(
        widget.listingId,
        reason: _reason.text.trim(),
        details: _details.text,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Report listing')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Tell us what is wrong with this listing. Reports are reviewed by the moderation team.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _reason,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Scam, wrong price, duplicate, unavailable',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _details,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Details (optional)',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? 'Submitting' : 'Submit report'),
              ),
            ],
          ),
        ),
      );
}
