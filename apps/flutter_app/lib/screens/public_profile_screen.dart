import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import 'listing_detail_screen.dart';

class PublicProfileScreen extends StatefulWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;
  final String username;

  const PublicProfileScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
    required this.username,
  });

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await widget.api.publicProfile(widget.username);
      final listings = (profile['listings'] as List?)
              ?.whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList() ??
          const <Map<String, dynamic>>[];
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

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background = dark ? const Color(0xFF0B1510) : const Color(0xFFF0FDF4);

    if (_loading) {
      return Scaffold(
        backgroundColor: background,
        appBar: AppBar(title: Text('@${widget.username}')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _profile == null) {
      return Scaffold(
        backgroundColor: background,
        appBar: AppBar(title: Text('@${widget.username}')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person_off_outlined, size: 64, color: Colors.grey),
                const SizedBox(height: 12),
                const Text('User not found', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(_error ?? 'This profile could not be loaded.', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Go back')),
              ],
            ),
          ),
        ),
      );
    }

    final profile = _profile!;
    final name = profile['name'] as String? ?? 'User';
    final username = profile['username'] as String? ?? widget.username;
    final userType = profile['user_type'] as String? ?? 'renter';
    final verified = profile['verified'] as bool? ?? false;
    final bio = profile['bio'] as String?;
    final replyRate = (profile['reply_rate'] as num?)?.toInt() ?? 98;
    final isLandlord = userType == 'landlord' || userType == 'agency';
    final isAgent = userType == 'agent';
    final lastActive = DateTime.tryParse(profile['last_active'] as String? ?? '')?.toLocal();
    final isOnline = lastActive != null &&
        DateTime.now().difference(lastActive).inMinutes < 5;
    final presence = isOnline
        ? 'Active now'
        : lastActive == null
            ? 'Offline'
            : 'Last active ${_relative(lastActive)}';

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(title: Text('@$username')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            Container(
              decoration: BoxDecoration(
                color: dark ? const Color(0xFF122019) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 120,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF166534), Color(0xFF22C55E)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                    ),
                  ),
                  Transform.translate(
                    offset: const Offset(0, -44),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            width: 88,
                            height: 88,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFBBF7D0),
                              border: Border.all(color: dark ? const Color(0xFF122019) : Colors.white, width: 4),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : 'U',
                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: Color(0xFF166534)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text('@$username', style: TextStyle(color: dark ? Colors.white60 : Colors.black54, fontSize: 13)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isOnline ? const Color(0xFF22C55E) : Colors.grey,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              presence,
                              style: TextStyle(
                                fontSize: 12,
                                color: isOnline ? const Color(0xFF15803D) : Colors.grey,
                                fontWeight: isOnline ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          children: [
                            if (isLandlord)
                              _badge('Landlord', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                            if (isAgent)
                              _badge('Agent', const Color(0xFF374151), Colors.white),
                            if (verified)
                              _badge('Verified', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(Icons.home_outlined, size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text('${_listings.length} active listing${_listings.length == 1 ? '' : 's'}', style: const TextStyle(fontSize: 12)),
                            const SizedBox(width: 16),
                            const Icon(Icons.schedule, size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text('$replyRate% response rate', style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                        if (bio != null && bio.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Divider(color: dark ? Colors.white12 : Colors.black12),
                          const SizedBox(height: 10),
                          Text(bio, style: const TextStyle(height: 1.4)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: dark ? Colors.white12 : Colors.black12)),
              ),
              child: Row(
                children: [
                  _tabButton('Listings (${_listings.length})', 0),
                  const SizedBox(width: 24),
                  _tabButton('About', 1),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_tab == 0)
              _listings.isEmpty
                  ? Container(
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      alignment: Alignment.center,
                      child: const Column(
                        children: [
                          Icon(Icons.home_work_outlined, size: 48, color: Colors.grey),
                          SizedBox(height: 10),
                          Text('No active listings at the moment.'),
                        ],
                      ),
                    )
                  : GridView.builder(
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
                    )
            else
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: dark ? const Color(0xFF122019) : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Verification Status', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 10),
                    _aboutRow('Landlord', isLandlord),
                    const SizedBox(height: 8),
                    _aboutRow('Agent', isAgent),
                    const SizedBox(height: 18),
                    const Text('Member Since', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(_memberSince(profile['created_at'] as String?)),
                    const SizedBox(height: 18),
                    const Text('Response Stats', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('$replyRate% response rate'),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _tabButton(String label, int index) => InkWell(
        onTap: () => setState(() => _tab = index),
        child: Container(
          padding: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: _tab == index ? const Color(0xFF052E16) : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: _tab == index ? null : Colors.grey,
            ),
          ),
        ),
      );

  Widget _badge(String label, Color background, Color foreground) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
        child: Text(label, style: TextStyle(color: foreground, fontSize: 12, fontWeight: FontWeight.w600)),
      );

  Widget _aboutRow(String label, bool verified) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: verified ? const Color(0xFFDCFCE7) : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              verified ? 'Verified' : 'Not Verified',
              style: TextStyle(
                fontSize: 11,
                color: verified ? const Color(0xFF15803D) : Colors.grey,
              ),
            ),
          ),
        ],
      );

  String _relative(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${time.day}/${time.month};
  }

  String _memberSince(String? value) {
    if (value == null) return 'Recently';
    try {
      final date = DateTime.parse(value);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return '${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return 'Recently';
    }
  }
}
