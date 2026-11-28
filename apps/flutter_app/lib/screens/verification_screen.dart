import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../theme.dart';

class VerificationScreen extends StatefulWidget {
  final ApiClient api;

  const VerificationScreen({super.key, required this.api});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final _notesController = TextEditingController();
  Map<String, dynamic>? _request;
  String? _documentPublicId;
  String? _documentName;
  bool _loading = true;
  bool _uploading = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
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

  Future<void> _pickDocument() async {
    if (_uploading) return;
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
      maxWidth: 2000,
    );
    if (picked == null) return;

    setState(() {
      _uploading = true;
      _error = null;
    });

    try {
      final bytes = await picked.readAsBytes();
      final signature = await widget.api.mediaSignature(purpose: 'verification');
      final uploaded = await widget.api.uploadToCloudinary(
        bytes: bytes,
        filename: picked.name,
        signature: signature,
      );
      final publicId = uploaded['public_id'] as String?;
      if (publicId == null || publicId.isEmpty) {
        throw const ApiException(0, 'The upload did not return a document id.');
      }
      if (mounted) {
        setState(() {
          _documentPublicId = publicId;
          _documentName = picked.name;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    final publicId = _documentPublicId;
    if (publicId == null || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final request = await widget.api.submitVerification(
        documentPublicId: publicId,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      if (mounted) {
        setState(() {
          _request = request;
          _documentPublicId = null;
          _documentName = null;
        });
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
                    _statusCard(),
                    const SizedBox(height: 16),
                  ],
                  if (_request == null || _request!['status'] != 'pending') ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: UnaColors.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: UnaColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Submit verification',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Upload a clear photo of a government ID, business registration, or proof of address. Documents are stored privately and only reviewed by our team.',
                            style: TextStyle(color: UnaColors.text500, fontSize: 13, height: 1.4),
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: _uploading ? null : _pickDocument,
                            icon: _uploading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.upload_file_outlined),
                            label: Text(
                              _uploading
                                  ? 'Uploading...'
                                  : _documentName ?? 'Choose document',
                            ),
                          ),
                          if (_documentPublicId != null) ...[
                            const SizedBox(height: 6),
                            const Text(
                              'Document uploaded. Submit when you are ready.',
                              style: TextStyle(fontSize: 12, color: UnaColors.green700),
                            ),
                          ],
                          const SizedBox(height: 12),
                          TextField(
                            controller: _notesController,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Notes (optional)',
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: _submitting || _documentPublicId == null
                                ? null
                                : _submit,
                            child: Text(_submitting ? 'Submitting...' : 'Submit for verification'),
                          ),
                        ],
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
                      child: Text(_error!, style: const TextStyle(color: UnaColors.error, fontSize: 13)),
                    ),
                  ],
                ],
              ),
      );

  Widget _statusCard() {
    final status = _request!['status'] as String? ?? 'pending';
    final approved = status == 'approved';
    final rejected = status == 'rejected';
    final color = approved
        ? UnaColors.green700
        : rejected
            ? UnaColors.error
            : const Color(0xFFB45309);
    final background = approved
        ? UnaColors.green100
        : rejected
            ? const Color(0xFFFEF2F2)
            : const Color(0xFFFFFBEB);
    final icon = approved
        ? Icons.verified
        : rejected
            ? Icons.cancel
            : Icons.hourglass_top;
    final title = approved
        ? 'Verified'
        : rejected
            ? 'Verification declined'
            : 'Verification pending';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  _request!['review_notes'] as String? ??
                      (approved
                          ? 'Your account is verified.'
                          : rejected
                              ? 'Please review the notes and submit again.'
                              : 'We are reviewing your documents.'),
                  style: TextStyle(color: color, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
