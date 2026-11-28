import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../data/nigeria_locations.dart';
import '../utils/currency.dart';

class CreateListingScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final bool showAppBar;
  final VoidCallback? onExit;

  const CreateListingScreen({
    super.key,
    required this.api,
    required this.cache,
    this.showAppBar = true,
    this.onExit,
  });

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _MediaItem {
  final Uint8List bytes;
  final String name;

  const _MediaItem({required this.bytes, required this.name});
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  static const _draftId = 'new-listing';
  final _detailsKey = GlobalKey<FormState>();
  final _locationKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _address = TextEditingController();
  final _bedrooms = TextEditingController();
  final _bathrooms = TextEditingController();
  String? _stateValue = 'Rivers';
  String? _lgaValue = 'Port Harcourt';
  String? _propertyType;
  String? _furnishing;
  final Set<String> _amenities = {};
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

  static const _furnishingOptions = [
    'Furnished',
    'Semi-furnished',
    'Unfurnished',
  ];

  static const _amenityOptions = [
    'Parking',
    'Security',
    'Water',
    'Generator',
    'Air conditioning',
    'Balcony',
    'Kitchen',
    'Internet',
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
      _stateValue = draft['state'] as String? ?? 'Rivers';
      _lgaValue = draft['lga'] as String? ?? NigeriaLocations.capitalFor(_stateValue!);
      _bedrooms.text = draft['bedrooms'] as String? ?? '';
      _bathrooms.text = draft['bathrooms'] as String? ?? '';
      _propertyType = draft['property_type'] as String?;
      _furnishing = draft['furnishing'] as String?;
      _amenities
        ..clear()
        ..addAll((draft['amenities'] as List? ?? const []).map((e) => e.toString()));
      _isAgent = draft['is_agent_listing'] as bool? ?? false;
    });
  }

  void _saveDraft() {
    widget.cache.saveDraft(_draftId, {
      'title': _title.text,
      'description': _description.text,
      'price': _price.text,
      'address': _address.text,
      'state': _stateValue,
      'lga': _lgaValue,
      'bedrooms': _bedrooms.text,
      'bathrooms': _bathrooms.text,
      'property_type': _propertyType,
      'furnishing': _furnishing,
      'amenities': _amenities.toList(),
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
      _media.add(_MediaItem(bytes: bytes, name: file.name));
    }
    if (mounted) setState(() {});
  }

  void _removeMedia(int index) {
    setState(() => _media.removeAt(index));
  }

  void _reorderMedia(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = _media.removeAt(oldIndex);
      _media.insert(newIndex, item);
    });
  }

  void _next() {
    if (_step == 0 && !_detailsKey.currentState!.validate()) return;
    if (_step == 1 && !_locationKey.currentState!.validate()) return;
    if (_step == 2 && _media.isEmpty) {
      setState(() => _error = 'Add at least one photo before continuing.');
      return;
    }
    setState(() {
      _error = null;
      _step += 1;
    });
  }

  void _back() {
    if (_step == 0) {
      if (widget.onExit != null) {
        widget.onExit!();
      } else {
        Navigator.pop(context);
      }
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
      _bedrooms,
      _bathrooms,
    ]) {
      controller.removeListener(_saveDraft);
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (_media.isEmpty) {
      setState(() => _error = 'Add at least one photo before posting.');
      return;
    }
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
        'state': _stateValue,
        'lga': _lgaValue,
        'is_agent_listing': _isAgent,
        'bedrooms': int.tryParse(_bedrooms.text.trim()),
        'bathrooms': int.tryParse(_bathrooms.text.trim()),
        'property_type': _propertyType,
        'furnishing': _furnishing,
        'amenities': _amenities.toList(),
      });

      final listingId = listing['id'] as String;
      for (var index = 0; index < _media.length; index++) {
        final item = _media[index];
        final signature = await widget.api.mediaSignature(purpose: 'listing');
        final uploaded = await widget.api.uploadToCloudinary(
          bytes: item.bytes,
          filename: item.name,
          signature: signature,
        );
        await widget.api.attachMedia(
          listingId,
          publicId: uploaded['public_id'] as String,
          url: uploaded['secure_url'] as String,
          altText: _title.text.trim(),
          mediaType: 'image',
          position: index,
        );
      }

      await widget.cache.clearDraft(_draftId);
      if (mounted) {
        if (widget.onExit != null) {
          widget.onExit!();
        } else {
          Navigator.pop(context, true);
        }
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Post a listing')) : null,
        body: SafeArea(
          child: Column(
            children: [
              LinearProgressIndicator(value: (_step + 1) / 4),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Row(
                  children: [
                    Text(
                      'Step ${_step + 1} of 4',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const Spacer(),
                    Text(
                      ['Details', 'Location', 'Media', 'Review'][_step],
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
                      _reviewStep(),
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
                            : _step == 3
                                ? _submit
                                : _next,
                        child: Text(
                          _busy
                              ? 'Posting'
                              : _step == 3
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
                prefixText: '₦ ',
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
              validator: (value) => value == null ? 'Select a property type' : null,
              onChanged: (value) {
                setState(() => _propertyType = value);
                _saveDraft();
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _furnishing,
              decoration: const InputDecoration(labelText: 'Furnishing'),
              items: _furnishingOptions
                  .map((item) => DropdownMenuItem(value: item, child: Text(item)))
                  .toList(),
              onChanged: (value) {
                setState(() => _furnishing = value);
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
                    validator: (value) {
                      final count = int.tryParse(value ?? '');
                      return count == null || count < 1 ? 'Required' : null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _bathrooms,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Bathrooms'),
                    validator: (value) {
                      final count = int.tryParse(value ?? '');
                      return count == null || count < 1 ? 'Required' : null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text('Amenities', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _amenityOptions.map((item) {
                final selected = _amenities.contains(item);
                return FilterChip(
                  label: Text(item),
                  selected: selected,
                  onSelected: (value) {
                    setState(() {
                      if (value) {
                        _amenities.add(item);
                      } else {
                        _amenities.remove(item);
                      }
                    });
                    _saveDraft();
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            Text('List as', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(
                  value: false,
                  label: Text('Landlord'),
                  icon: Icon(Icons.home_outlined),
                ),
                ButtonSegment(
                  value: true,
                  label: Text('Agent'),
                  icon: Icon(Icons.badge_outlined),
                ),
              ],
              selected: {_isAgent},
              onSelectionChanged: (selection) {
                setState(() => _isAgent = selection.first);
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
            DropdownButtonFormField<String>(
              initialValue: _stateValue,
              decoration: const InputDecoration(labelText: 'State'),
              items: NigeriaLocations.states
                  .map((state) => DropdownMenuItem(value: state, child: Text(state)))
                  .toList(),
              validator: (value) => value == null ? 'Select a state' : null,
              onChanged: (value) {
                setState(() {
                  _stateValue = value;
                  _lgaValue = NigeriaLocations.capitalFor(value ?? '');
                });
                _saveDraft();
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _lgaValue,
              decoration: const InputDecoration(labelText: 'Capital / LGA'),
              items: [
                if (_stateValue != null)
                  DropdownMenuItem(
                    value: NigeriaLocations.capitalFor(_stateValue!),
                    child: Text(NigeriaLocations.capitalFor(_stateValue!)),
                  ),
              ],
              validator: (value) => value == null ? 'Select an area' : null,
              onChanged: (value) => setState(() => _lgaValue = value),
            ),
          ],
        ),
      );

  Widget _mediaStep() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Photos',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'At least one photo is required. Drag to reorder; the first item becomes the cover.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _busy ? null : _pickImages,
            icon: const Icon(Icons.photo_library_outlined),
            label: const Text('Add photos'),
          ),
          const SizedBox(height: 16),
          if (_media.isEmpty)
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(child: Text('No photos added yet')),
            )
          else
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              buildDefaultDragHandles: false,
              itemCount: _media.length,
              onReorder: _reorderMedia,
              itemBuilder: (context, index) {
                final item = _media[index];
                return Container(
                  key: ObjectKey(item),
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: SizedBox(
                          width: 64,
                          height: 64,
                          child: Image.memory(item.bytes, fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                            ),
                            if (index == 0)
                              const Text(
                                'Cover image',
                                style: TextStyle(fontSize: 10, color: Colors.green),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _busy ? null : () => _removeMedia(index),
                        icon: const Icon(Icons.close, size: 18),
                      ),
                      ReorderableDragStartListener(
                        index: index,
                        child: const Padding(
                          padding: EdgeInsets.all(8),
                          child: Icon(Icons.drag_handle),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      );

  Widget _reviewStep() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Review your listing',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Check the details before posting. You can go back to edit anything.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          _reviewCard(
            title: _title.text.trim().isEmpty ? 'Untitled listing' : _title.text.trim(),
            subtitle: '${formatNaira(double.tryParse(_price.text.trim()) ?? 0)} / month',
            lines: [
              '${_propertyType ?? 'Property type not set'} · ${_bedrooms.text} bed · ${_bathrooms.text} bath',
              '${_address.text.trim()}, ${_lgaValue ?? ''}, ${_stateValue ?? ''}',
              _furnishing == null ? 'Furnishing not set' : _furnishing!,
              _isAgent ? 'Listed as an agent' : 'Listed as a landlord',
            ],
          ),
          if (_amenities.isNotEmpty) ...[
            const SizedBox(height: 12),
            _reviewCard(
              title: 'Amenities',
              subtitle: '',
              lines: [_amenities.join(', ')],
            ),
          ],
          const SizedBox(height: 12),
          _reviewCard(
            title: 'Photos',
            subtitle: '${_media.length} photo${_media.length == 1 ? '' : 's'}',
            lines: [
              if (_media.isNotEmpty) 'Cover: ${_media.first.name}',
              'At least one photo is required.',
            ],
          ),
          const SizedBox(height: 12),
          _reviewCard(
            title: 'Description',
            subtitle: '',
            lines: [_description.text.trim().isEmpty ? 'No description' : _description.text.trim()],
          ),
        ],
      );

  Widget _reviewCard({
    required String title,
    required String subtitle,
    required List<String> lines,
  }) =>
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 12)),
            ],
            const SizedBox(height: 8),
            ...lines.map(
              (line) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(line, style: const TextStyle(fontSize: 12, height: 1.4)),
              ),
            ),
          ],
        ),
      );
}
