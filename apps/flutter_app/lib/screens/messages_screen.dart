import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../api/api_client.dart';
import '../theme.dart';
import '../widgets/skeletons.dart';

export 'chat_screen.dart';

class MessagesScreen extends StatefulWidget {
  final ApiClient api;
  final bool showAppBar;

  const MessagesScreen({super.key, required this.api, this.showAppBar = true});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Map<String, dynamic>> _conversations = [];
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
      final response = await http.get(
        widget.api.baseUrl.resolve('/api/conversations/presence'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ${widget.api.token}',
        },
      ).timeout(const Duration(seconds: 20));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(response.statusCode, 'Could not load conversations.');
      }
      final conversations = (jsonDecode(response.body) as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (mounted) setState(() => _conversations = conversations);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: widget.showAppBar
            ? AppBar(
                title: const Text('Messages'),
                actions: [
                  IconButton(
                    tooltip: 'Refresh',
                    onPressed: _load,
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              )
            : null,
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const ListingSkeletonList(count: 5)
              : _error != null
                  ? _ErrorState(message: _error!, onRetry: _load)
                  : _conversations.isEmpty
                      ? const _EmptyMessages()
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                          itemCount: _conversations.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 4),
                          itemBuilder: (context, index) {
                            final conversation = _conversations[index];
                            final unread =
                                (conversation['unread_count'] as num?)?.toInt() ?? 0;
                            return _ConversationTile(
                              conversation: conversation,
                              unread: unread,
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ChatScreen(
                                      api: widget.api,
                                      conversationId: conversation['id'] as String,
                                    ),
                                  ),
                                );
                                _load();
                              },
                            );
                          },
                        ),
        ),
      );
}

class _ConversationTile extends StatelessWidget {
  final Map<String, dynamic> conversation;
  final int unread;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.unread,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = conversation['listing_title'] as String? ?? 'Listing';
    final preview = conversation['last_message_preview'] as String? ??
        'Start the conversation';
    final photo = conversation['listing_photo_url'] as String?;
    final time = _formatRelative(conversation['last_message_at'] as String?);
    final verified = conversation['counterpart_verified'] == true;
    final lastActive =
        DateTime.tryParse(conversation['counterpart_last_active'] as String? ?? '')
            ?.toLocal();
    final isOnline = lastActive != null &&
        DateTime.now().difference(lastActive).inMinutes < 5;
    final presence = isOnline
        ? 'Active now'
        : lastActive == null
            ? null
            : 'Last active ${_relative(lastActive)}';

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: UnaColors.green100,
                    backgroundImage: photo == null ? null : NetworkImage(photo),
                    child: photo == null
                        ? const Icon(Icons.home_work_outlined, color: UnaColors.green900)
                        : null,
                  ),
                  if (isOnline)
                    Positioned(
                      right: 1,
                      bottom: 1,
                      child: Container(
                        width: 13,
                        height: 13,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Theme.of(context).colorScheme.surface,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  if (unread > 0)
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: UnaColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Theme.of(context).colorScheme.surface,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight:
                                  unread > 0 ? FontWeight.w700 : FontWeight.w600,
                            ),
                          ),
                        ),
                        if (time.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            time,
                            style: TextStyle(
                              fontSize: 11,
                              color: unread > 0
                                  ? UnaColors.primary
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                              fontWeight:
                                  unread > 0 ? FontWeight.w700 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (verified) ...[
                          const Icon(Icons.verified, size: 14, color: UnaColors.green700),
                          const SizedBox(width: 4),
                        ],
                        Expanded(
                          child: Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: unread > 0
                                  ? Theme.of(context).colorScheme.onSurface
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        if (unread > 0)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: UnaColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$unread',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (presence != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        presence,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: isOnline
                              ? const Color(0xFF15803D)
                              : Theme.of(context).colorScheme.onSurfaceVariant,
                          fontWeight: isOnline ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatRelative(String? iso) {
  if (iso == null) return '';
  final time = DateTime.tryParse(iso)?.toLocal();
  if (time == null) return '';
  final now = DateTime.now();
  if (now.difference(time).inDays == 0) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
  return _relative(time);
}

String _relative(DateTime time) {
  final difference = DateTime.now().difference(time);
  if (difference.inMinutes < 1) return 'just now';
  if (difference.inHours < 1) return '${difference.inMinutes}m ago';
  if (difference.inDays < 1) return '${difference.inHours}h ago';
  return '${difference.inDays}d ago';
}

class _EmptyMessages extends StatelessWidget {
  const _EmptyMessages();

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                  color: UnaColors.green100,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.chat_bubble_outline,
                  size: 40,
                  color: UnaColors.green900,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'No conversations yet',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Message a lister from any listing and it will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 40),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ),
        ),
      );
}
