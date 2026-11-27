import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../theme.dart';
import '../widgets/empty_state.dart';
import 'messages_screen.dart';

class NotificationsScreen extends StatefulWidget {
  final ApiClient api;

  const NotificationsScreen({super.key, required this.api});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;

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
      final conversations = await widget.api.conversations();
      conversations.sort((a, b) {
        final aTime = DateTime.tryParse(a['last_message_at'] as String? ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final bTime = DateTime.tryParse(b['last_message_at'] as String? ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return bTime.compareTo(aTime);
      });
      if (mounted) setState(() => _items = conversations);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int _unread(Map<String, dynamic> item) {
    final value = item['unread_count'] ?? item['unread'] ?? 0;
    return value is num ? value.toInt() : 0;
  }

  String _title(Map<String, dynamic> item) {
    final other = item['other_user'];
    if (other is Map) {
      final name = other['name'] as String?;
      if (name != null && name.isNotEmpty) return name;
    }
    return item['listing_title'] as String? ??
        item['title'] as String? ??
        'Conversation';
  }

  String _subtitle(Map<String, dynamic> item) {
    final last = item['last_message'];
    if (last is Map) {
      final body = last['body'] as String?;
      if (body != null && body.isNotEmpty) return body;
    }
    return item['last_message_body'] as String? ?? 'Open conversation';
  }

  String _time(Map<String, dynamic> item) {
    final raw = item['last_message_at'] as String?;
    final time = raw == null ? null : DateTime.tryParse(raw)?.toLocal();
    if (time == null) return '';
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${time.day}/${time.month}';
  }

  Future<void> _open(Map<String, dynamic> item) async {
    final id = item['id'] as String?;
    if (id == null) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(api: widget.api, conversationId: id),
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      Text('Could not load notifications.', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  )
                : _items.isEmpty
                    ? const EmptyState(
                        icon: Icons.notifications_none,
                        title: 'No notifications yet',
                        message: 'Messages and listing activity will appear here.',
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => Divider(
                          height: 1,
                          color: dark ? Colors.white12 : Colors.black12,
                        ),
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          final unread = _unread(item);
                          return ListTile(
                            onTap: () => _open(item),
                            leading: CircleAvatar(
                              backgroundColor: UnaColors.green100,
                              child: Icon(
                                unread > 0 ? Icons.mark_chat_unread_outlined : Icons.chat_bubble_outline,
                                color: UnaColors.green900,
                              ),
                            ),
                            title: Text(
                              _title(item),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w500),
                            ),
                            subtitle: Text(
                              _subtitle(item),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  _time(item),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: dark ? Colors.white54 : Colors.black54,
                                  ),
                                ),
                                if (unread > 0) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: UnaColors.green700,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$unread',
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
