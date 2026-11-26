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
        appBar: AppBar(title: const Text('Messages')),
        body: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _conversations.isEmpty
                      ? const Center(child: Text('No conversations yet'))
                      : ListView.builder(
                          itemCount: _conversations.length,
                          itemBuilder: (context, index) {
                            final conversation = _conversations[index];
                            final unread = (conversation['unread_count'] as num?)?.toInt() ?? 0;
                            return ListTile(
                              leading: const CircleAvatar(child: Icon(Icons.chat_bubble_outline)),
                              title: Text(conversation['listing_title'] as String? ?? 'Listing'),
                              subtitle: Text(
                                conversation['last_message_preview'] as String? ??
                                    'Start the conversation',
                              ),
                              trailing: unread > 0
                                  ? CircleAvatar(child: Text('$unread'))
                                  : const Icon(Icons.chevron_right),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ChatScreen(
                                    api: widget.api,
                                    conversationId: conversation['id'] as String,
                                  ),
                                ),
                              ),
                            );
                          },
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
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  List<Map<String, dynamic>> _messages = [];
  Map<String, dynamic>? _replyTo;
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
    _incomingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkIncoming());
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _incomingTimer?.cancel();
    _recorder.dispose();
    _player.dispose();
    _controller.dispose();
    super.dispose();
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
      }
      await widget.api.markRead(widget.conversationId);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_outlined),
              title: const Text('Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.videocam_outlined),
              title: const Text('Video'),
              onTap: () {
                Navigator.pop(context);
                _pickVideo();
              },
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('Document'),
              onTap: () {
                Navigator.pop(context);
                _pickDocument();
              },
            ),
            ListTile(
              leading: const Icon(Icons.mic_none),
              title: const Text('Voice note'),
              onTap: () {
                Navigator.pop(context);
                _startRecording();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showReactions(Map<String, dynamic> message) {
    const emojis = ['👍', '❤️', '😂', '😮', '😢'];
    showModalBottomSheet<void>(
      context: context,
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

  Widget _messageBubble(Map<String, dynamic> message) {
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
      content = const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
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
      content = const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.description_outlined),
          SizedBox(width: 8),
          Text('Document'),
        ],
      );
    } else {
      content = Text(body);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (replyBody != null)
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: Theme.of(context).colorScheme.primary, width: 3)),
              color: Theme.of(context).colorScheme.surface,
            ),
            child: Text(
              replyBody,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        content,
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
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${reaction['emoji']} ${reaction['count']}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
      ],
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

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Conversation'),
          actions: [
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
                      ? Center(child: Text(_error!))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final message = _messages[index];
                            return Dismissible(
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
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(vertical: 4),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: _messageBubble(message),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
            if (_replyTo != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
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
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Icon(Icons.fiber_manual_record, color: Colors.red),
                    const SizedBox(width: 8),
                    Text('Recording  ${_recordSeconds}s'),
                    const Spacer(),
                    TextButton(
                      onPressed: _stopRecording,
                      child: const Text('Send'),
                    ),
                  ],
                ),
              ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _sending ? null : _showAttachments,
                      icon: const Icon(Icons.attach_file),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        decoration: const InputDecoration(
                          hintText: 'Write a message',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sending ? null : _send,
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}
