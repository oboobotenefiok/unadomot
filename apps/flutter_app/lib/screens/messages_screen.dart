import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import '../api/api_client.dart';
import '../theme.dart';
import '../widgets/skeletons.dart';
import 'call_screen.dart';

class MessagesScreen extends StatefulWidget {
  final ApiClient api;

  const MessagesScreen({super.key, required this.api});

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
      final conversations = await widget.api.conversations();
      if (mounted) setState(() => _conversations = conversations);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Messages'),
          actions: [
            IconButton(
              tooltip: 'Refresh',
              onPressed: _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
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

class ChatScreen extends StatefulWidget {
  final ApiClient api;
  final String conversationId;
  final String? initialMessage;

  const ChatScreen({
    super.key,
    required this.api,
    required this.conversationId,
    this.initialMessage,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  List<Map<String, dynamic>> _messages = [];
  Map<String, dynamic>? _replyTo;
  String? _myId;
  bool _loading = true;
  bool _sending = false;
  bool _recording = false;
  bool _showingIncoming = false;
  int _recordSeconds = 0;
  Timer? _recordTimer;
  Timer? _incomingTimer;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialMessage != null) {
      _controller.text = widget.initialMessage!;
    }
    _load();
    _loadMe();
    _incomingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkIncoming());
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _incomingTimer?.cancel();
    _recorder.dispose();
    _player.dispose();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMe() async {
    try {
      final profile = await widget.api.myProfile();
      if (mounted) setState(() => _myId = profile['id'] as String?);
    } catch (_) {
      // Messages still render, aligned to the left.
    }
  }

  Future<void> _checkIncoming() async {
    if (_showingIncoming || !widget.api.signedIn) return;
    try {
      final calls = await widget.api.incomingCalls();
      if (calls.isEmpty || !mounted) return;
      final call = calls.first;
      _showingIncoming = true;
      final accept = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Text(call['kind'] == 'video' ? 'Incoming video call' : 'Incoming voice call'),
          content: const Text('Someone is calling you from this conversation.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Decline'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Accept'),
            ),
          ],
        ),
      );
      _showingIncoming = false;
      if (accept == true) {
        if (!mounted) return;
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => IncomingCallScreen(
              api: widget.api,
              callId: call['id'] as String,
              kind: call['kind'] as String,
              offerSdp: call['offer_sdp'] as String,
            ),
          ),
        );
      } else {
        await widget.api.endCall(call['id'] as String);
      }
    } catch (_) {
      _showingIncoming = false;
    }
  }

  Future<void> _load() async {
    try {
      final messages = await widget.api.messages(widget.conversationId);
      if (mounted) {
        setState(() => _messages = messages.reversed.toList());
        _scrollToBottom();
      }
      await widget.api.markRead(widget.conversationId);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final message = await widget.api.sendMessage(
        widget.conversationId,
        body,
        replyToId: _replyTo?['id'] as String?,
      );
      _controller.clear();
      if (mounted) {
        setState(() {
          _messages = [..._messages, message];
          _replyTo = null;
        });
        _scrollToBottom();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _uploadAndSend({
    required Uint8List bytes,
    required String filename,
    required String mediaType,
    int? durationSeconds,
  }) async {
    setState(() => _sending = true);
    try {
      final signature = await widget.api.mediaSignature(folder: 'unadomot/chat');
      final uploaded = await widget.api.uploadToCloudinary(
        bytes: bytes,
        filename: filename,
        signature: signature,
        resourceType: mediaType == 'image'
            ? 'image'
            : mediaType == 'video'
                ? 'video'
                : mediaType == 'audio'
                    ? 'video'
                    : 'raw',
      );
      final message = await widget.api.sendMessage(
        widget.conversationId,
        '',
        mediaUrl: uploaded['secure_url'] as String,
        mediaType: mediaType,
        durationSeconds: durationSeconds,
        replyToId: _replyTo?['id'] as String?,
      );
      if (mounted) {
        setState(() {
          _messages = [..._messages, message];
          _replyTo = null;
        });
        _scrollToBottom();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;
    await _uploadAndSend(
      bytes: await picked.readAsBytes(),
      filename: picked.name,
      mediaType: 'image',
    );
  }

  Future<void> _pickVideo() async {
    final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (picked == null) return;
    await _uploadAndSend(
      bytes: await picked.readAsBytes(),
      filename: picked.name,
      mediaType: 'video',
    );
  }

  Future<void> _pickDocument() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    await _uploadAndSend(
      bytes: file.bytes!,
      filename: file.name,
      mediaType: 'document',
    );
  }

  Future<void> _startRecording() async {
    if (!await _recorder.hasPermission()) return;
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(), path: path);
    setState(() {
      _recording = true;
      _recordSeconds = 0;
    });
    _recordTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _recordSeconds += 1);
    });
  }

  Future<void> _stopRecording() async {
    _recordTimer?.cancel();
    final path = await _recorder.stop();
    setState(() => _recording = false);
    if (path == null) return;
    final file = File(path);
    await _uploadAndSend(
      bytes: await file.readAsBytes(),
      filename: 'voice-note.m4a',
      mediaType: 'audio',
      durationSeconds: _recordSeconds,
    );
  }

  void _showAttachments() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _AttachmentAction(
                icon: Icons.photo_outlined,
                label: 'Photo',
                onTap: () {
                  Navigator.pop(context);
                  _pickImage();
                },
              ),
              _AttachmentAction(
                icon: Icons.videocam_outlined,
                label: 'Video',
                onTap: () {
                  Navigator.pop(context);
                  _pickVideo();
                },
              ),
              _AttachmentAction(
                icon: Icons.description_outlined,
                label: 'Document',
                onTap: () {
                  Navigator.pop(context);
                  _pickDocument();
                },
              ),
              _AttachmentAction(
                icon: Icons.mic_none,
                label: 'Voice note',
                onTap: () {
                  Navigator.pop(context);
                  _startRecording();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReactions(Map<String, dynamic> message) {
    const emojis = ['👍', '❤️', '😂', '😮', '😢'];
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: emojis
                .map((emoji) => IconButton(
                      onPressed: () async {
                        Navigator.pop(context);
                        await widget.api.reactToMessage(message['id'] as String, emoji);
                        if (!mounted) return;
                        setState(() {
                          final reactions = List<Map<String, dynamic>>.from(
                            (message['reactions'] as List?) ?? const [],
                          );
                          final index = reactions.indexWhere((item) => item['emoji'] == emoji);
                          if (index >= 0) {
                            reactions[index]['count'] =
                                ((reactions[index]['count'] as num?)?.toInt() ?? 0) + 1;
                            reactions[index]['reacted_by_me'] = true;
                          } else {
                            reactions.add({
                              'emoji': emoji,
                              'count': 1,
                              'reacted_by_me': true,
                            });
                          }
                          message['reactions'] = reactions;
                        });
                      },
                      icon: Text(emoji, style: const TextStyle(fontSize: 28)),
                    ))
                .toList(),
          ),
        ),
      ),
    );
  }

  Widget _messageBubble(Map<String, dynamic> message, bool mine) {
    final mediaUrl = message['media_url'] as String?;
    final mediaType = message['media_type'] as String?;
    final body = message['body'] as String? ?? '';
    final replyBody = message['reply_to_body'] as String?;
    final reactions = (message['reactions'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];

    Widget content;
    if (mediaUrl != null && mediaType == 'image') {
      content = ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(mediaUrl, width: 220, fit: BoxFit.cover),
      );
    } else if (mediaUrl != null && mediaType == 'video') {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.play_circle_outline),
          SizedBox(width: 8),
          Text('Video'),
        ],
      );
    } else if (mediaUrl != null && mediaType == 'audio') {
      final seconds = (message['duration_seconds'] as num?)?.toInt() ?? 0;
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: () => _player.play(UrlSource(mediaUrl)),
            icon: const Icon(Icons.play_arrow),
          ),
          Text('Voice note  ${seconds}s'),
        ],
      );
    } else if (mediaUrl != null && mediaType == 'document') {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.description_outlined),
          SizedBox(width: 8),
          Text('Document'),
        ],
      );
    } else {
      content = Text(
        body,
        style: TextStyle(
          color: mine ? Colors.white : Theme.of(context).colorScheme.onSurface,
          fontSize: 15,
          height: 1.35,
        ),
      );
    }

    return Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width * 0.78,
      ),
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
      decoration: BoxDecoration(
        color: mine ? UnaColors.green700 : Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(mine ? 16 : 4),
          bottomRight: Radius.circular(mine ? 4 : 16),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (replyBody != null)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: mine ? Colors.white.withValues(alpha: 0.14) : UnaColors.green100,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                replyBody,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: mine ? Colors.white70 : UnaColors.text600,
                ),
              ),
            ),
          content,
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _formatTime(message['created_at'] as String?),
                style: TextStyle(
                  fontSize: 10,
                  color: mine ? Colors.white70 : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              if (mine) ...[
                const SizedBox(width: 4),
                Icon(
                  (message['read_at'] != null) ? Icons.done_all : Icons.done,
                  size: 13,
                  color: Colors.white70,
                ),
              ],
            ],
          ),
          if (reactions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Wrap(
                spacing: 4,
                children: reactions
                    .map(
                      (reaction) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: mine ? Colors.white.withValues(alpha: 0.18) : UnaColors.green100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${reaction['emoji']} ${reaction['count']}',
                          style: TextStyle(
                            fontSize: 11,
                            color: mine ? Colors.white : UnaColors.green900,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }

  void _openCall(String kind) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CallScreen(
          api: widget.api,
          conversationId: widget.conversationId,
          kind: kind,
        ),
      ),
    );
  }

  Future<void> _showCallHistory() async {
    try {
      final calls = await widget.api.callHistory(widget.conversationId);
      if (!mounted) return;
      showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        useSafeArea: true,
        builder: (context) => calls.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(32),
                child: Text('No calls yet'),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: calls.length,
                itemBuilder: (context, index) {
                  final call = calls[index];
                  final status = call['status'] as String? ?? 'ended';
                  final missed = status == 'declined';
                  final seconds = (call['duration_seconds'] as num?)?.toInt() ?? 0;
                  final duration = seconds > 0
                      ? '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}'
                      : null;
                  return ListTile(
                    leading: Icon(
                      call['kind'] == 'video' ? Icons.videocam : Icons.call,
                      color: missed ? Colors.red : Colors.green,
                    ),
                    title: Text(call['kind'] == 'video' ? 'Video call' : 'Voice call'),
                    subtitle: Text(
                      missed
                          ? 'Missed or declined'
                          : duration == null
                              ? 'Completed'
                              : 'Duration $duration',
                    ),
                  );
                },
              ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: dark ? const Color(0xFF0B1510) : const Color(0xFFF6F8F6),
      appBar: AppBar(
        titleSpacing: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Conversation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            Text('Tap for call history', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Call history',
            onPressed: _showCallHistory,
            icon: const Icon(Icons.history),
          ),
          IconButton(
            tooltip: 'Voice call',
            onPressed: () => _openCall('audio'),
            icon: const Icon(Icons.call),
          ),
          IconButton(
            tooltip: 'Video call',
            onPressed: () => _openCall('video'),
            icon: const Icon(Icons.videocam),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _ErrorState(message: _error!, onRetry: _load)
                    : _messages.isEmpty
                        ? const _EmptyChat()
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final message = _messages[index];
                              final mine = _myId != null && message['sender_id'] == _myId;
                              final previous = index == 0 ? null : _messages[index - 1];
                              final showDate = previous == null ||
                                  _dayKey(previous['created_at'] as String?) !=
                                      _dayKey(message['created_at'] as String?);
                              return Column(
                                children: [
                                  if (showDate)
                                    _DateDivider(date: message['created_at'] as String?),
                                  Dismissible(
                                    key: ValueKey(message['id']),
                                    direction: DismissDirection.startToEnd,
                                    confirmDismiss: (_) async {
                                      setState(() => _replyTo = message);
                                      return false;
                                    },
                                    background: Container(
                                      alignment: Alignment.centerLeft,
                                      padding: const EdgeInsets.only(left: 16),
                                      child: const Icon(Icons.reply),
                                    ),
                                    child: GestureDetector(
                                      onLongPress: () => _showReactions(message),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 3),
                                        child: Row(
                                          mainAxisAlignment: mine
                                              ? MainAxisAlignment.end
                                              : MainAxisAlignment.start,
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            if (!mine) ...[
                                              CircleAvatar(
                                                radius: 14,
                                                backgroundColor: UnaColors.green100,
                                                child: const Icon(
                                                  Icons.person,
                                                  size: 16,
                                                  color: UnaColors.green900,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                            ],
                                            Flexible(child: _messageBubble(message, mine)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
          ),
          if (_replyTo != null)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 4),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border(
                  left: BorderSide(color: Theme.of(context).colorScheme.primary, width: 3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.reply, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _replyTo!['body'] as String? ?? 'Attachment',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _replyTo = null),
                    icon: const Icon(Icons.close, size: 18),
                  ),
                ],
              ),
            ),
          if (_recording)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  const Icon(Icons.fiber_manual_record, color: Colors.red),
                  const SizedBox(width: 8),
                  Text('Recording  ${_recordSeconds}s'),
                  const Spacer(),
                  TextButton(onPressed: _stopRecording, child: const Text('Send')),
                ],
              ),
            ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.3)),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  IconButton(
                    onPressed: _sending ? null : _showAttachments,
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 5,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: 'Write a message',
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AttachmentAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AttachmentAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 76,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      );
}

class _DateDivider extends StatelessWidget {
  final String? date;

  const _DateDivider({this.date});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Text(
                _formatDay(date),
                style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ),
      );
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat();

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.waving_hand_outlined, size: 40, color: UnaColors.green700),
              const SizedBox(height: 12),
              const Text(
                'Say hello',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Ask if the place is still available or request more photos.',
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

String _formatRelative(String? value) {
  if (value == null) return '';
  final time = DateTime.tryParse(value)?.toLocal();
  if (time == null) return '';
  final now = DateTime.now();
  final diff = now.difference(time);
  if (diff.inMinutes < 1) return 'now';
  if (diff.inHours < 1) return '${diff.inMinutes}m';
  if (diff.inDays < 1) return '${diff.inHours}h';
  if (diff.inDays < 7) return '${diff.inDays}d';
  return '${time.day}/${time.month}';
}

String _formatTime(String? value) {
  final time = DateTime.tryParse(value ?? '')?.toLocal();
  if (time == null) return '';
  final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
  final minute = time.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${time.hour >= 12 ? 'PM' : 'AM'}';
}

String _dayKey(String? value) {
  final time = DateTime.tryParse(value ?? '')?.toLocal();
  if (time == null) return '';
  return '${time.year}-${time.month}-${time.day}';
}

String _formatDay(String? value) {
  final time = DateTime.tryParse(value ?? '')?.toLocal();
  if (time == null) return '';
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(time.year, time.month, time.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  return '${time.day}/${time.month}/${time.year}';
}
