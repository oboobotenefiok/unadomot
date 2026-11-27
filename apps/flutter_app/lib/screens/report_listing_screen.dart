import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../theme.dart';

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
  static const _reasons = [
    'Scam or fraud',
    'Wrong price',
    'Duplicate listing',
    'Already unavailable',
    'Offensive content',
    'Other',
  ];

  final _details = TextEditingController();
  String? _reason;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null) {
      setState(() => _error = 'Choose a reason for the report');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.createReport(
        widget.listingId,
        reason: _reason!,
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
              const Text(
                'Tell us what is wrong with this listing. Reports are reviewed by the moderation team.',
                style: TextStyle(color: UnaColors.text500, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 20),
              const Text(
                'Why are you reporting this listing?',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _reasons
                    .map(
                      (reason) => ChoiceChip(
                        label: Text(reason),
                        selected: _reason == reason,
                        onSelected: _busy
                            ? null
                            : (_) => setState(() {
                                  _reason = reason;
                                  _error = null;
                                }),
                        selectedColor: UnaColors.green100,
                        labelStyle: TextStyle(
                          color: _reason == reason ? UnaColors.green900 : UnaColors.text700,
                          fontSize: 13,
                          fontWeight: _reason == reason ? FontWeight.w600 : FontWeight.w400,
                        ),
                        side: BorderSide(
                          color: _reason == reason ? UnaColors.green700 : UnaColors.border,
                        ),
                        showCheckmark: false,
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _details,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Details (optional)',
                  hintText: 'Add anything that helps us review this report.',
                ),
              ),
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
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy || _reason == null ? null : _submit,
                child: Text(_busy ? 'Submitting' : 'Submit report'),
              ),
            ],
          ),
        ),
      );
}
