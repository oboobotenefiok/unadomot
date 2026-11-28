import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../api/api_client_listing_edit.dart';
import '../data/nigeria_locations.dart';

class EditListingScreen extends StatefulWidget {
  final ApiClient api;
  final Map<String, dynamic> listing;

  const EditListingScreen({
    super.key,
    required this.api,
    required this.listing,
  });

  @override
  State<EditListingScreen> createState() => _EditListingScreenState();
}

class _NewPhoto {
  final Uint8List bytes;
  final String name;

  const _NewPhoto({required this.bytes, required this.name});
}

class _EditListingScreenState extends State<EditListingScreen> {
  static const _types = ['Apartment', 'House', 'Self Contain', 'Room', 'Duplex'];
  static const _furnishing = ['Furnished', 'Semi-furnished', 'Unfurnished'];
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

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _description;
  late final TextEditingController _price;
  late final TextEditingController _address;
  late final TextEditingController _bedrooms;
  late final TextEditingController _bathrooms;
  late String? _state;
  late String? _lga;
  late String? _type;
  late String? _furnishingValue;
  late final Set<String> _amenities;
  List<String> _existingPhotos = [];
  final List<_NewPhoto> _newPhotos = [];
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final data = widget.listing;
    _title = TextEditingController(text: data['title'] as String? ?? '');
    _description = TextEditingController(text: data['description'] as String? ?? '');
    _price = TextEditingController(text: data['price']?.toString() ?? '');
    _address = TextEditingController(text: data['address'] as String? ?? '');
    _bedrooms = TextEditingController(text: data['bedrooms']?.toString() ?? '');
    _bathrooms = TextEditingController(text: data['bathrooms']?.toString() ?? '');
    _state = data['state'] as String?;
    _lga = data['lga'] as String?;
    _type = data['property_type'] as String?;
    _furnishingValue = data['furnishing'] as String?;
    _amenities = ((data['amenities'] as List?) ?? const [])
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty)
        .toSet();
    final image = data['image_url'] as String?;
    if (image != null) _existingPhotos = [image];
    _loadMedia();
  }

  Future<void> _loadMedia() async {
    try {
      final detail = await widget.api.detail(widget.listing['id'] as String);
      final media = (detail['media'] as List? ?? [])
          .whereType<Map>()
          .map((item) => item['url'] as String?)
          .whereType<String>()
          .toList();
      if (mounted && media.isNotEmpty) setState(() => _existingPhotos = media);
    } catch (_) {
      // Existing photos are optional if the detail request fails.
    }
  }

  @override
  void dispose() {
    for (final controller in [_title, _description, _price, _address, _bedrooms, _bathrooms]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickPhotos() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 85, maxWidth: 2000);
    if (picked.isEmpty) return;
    for (final file in picked) {
      _newPhotos.add(_NewPhoto(bytes: await file.readAsBytes(), name: file.name));
    }
    if (mounted) setState(() {});
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final listingId = widget.listing['id'] as String;
      await widget.api.updateListing(listingId, {
        'title': _title.text.trim(),
        'description': _description.text.trim(),
        'price': _price.text.trim(),
        'address': _address.text.trim(),
        'state': _state,
        'lga': _lga,
        'bedrooms': int.tryParse(_bedrooms.text.trim()),
        'bathrooms': int.tryParse(_bathrooms.text.trim()),
        'property_type': _type,
        'furnishing': _furnishingValue,
        'amenities': _amenities.toList(),
      });

      for (var index = 0; index < _newPhotos.length; index++) {
        final photo = _newPhotos[index];
        final signature = await widget.api.mediaSignature();
        final uploaded = await widget.api.uploadToCloudinary(
          bytes: photo.bytes,
          filename: photo.name,
          signature: signature,
        );
        await widget.api.attachMedia(
          listingId,
          publicId: uploaded['public_id'] as String,
          url: uploaded['secure_url'] as String,
          altText: _title.text.trim(),
          mediaType: 'image',
          position: _existingPhotos.length + index,
        );
      }

      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lgaOptions = NigeriaLocations.lgasFor(_state);
    final customAmenities =
        _amenities.where((item) => !_amenityOptions.contains(item)).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Edit listing')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Listing title'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a title' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Description'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter a description' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Monthly rent', prefixText: '₦ '),
              validator: (value) {
                final price = double.tryParse(value ?? '');
                return price == null || price <= 0 ? 'Enter a valid rent' : null;
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Property type'),
              items: _types.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
              onChanged: (value) => setState(() => _type = value),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _furnishingValue,
              decoration: const InputDecoration(labelText: 'Furnishing'),
              items: _furnishing.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
              onChanged: (value) => setState(() => _furnishingValue = value),
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
            const SizedBox(height: 20),
            const Text(
              'Amenities',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._amenityOptions.map((item) {
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
                    },
                  );
                }),
                ...customAmenities.map(
                  (item) => InputChip(
                    label: Text(item),
                    onDeleted: () => setState(() => _amenities.remove(item)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Address'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Enter an address' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _state,
              decoration: const InputDecoration(labelText: 'State'),
              items: NigeriaLocations.states
                  .map((state) => DropdownMenuItem(value: state, child: Text(state)))
                  .toList(),
              onChanged: (value) => setState(() {
                _state = value;
                _lga = NigeriaLocations.defaultLgaFor(value);
              }),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: ValueKey('lga-$_state'),
              initialValue: lgaOptions.contains(_lga) ? _lga : null,
              decoration: const InputDecoration(labelText: 'Area / LGA'),
              items: lgaOptions
                  .map((lga) => DropdownMenuItem(value: lga, child: Text(lga)))
                  .toList(),
              onChanged: (value) => setState(() => _lga = value),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Expanded(
                  child: Text('Photos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                TextButton.icon(
                  onPressed: _busy ? null : _pickPhotos,
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: const Text('Add'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_existingPhotos.isEmpty && _newPhotos.isEmpty)
              const Text('No photos yet. Add at least one before saving.', style: TextStyle(color: Colors.grey))
            else
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                children: [
                  ..._existingPhotos.map(
                    (url) => ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(url, fit: BoxFit.cover),
                    ),
                  ),
                  ..._newPhotos.map(
                    (photo) => Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(photo.bytes, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: IconButton.filledTonal(
                            visualDensity: VisualDensity.compact,
                            onPressed: _busy ? null : () => setState(() => _newPhotos.remove(photo)),
                            icon: const Icon(Icons.close, size: 18),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving...' : 'Save changes'),
            ),
          ],
        ),
      ),
    );
  }
}
