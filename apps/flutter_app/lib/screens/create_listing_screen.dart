import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
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

class _MediaItem {
  final Uint8List bytes;
  final String name;
  final String type;

  const _MediaItem({required this.bytes, required this.name, required this.type});
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  static const _draftId = 'new-listing';
  final _detailsKey = GlobalKey<FormState>();
  final _locationKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _address = TextEditingController();
  final _state = TextEditingController(text: 'Rivers');
  final _lga = TextEditingController();
  final _bedrooms = TextEditingController();
  final _bathrooms = TextEditingController();
  String? _propertyType;
  bool _isAgent = false;
  final List<_MediaItem> _media = [];
  int _step = 0;
  bool _busy = false;
  String? _error;

  static const _propertyTypes = [
    'Apartment',
    'House',
    'Self Contain',
    'Room',
    'Duplex',
  ];

  @override
  void initState() {
    super.initState();
    _restoreDraft();
    for (final controller in [
      _title,
      _description,
      _price,
      _address,
      _state,
      _lga,
      _bedrooms,
      _bathrooms,
    ]) {
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
      _bedrooms.text = draft['bedrooms'] as String? ?? '';
      _bathrooms.text = draft['bathrooms'] as String? ?? '';
      _propertyType = draft['property_type'] as String?;
      _isAgent = draft['is_agent_listing'] as bool? ?? false;
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
      'bedrooms': _bedrooms.text,
      'bathrooms': _bathrooms.text,
      'property_type': _propertyType,
      'is_agent_listing': _isAgent,
    });
  }

  Future<void> _pickImages() async {
    final picked = await ImagePicker().pickMultiImage(
      imageQuality: 85,
      maxWidth: 2000,
    );
    if (picked.isEmpty) return;
    for (final file in picked) {
      final bytes = await file.readAsBytes();
      _media.add(_MediaItem(bytes: bytes, name: file.name, type: 'image'));
    }
    if (mounted) setState(() {});
  }

  Future<void> _pickVideo() async {
    final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (mounted) {
      setState(() {
        _media.add(_MediaItem(bytes: bytes, name: picked.name, type: 'video'));
      });
    }
  }

  Future<void> _pickDocument() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    if (mounted) {
      setState(() {
        _media.add(_MediaItem(bytes: file.bytes!, name: file.name, type: 'document'));
      });
    }
  }

  void _removeMedia(int index) {
    setState(() => _media.removeAt(index));
  }

  void _next() {
    if (_step == 0 && !_detailsKey.currentState!.validate()) return;
    if (_step == 1 && !_locationKey.currentState!.validate()) return;
    setState(() => _step += 1);
  }

  void _back() {
    if (_step == 0) {
      Navigator.pop(context);
    } else {
      setState(() => _step -= 1);
    }
  }

  @override
  void dispose() {
    for (final controller in [
      _title,
      _description,
      _price,
      _address,
      _state,
      _lga,
      _bedrooms,
      _bathrooms,
    ]) {
      controller.removeListener(_saveDraft);
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final listing = await widget.api.createListing({
        'title': _title.text.trim(),
        'description': _description.text.trim(),
        'price': _price.text.trim(),
        'address': _address.text.trim(),
        'state': _state.text.trim(),
        'lga': _lga.text.trim(),
        'is_agent_listing': _isAgent,
        if (_bedrooms.text.trim().isNotEmpty)
          'bedrooms': int.tryParse(_bedrooms.text.trim()),
        if (_bathrooms.text.trim().isNotEmpty)
          'bathrooms': int.tryParse(_bathrooms.text.trim()),
        if (_propertyType != null) 'property_type': _propertyType,
      });

      final listingId = listing['id'] as String;
      for (var index = 0; index < _media.length; index++) {
        final item = _media[index];
        final signature = await widget.api.mediaSignature();
        final uploaded = await widget.api.uploadToCloudinary(
          bytes: item.bytes,
          filename: item.name,
          signature: signature,
          resourceType: item.type == 'image'
              ? 'image'
              : item.type == 'video'
                  ? 'video'
                  : 'raw',
        );
        await widget.api.attachMedia(
          listingId,
          publicId: uploaded['public_id'] as String,
          url: uploaded['secure_url'] as String,
          altText: _title.text.trim(),
          mediaType: item.type,
          position: index,
        );
      }

      await widget.cache.clearDraft(_draftId);
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Post a listing')),
        body: SafeArea(
          child: Column(
            children: [
              LinearProgressIndicator(value: (_step + 1) / 3),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Row(
                  children: [
                    Text(
                      'Step ${_step + 1} of 3',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const Spacer(),
                    Text(
                      ['Details', 'Location', 'Media'][_step],
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: IndexedStack(
                    index: _step,
                    children: [
                      _detailsStep(),
                      _locationStep(),
                      _mediaStep(),
                    ],
                  ),
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _busy ? null : _back,
                        child: Text(_step == 0 ? 'Cancel' : 'Back'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _busy
                            ? null
                            : _step == 2
                                ? _submit
                                : _next,
                        child: Text(
                          _busy
                              ? 'Posting'
                              : _step == 2
                                  ? 'Post listing'
                                  : 'Continue',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  Widget _detailsStep() => Form(
        key: _detailsKey,
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
              decoration: const InputDecoration(
                labelText: 'Monthly rent',
                prefixText: 'N ',
              ),
              validator: (value) {
                final price = double.tryParse(value ?? '');
                return price == null || price <= 0
                    ? 'Enter a valid monthly rent'
                    : null;
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _propertyType,
              decoration: const InputDecoration(labelText: 'Property type'),
              items: _propertyTypes
                  .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                  .toList(),
              onChanged: (value) {
                setState(() => _propertyType = value);
                _saveDraft();
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _bedrooms,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Bedrooms'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _bathrooms,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Bathrooms'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Post as an agent'),
              subtitle: const Text('Shown with an Agent badge on your listing'),
              value: _isAgent,
              onChanged: (value) {
                setState(() => _isAgent = value);
                _saveDraft();
              },
            ),
          ],
        ),
      );

  Widget _locationStep() => Form(
        key: _locationKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Enter a state'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _lga,
              decoration: const InputDecoration(labelText: 'LGA or area'),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Enter an area'
                  : null,
            ),
          ],
        ),
      );

  Widget _mediaStep() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Photos, video, and documents',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'The first photo becomes the cover image.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _pickImages,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Photos'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _pickVideo,
                  icon: const Icon(Icons.videocam_outlined),
                  label: const Text('Video'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _pickDocument,
                  icon: const Icon(Icons.description_outlined),
                  label: const Text('Docs'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_media.isEmpty)
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(child: Text('No media added yet')),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 1.1,
              ),
              itemCount: _media.length,
              itemBuilder: (context, index) {
                final item = _media[index];
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: item.type == 'image'
                          ? Image.memory(item.bytes, fit: BoxFit.cover)
                          : Container(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    item.type == 'video'
                                        ? Icons.play_circle_outline
                                        : Icons.description_outlined,
                                    size: 40,
                                  ),
                                  const SizedBox(height: 8),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8),
                                    child: Text(
                                      item.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: IconButton.filledTonal(
                        visualDensity: VisualDensity.compact,
                        onPressed: _busy ? null : () => _removeMedia(index),
                        icon: const Icon(Icons.close, size: 18),
                      ),
                    ),
                    if (index == 0)
                      Positioned(
                        left: 4,
                        bottom: 4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Cover',
                            style: TextStyle(color: Colors.white, fontSize: 10),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
        ],
      );
}
