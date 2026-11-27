import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../api/api_client_profile.dart';
import '../app_settings.dart';
import '../data/local_cache.dart';
import '../models/listing.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/empty_state.dart';
import '../widgets/listing_card.dart';
import '../widgets/share_listing_sheet.dart';
import 'admin_screen.dart';
import 'auth_sheet.dart';
import 'favorites_screen.dart';
import 'listing_detail_screen.dart';
import 'messages_screen.dart';
import 'verification_screen.dart';

class ProfileScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;
  final bool showAppBar;

  const ProfileScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
    this.showAppBar = true,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _listings = [];
  bool _loading = true;
  String? _error;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!widget.appState.signedIn) {
      setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final profile = await widget.api.myProfile();
      if (mounted) setState(() => _profile = profile);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }

    try {
      final listings = await widget.api.myListings();
      if (mounted) setState(() => _listings = listings);
    } catch (_) {
      // The profile still renders when the listings request fails.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final profile = _profile;
    if (profile == null) return;
    final nameController = TextEditingController(text: profile['name'] as String? ?? '');
    final phoneController = TextEditingController(text: profile['phone'] as String? ?? '');
    final bioController = TextEditingController(text: profile['bio'] as String? ?? '');
    var photoUrl = profile['photo_url'] as String?;
    var uploading = false;

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit profile'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: UnaColors.green100,
                      backgroundImage: photoUrl == null ? null : NetworkImage(photoUrl!),
                      child: photoUrl == null
                          ? const Icon(Icons.person, color: UnaColors.green900)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    TextButton.icon(
                      onPressed: uploading
                          ? null
                          : () async {
                              final picked = await ImagePicker().pickImage(
                                source: ImageSource.gallery,
                                imageQuality: 82,
                                maxWidth: 1200,
                              );
                              if (picked == null) return;
                              setDialogState(() => uploading = true);
                              try {
                                final bytes = await picked.readAsBytes();
                                final signature = await widget.api.mediaSignature(
                                  folder: 'unadomot/avatars',
                                );
                                final uploaded = await widget.api.uploadToCloudinary(
                                  bytes: bytes,
                                  filename: picked.name,
                                  signature: signature,
                                );
                                photoUrl = uploaded['secure_url'] as String?;
                              } catch (error) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(error.toString())),
                                  );
                                }
                              } finally {
                                setDialogState(() => uploading = false);
                              }
                            },
                      icon: uploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.photo_camera_outlined),
                      label: Text(uploading ? 'Uploading...' : 'Change photo'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Display name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone (optional)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: bioController,
                  maxLines: 4,
                  maxLength: 500,
                  decoration: const InputDecoration(labelText: 'Bio (optional)'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: uploading ? null : () => Navigator.pop(context, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (saved != true) return;
    try {
      await widget.api.updateProfile(
        name: nameController.text.trim(),
        phone: phoneController.text.trim(),
        bio: bioController.text.trim(),
        photoUrl: photoUrl,
      );
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  Future<void> _deleteListing(Map<String, dynamic> listing) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete listing?'),
        content: Text('Remove “${listing['title']}” from public view?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.api.deleteListing(listing['id'] as String);
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  Future<void> _shareListing(Map<String, dynamic> listing) async {
    await showShareListingSheet(context, _listingFromMap(listing));
  }

  Listing _listingFromMap(Map<String, dynamic> json) => Listing(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String? ?? '',
        price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
        address: json['address'] as String? ?? '',
        state: json['state'] as String? ?? '',
        lga: json['lga'] as String? ?? '',
        isAgentListing: json['is_agent_listing'] as bool? ?? false,
        status: json['status'] as String? ?? 'available',
        media: const [],
        bedrooms: json['bedrooms'] as int?,
        bathrooms: json['bathrooms'] as int?,
        propertyType: json['property_type'] as String?,
        furnishing: json['furnishing'] as String?,
        code: json['code'] as String?,
        landlordName: json['landlord_name'] as String? ?? '',
      );

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? const Color(0xFF0B1510) : const Color(0xFFF0FDF4);

    if (!widget.appState.signedIn) {
      return Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Profile')) : null,
        body: EmptyState(
          icon: Icons.person_outline,
          title: 'Sign in to manage your profile',
          message: 'Manage your listings, favorites and verification.',
          actionLabel: 'Sign in',
          onAction: () => requireAuth(context, widget.appState),
        ),
      );
    }

    return Scaffold(
      backgroundColor: background,
      appBar: widget.showAppBar ? AppBar(title: const Text('Profile')) : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      Text('Could not load your profile.', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    children: [
                      _header(dark),
                      const SizedBox(height: 20),
                      _tabs(dark),
                      const SizedBox(height: 16),
                      if (_tab == 0) _listingsTab(dark) else _settingsTab(dark),
                    ],
                  ),
      ),
    );
  }

  Widget _header(bool dark) {
    final profile = _profile ?? const <String, dynamic>{};
    final name = profile['name'] as String? ?? 'User';
    final username = profile['username'] as String? ?? 'username-not-set';
    final userType = profile['user_type'] as String? ?? 'renter';
    final verified = profile['verified'] as bool? ?? false;
    final photoUrl = profile['photo_url'] as String?;
    final badge = userType == 'agent'
        ? 'Agent'
        : userType == 'landlord' || userType == 'agency'
            ? 'Landlord'
            : null;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF122019) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: UnaColors.green100,
                backgroundImage: photoUrl == null ? null : NetworkImage(photoUrl),
                child: photoUrl == null
                    ? Text(
                        name.characters.first.toUpperCase(),
                        style: const TextStyle(
                          color: UnaColors.green900,
                          fontWeight: FontWeight.w700,
                          fontSize: 22,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text('@$username', style: TextStyle(color: dark ? Colors.white60 : Colors.black54, fontSize: 13)),
                        if (badge != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: badge == 'Agent' ? const Color(0xFF374151) : const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: badge == 'Agent' ? const Color(0xFF1F2937) : const Color(0xFFBBF7D0)),
                            ),
                            child: Text(
                              badge,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: badge == 'Agent' ? Colors.white : const Color(0xFF15803D),
                              ),
                            ),
                          ),
                        ],
                        if (verified) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.verified, size: 16, color: Color(0xFF16A34A)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: _edit,
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('Edit'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF15803D),
                  side: const BorderSide(color: Color(0xFFBBF7D0)),
                  backgroundColor: dark ? const Color(0xFF0F2A1C) : const Color(0xFFF0FDF4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.mail_outline, size: 18, color: dark ? Colors.white54 : Colors.black54),
              const SizedBox(width: 8),
              Expanded(child: Text(profile['email'] as String? ?? '')),
            ],
          ),
          if ((profile['phone'] as String?)?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.phone_outlined, size: 18, color: dark ? Colors.white54 : Colors.black54),
                const SizedBox(width: 8),
                Text(profile['phone'] as String),
              ],
            ),
          ],
          if ((profile['bio'] as String?)?.isNotEmpty == true) ...[
            const SizedBox(height: 14),
            Divider(color: dark ? Colors.white12 : Colors.black12),
            const SizedBox(height: 10),
            Text(profile['bio'] as String, style: const TextStyle(height: 1.4)),
          ],
        ],
      ),
    );
  }

  Widget _tabs(bool dark) => Container(
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: dark ? Colors.white12 : Colors.black12)),
        ),
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _tab = 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: _tab == 0 ? const Color(0xFF052E16) : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Icon(Icons.menu, color: _tab == 0 ? (dark ? Colors.white : const Color(0xFF052E16)) : Colors.grey),
                ),
              ),
            ),
            Container(width: 1, height: 24, color: dark ? Colors.white12 : Colors.black12),
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _tab = 1),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: _tab == 1 ? const Color(0xFF052E16) : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Icon(Icons.info_outline, color: _tab == 1 ? (dark ? Colors.white : const Color(0xFF052E16)) : Colors.grey),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _listingsTab(bool dark) {
    final active = _listings.where((item) => item['status'] != 'deleted').toList();
    final removed = _listings.where((item) => item['status'] == 'deleted').toList();

    if (_listings.isEmpty) {
      return const EmptyState(
        icon: Icons.home_work_outlined,
        title: 'No listings yet',
        message: 'Post your first property to start receiving enquiries.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (active.isNotEmpty) ...[
          const Text('Active Listings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _listingGrid(active, dark),
        ],
        if (removed.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Text('Removed Listings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.grey)),
          const SizedBox(height: 10),
          _listingGrid(removed, dark),
        ],
      ],
    );
  }

  Widget _listingGrid(List<Map<String, dynamic>> listings, bool dark) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: listings.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.62,
        ),
        itemBuilder: (context, index) {
          final listing = listings[index];
          final deleted = listing['status'] == 'deleted';
          return ListingCard(
            listing: _listingFromMap(listing),
            imageUrl: listing['image_url'] as String?,
            isOwner: true,
            showOwnerActions: true,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ListingDetailScreen(
                  api: widget.api,
                  cache: widget.cache,
                  appState: widget.appState,
                  listingId: listing['id'] as String,
                ),
              ),
            ),
            onShare: () => _shareListing(listing),
            onDelete: deleted ? null : () => _deleteListing(listing),
          );
        },
      );

  Widget _settingsTab(bool dark) {
    final isAdmin = _profile?['is_admin'] == true;
    return Container(
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF122019) : Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          _settingsRow(Icons.verified_outlined, 'Get Verified', () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => VerificationScreen(api: widget.api)),
          )),
          if (isAdmin)
            _settingsRow(Icons.admin_panel_settings_outlined, 'Admin', () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => AdminScreen(api: widget.api)),
            )),
          _settingsRow(Icons.favorite_border, 'Favorites', () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => FavoritesScreen(api: widget.api, cache: widget.cache, appState: widget.appState)),
          )),
          _settingsRow(Icons.chat_bubble_outline, 'Messages', () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => MessagesScreen(api: widget.api)),
          )),
          ValueListenableBuilder<bool>(
            valueListenable: appHighContrast,
            builder: (context, enabled, _) => ListTile(
              leading: const Icon(Icons.contrast, color: Color(0xFF15803D)),
              title: const Text('High contrast', style: TextStyle(fontWeight: FontWeight.w500)),
              subtitle: const Text('Stronger borders and bolder text'),
              trailing: Switch(
                value: enabled,
                onChanged: (value) async {
                  appHighContrast.value = value;
                  await widget.cache.setSetting('high_contrast', value.toString());
                },
              ),
            ),
          ),
          ValueListenableBuilder<bool>(
            valueListenable: appLargeText,
            builder: (context, enabled, _) => ListTile(
              leading: const Icon(Icons.format_size, color: Color(0xFF15803D)),
              title: const Text('Larger text', style: TextStyle(fontWeight: FontWeight.w500)),
              subtitle: const Text('Increase text size across the app'),
              trailing: Switch(
                value: enabled,
                onChanged: (value) async {
                  appLargeText.value = value;
                  await widget.cache.setSetting('large_text', value.toString());
                },
              ),
            ),
          ),
          _settingsRow(Icons.info_outline, 'About UnaDomot', () => showAboutDialog(
            context: context,
            applicationName: 'UnaDomot',
            applicationVersion: '1.0.0',
            applicationLegalese: 'Find your next home in Nigeria.',
          )),
          _settingsRow(Icons.shield_outlined, 'Privacy & Terms', () => showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Privacy & Terms'),
              content: const Text('Your account details are used only to operate UnaDomot. Listing and chat data are stored securely.'),
              actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
            ),
          )),
          _settingsRow(Icons.logout, 'Logout', () async {
            await widget.appState.signOut();
            if (mounted) setState(() {});
          }, danger: true),
        ],
      ),
    );
  }

  Widget _settingsRow(IconData icon, String title, VoidCallback onTap, {bool danger = false}) => ListTile(
        leading: Icon(icon, color: danger ? Colors.red : const Color(0xFF15803D)),
        title: Text(title, style: TextStyle(color: danger ? Colors.red : null, fontWeight: FontWeight.w500)),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: onTap,
      );
}
