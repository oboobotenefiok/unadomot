import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
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
      final listings = await widget.api.myListings();
      if (mounted) {
        setState(() {
          _profile = profile;
          _listings = listings;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
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

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit profile'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
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
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );

    if (saved != true) return;
    try {
      await widget.api.updateProfile(
        name: nameController.text.trim(),
        phone: phoneController.text.trim(),
        bio: bioController.text.trim(),
      );
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? const Color(0xFF0B1510) : const Color(0xFFF0FDF4);

    if (!widget.appState.signedIn) {
      return Scaffold(
        appBar: widget.showAppBar ? AppBar(title: const Text('Profile')) : null,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person_outline, size: 64, color: UnaColors.green700),
                const SizedBox(height: 16),
                const Text(
                  'Sign in to manage your listings, favorites and verification.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => requireAuth(context, widget.appState),
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
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
                    children: [Text(_error!), const SizedBox(height: 12), FilledButton(onPressed: _load, child: const Text('Retry'))],
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
    if (_listings.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 48),
        alignment: Alignment.center,
        child: Column(
          children: [
            const Icon(Icons.home_work_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 10),
            Text('No listings yet', style: TextStyle(color: dark ? Colors.white60 : Colors.black54)),
          ],
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _listings.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemBuilder: (context, index) {
        final listing = _listings[index];
        final deleted = listing['status'] == 'deleted';
        return InkWell(
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
          child: Container(
            decoration: BoxDecoration(
              color: dark ? const Color(0xFF122019) : Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (listing['image_url'] != null)
                        Image.network(listing['image_url'] as String, fit: BoxFit.cover)
                      else
                        Container(color: dark ? Colors.white10 : Colors.black12, child: const Icon(Icons.home, size: 40)),
                      Positioned(
                        left: 6,
                        bottom: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          color: const Color(0xFF052E16),
                          child: Text(
                            'N${(listing['price'] as num?)?.toStringAsFixed(0) ?? '0'}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                          ),
                        ),
                      ),
                      if (deleted)
                        Container(
                          color: Colors.black54,
                          alignment: Alignment.center,
                          child: const Text('Deleted', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing['title'] as String? ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        listing['address'] as String? ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 11, color: dark ? Colors.white60 : Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _settingsTab(bool dark) => Container(
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
            _settingsRow(Icons.favorite_border, 'Favorites', () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => FavoritesScreen(api: widget.api, cache: widget.cache, appState: widget.appState)),
            )),
            _settingsRow(Icons.chat_bubble_outline, 'Messages', () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => MessagesScreen(api: widget.api)),
            )),
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

  Widget _settingsRow(IconData icon, String title, VoidCallback onTap, {bool danger = false}) => ListTile(
        leading: Icon(icon, color: danger ? Colors.red : const Color(0xFF15803D)),
        title: Text(title, style: TextStyle(color: danger ? Colors.red : null, fontWeight: FontWeight.w500)),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: onTap,
      );
}
