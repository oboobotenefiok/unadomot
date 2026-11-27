import 'package:flutter/material.dart';
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

class _EditListingScreenState extends State<EditListingScreen> {
  static const _types = ['Apartment', 'House', 'Self Contain', 'Room', 'Duplex'];
  static const _furnishing = ['Furnished', 'Semi-furnished', 'Unfurnished'];

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
  }

  @override
  void dispose() {
    for (final controller in [_title, _description, _price, _address, _bedrooms, _bathrooms]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.updateListing(widget.listing['id'] as String, {
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
      });
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
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
                decoration: const InputDecoration(labelText: 'Monthly rent', prefixText: 'N '),
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
                  _lga = NigeriaLocations.capitalFor(value ?? '');
                }),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _lga,
                decoration: const InputDecoration(labelText: 'Area / LGA'),
                items: [
                  if (_lga != null) DropdownMenuItem(value: _lga, child: Text(_lga!)),
                ],
                onChanged: (value) => setState(() => _lga = value),
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
