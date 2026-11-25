import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';

class CreateListingScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;

  const CreateListingScreen({super.key, required this.api, required this.cache});

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  static const _draftId = 'new-listing';
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _address = TextEditingController();
  final _state = TextEditingController(text: 'Rivers');
  final _lga = TextEditingController();
  Uint8List? _photoBytes;
  String? _photoName;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreDraft();
    for (final controller in [_title, _description, _price, _address, _state, _lga]) {
      controller.addListener(_saveDraft);
    }
  }

  Future<void> _restoreDraft() async {
    final draft = await widget.cache.readDraft(_draftId);
    if (draft == null || !mounted) return;
    setState(() {
      _title.text = draft['title'] as String? ?? '';
      _description.text = draft['description'] as String? ?? '';
      _price.text = draft['price'] as String? ?? '';
      _address.text = draft['address'] as String? ?? '';
      _state.text = draft['state'] as String? ?? 'Rivers';
      _lga.text = draft['lga'] as String? ?? '';
    });
  }

  void _saveDraft() {
    widget.cache.saveDraft(_draftId, {
      'title': _title.text,
      'description': _description.text,
      'price': _price.text,
      'address': _address.text,
      'state': _state.text,
      'lga': _lga.text,
    });
  }

  Future<void> _pickPhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 2000,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (mounted) {
      setState(() {
        _photoBytes = bytes;
        _photoName = picked.name;
      });
    }
  }

  @override
  void dispose() {
    for (final controller in [_title, _description, _price, _address, _state, _lga]) {
      controller.removeListener(_saveDraft);
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final listing = await widget.api.createListing({
        'title': _title.text.trim(),
        'description': _description.text.trim(),
        'price': double.tryParse(_price.text.trim()) ?? 0,
        'address': _address.text.trim(),
        'state': _state.text.trim(),
        'lga': _lga.text.trim(),
        'is_agent_listing': false,
      });

      if (_photoBytes != null) {
        final signature = await widget.api.mediaSignature();
        final uploaded = await widget.api.uploadToCloudinary(
          bytes: _photoBytes!,
          filename: _photoName ?? 'listing.jpg',
          signature: signature,
        );
        await widget.api.attachMedia(
          listing['id'] as String,
          publicId: uploaded['public_id'] as String,
          url: uploaded['secure_url'] as String,
          altText: _title.text.trim(),
        );
      }

      await widget.cache.clearDraft(_draftId);
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Post listing')),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _title,
                    decoration: const InputDecoration(labelText: 'Listing title'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Enter a title'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _description,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Description'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Enter a description'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _price,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Price per year'),
                    validator: (value) => double.tryParse(value ?? '') == null
                        ? 'Enter a valid price'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _address,
                    decoration: const InputDecoration(labelText: 'Address'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Enter an address'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _state,
                    decoration: const InputDecoration(labelText: 'State'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _lga,
                    decoration: const InputDecoration(labelText: 'LGA / area'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Enter an area'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _pickPhoto,
                    icon: const Icon(Icons.photo_library_outlined),
                    label: Text(_photoBytes == null ? 'Add a photo' : 'Change photo'),
                  ),
                  if (_photoBytes != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(_photoBytes!, height: 160, fit: BoxFit.cover),
                      ),
                    ),
                  const SizedBox(height: 16),
                  if (_error != null)
                    Text(
                      _error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_busy ? 'Posting' : 'Post listing'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}
