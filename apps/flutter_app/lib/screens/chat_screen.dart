import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'call_screen.dart';
import 'listing_detail_screen.dart';

const _maxVoiceSeconds = 120;
const _reactionEmojis = ['👍', '❤️', '😂', '😮', '😢'];

class ChatScreen extends StatefulWidget {
  final ApiClient api;
  final String conversationId;
  final String? initialMessage;
  final String? listingId;
  final String? listingTitle;
  final String? listingPhotoUrl;
  final String? counterpartName;
  final String? counterpartPhotoUrl;
  final LocalCache? cache;
  final AppState? appState;

  const ChatScreen({
    super.key,
    required this.api,
    required this.conversationId,
    this.initialMessage,
    this.listingId,
    this.listingTitle,
    this.listingPhotoUrl,
    this.counterpartName,
    this.counterpartPhotoUrl,
    this.cache,
    this.appState,
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
  bool _showingIncoming = false;
  bool _isTyping = false;
  String? _error;

  bool _recording = false;
  bool _recordPaused = false;
  int _recordSeconds = 0;
  String? _recordPath;
  Timer? _recordTimer;

  String? _playingId;
  bool _playing = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<void>? _completeSub;

  DateTime? _lastTypingPing;
  Timer? _incomingTimer;
  Timer? _typingTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialMessage != null) {
      _controller.text = widget.initialMessage!;
    }
    _positionSub = _player.onPositionChanged.listen((value) {
      if (mounted) setState(() => _position = value);
    });
    _durationSub = _player.onDurationChanged.listen((value) {
      if (mounted) setState(() => _duration = value);
    });
    _completeSub = _player.onPlayerComplete.listen((_) {
      if (!mounted) return;
      setState(() {
        _playing = false;
        _playingId = null;
        _position = Duration.zero;
      });
    });
    _load();
    _loadMe();
    _incomingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkIncoming());
    _typingTimer = Timer.periodic(const Duration(seconds: 2), (_) => _checkTyping());
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _incomingTimer?.cancel();
    _typingTimer?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _completeSub?.cancel();
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

  Future<void> _checkTyping() async {
    if (!widget.api.signedIn) return;
    try {
      final response = await http.get(
        widget.api.baseUrl.resolve('/api/conversations/${widget.conversationId}/typing'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ${widget.api.token}',
        },
      ).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200 || !mounted) return;
      final data = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      final typing = data['typing'] == true;
      if (typing != _isTyping) setState(() => _isTyping = typing);
    } catch (_) {
      // Ignore transient typing failures.
    }
  }

  Future<void> _notifyTyping() async {
    if (!widget.api.signedIn) return;
    final now = DateTime.now();
    if (_lastTypingPing != null &&
        now.difference(_lastTypingPing!) < const Duration(seconds: 3)) {
      return;
    }
    _lastTypingPing = now;
    try {
      await http.post(
        widget.api.baseUrl.resolve('/api/conversations/${widget.conversationId}/typing'),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ${widget.api.token}',
        },
      ).timeout(const Duration(seconds: 5));
    } catch (_) {
      // Typing is best-effort.
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
      final signature = await widget.api.mediaSignature(purpose: 'chat');
      final uploaded = await widget.api.uploadToCloudinary(
        bytes: bytes,
        filename: filename,
        signature: signature,
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
    if (!await _recorder.hasPermission()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission is required.')),
        );
      }
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(), path: path);
    setState(() {
      _recording = true;
      _recordPaused = false;
      _recordSeconds = 0;
      _recordPath = path;
    });
    _recordTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _recordPaused) return;
      setState(() => _recordSeconds += 1);
      if (_recordSeconds >= _maxVoiceSeconds) _finishRecording();
    });
  }

  Future<void> _toggleRecordPause() async {
    if (!_recording) return;
    if (_recordPaused) {
      await _recorder.resume();
    } else {
      await _recorder.pause();
    }
    setState(() => _recordPaused = !_recordPaused);
  }

  Future<void> _cancelRecording() async {
    _recordTimer?.cancel();
    try {
      await _recorder.cancel();
    } catch (_) {
      // Nothing to cancel.
    }
    final path = _recordPath;
    if (path != null) {
      try {
        final file = File(path);
        if (await file.exists()) await file.delete();
      } catch (_) {
        // Temp file cleanup is best-effort.
      }
    }
    if (!mounted) return;
    setState(() {
      _recording = false;
      _recordPaused = false;
      _recordSeconds = 0;
      _recordPath = null;
    });
  }

  Future<void> _finishRecording() async {
    _recordTimer?.cancel();
    final seconds = _recordSeconds;
    final path = await _recorder.stop();
    if (!mounted) return;
    setState(() {
      _recording = false;
      _recordPaused = false;
      _recordSeconds = 0;
      _recordPath = null;
    });
    if (path == null || seconds < 1) return;
    final file = File(path);
    await _uploadAndSend(
      bytes: await file.readAsBytes(),
      filename: 'voice-note.m4a',
      mediaType: 'audio',
      durationSeconds: seconds,
    );
  }

  Future<void> _togglePlayback(Map<String, dynamic> message) async {
    final id = message['id'] as String;
    final url = message['media_url'] as String?;
    if (url == null) return;

    if (_playingId == id) {
      if (_playing) {
        await _player.pause();
        if (mounted) setState(() => _playing = false);
      } else {
        await _player.resume();
        if (mounted) setState(() => _playing = true);
      }
      return;
    }

    await _player.stop();
    if (mounted) {
      setState(() {
        _playingId = id;
        _playing = true;
        _position = Duration.zero;
        _duration = Duration.zero;
      });
    }
    await _player.play(UrlSource(url));
  }

  Future<void> _seekTo(Duration target) async {
    await _player.seek(target);
    if (mounted) setState(() => _position = target);
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
            ],
          ),
        ),
      ),
    );
  }

  /// One reaction per person per message: picking a new emoji replaces the
  /// previous one instead of stacking another.
  Future<void> _react(Map<String, dynamic> message, String emoji) async {
    final previous = List<Map<String, dynamic>>.from(
      (message['reactions'] as List?) ?? const [],
    );
    final mine = previous.firstWhere(
      (item) => item['reacted_by_me'] == true,
      orElse: () => const {},
    );
    final previousEmoji = mine['emoji'] as String?;

    setState(() {
      final next = previous
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      if (previousEmoji != null) {
        final index = next.indexWhere((item) => item['emoji'] == previousEmoji);
        if (index >= 0) {
          final count = (next[index]['count'] as num?)?.toInt() ?? 1;
          if (count <= 1) {
            next.removeAt(index);
          } else {
            next[index]['count'] = count - 1;
          }
        }
      }
      if (previousEmoji != emoji) {
        final index = next.indexWhere((item) => item['emoji'] == emoji);
        if (index >= 0) {
          next[index]['count'] = ((next[index]['count'] as num?)?.toInt() ?? 0) + 1;
          next[index]['reacted_by_me'] = true;
        } else {
          next.add({'emoji': emoji, 'count': 1, 'reacted_by_me': true});
        }
      }
      message['reactions'] = next;
    });

    try {
      await widget.api.reactToMessage(message['id'] as String, emoji);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  void _showReactions(Map<String, dynamic> message) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: _reactionEmojis
                .map((emoji) => IconButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _react(message, emoji);
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
      content = const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.play_circle_outline),
          SizedBox(width: 8),
          Text('Video'),
        ],
      );
    } else if (mediaUrl != null && mediaType == 'audio') {
      content = _voiceNote(message, mine);
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
      content = Text(
        body,
        style: TextStyle(
          color: mine ? Colors.white : Theme.of(context).colorScheme.onSurface,
          fontSize: 15,
          height: 1.35,
        ),
      );
    }

    final bubbleColor = mine ? UnaColors.green700 : Theme.of(context).colorScheme.surfaceContainerHighest;

    return Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width * 0.78,
      ),
      margin: const EdgeInsets.symmetric(vertical: 3),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onLongPress: () => _showReactions(message),
            onDoubleTap: () => _react(message, '❤️'),
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(14),
                  topRight: const Radius.circular(14),
                  bottomLeft: Radius.circular(mine ? 14 : 4),
                  bottomRight: Radius.circular(mine ? 4 : 14),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (replyBody != null && replyBody.isNotEmpty) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                      decoration: BoxDecoration(
                        color: mine ? Colors.black26 : Colors.black.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(6),
                        border: Border(
                          left: BorderSide(
                            color: mine ? Colors.white70 : UnaColors.green700,
                            width: 3,
                          ),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message['reply_to_sender_name'] as String? ?? 'Reply',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: mine ? Colors.white70 : UnaColors.green700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            replyBody,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: mine ? Colors.white70 : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  content,
                ],
              ),
            ),
          ),
          if (reactions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Wrap(
                spacing: 4,
                children: reactions.map((reaction) {
                  final count = (reaction['count'] as num?)?.toInt() ?? 1;
                  final selected = reaction['reacted_by_me'] == true;
                  return GestureDetector(
                    onTap: () => _react(message, reaction['emoji'] as String),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: selected
                            ? UnaColors.green100
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: selected ? UnaColors.green700 : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        '${reaction['emoji']} $count',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _voiceNote(Map<String, dynamic> message, bool mine) {
    final id = message['id'] as String;
    final total = (message['duration_seconds'] as num?)?.toInt() ?? 0;
    final active = _playingId == id;
    final position = active ? _position : Duration.zero;
    final duration = active && _duration.inMilliseconds > 0
        ? _duration
        : Duration(seconds: total);
    final maxMs = duration.inMilliseconds.toDouble();
    final value = position.inMilliseconds.clamp(0, maxMs.toInt()).toDouble();

    return SizedBox(
      width: 220,
      child: Row(
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: () => _togglePlayback(message),
            icon: Icon(
              active && _playing ? Icons.pause_circle_filled : Icons.play_circle_filled,
              color: mine ? Colors.white : UnaColors.green700,
              size: 30,
            ),
          ),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 2,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 10),
                  ),
                  child: Slider(
                    value: value,
                    max: maxMs <= 0 ? 1 : maxMs,
                    activeColor: mine ? Colors.white : UnaColors.green700,
                    inactiveColor: mine ? Colors.white30 : Colors.black12,
                    onChanged: (next) => _seekTo(Duration(milliseconds: next.round())),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _clock(active ? position : Duration.zero),
                        style: TextStyle(
                          fontSize: 10,
                          color: mine ? Colors.white70 : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        _clock(duration),
                        style: TextStyle(
                          fontSize: 10,
                          color: mine ? Colors.white70 : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _clock(Duration value) {
    final minutes = value.inMinutes;
    final seconds = value.inSeconds.remainder(60);
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  Widget _replyPreview() {
    final reply = _replyTo;
    if (reply == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: Border(left: BorderSide(color: UnaColors.green700, width: 3)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Replying to ${reply['sender_name'] ?? 'message'}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: UnaColors.green700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  (reply['body'] as String?)?.isNotEmpty == true
                      ? reply['body'] as String
                      : (reply['media_type'] == 'audio' ? 'Voice note' : 'Attachment'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: () => setState(() => _replyTo = null),
            icon: const Icon(Icons.close, size: 18),
          ),
        ],
      ),
    );
  }

  Widget _recordingBar() {
    final remaining = _maxVoiceSeconds - _recordSeconds;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        children: [
          IconButton(
            tooltip: 'Cancel',
            onPressed: _cancelRecording,
            icon: const Icon(Icons.delete_outline, color: Colors.red),
          ),
          const SizedBox(width: 4),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: _recordPaused ? Colors.orange : Colors.red,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _clock(Duration(seconds: _recordSeconds)),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(width: 6),
          Text(
            '· ${_clock(Duration(seconds: remaining))} left',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          IconButton(
            tooltip: _recordPaused ? 'Continue' : 'Pause',
            onPressed: _toggleRecordPause,
            icon: Icon(_recordPaused ? Icons.play_arrow : Icons.pause),
          ),
          IconButton.filled(
            tooltip: 'Send voice note',
            onPressed: _finishRecording,
            icon: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  Widget _composer() {
    final hasText = _controller.text.trim().isNotEmpty;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
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
              tooltip: 'Attach',
              onPressed: _sending ? null : _showAttachments,
              icon: const Icon(Icons.add_circle_outline),
            ),
            Expanded(
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) {
                  setState(() {});
                  _notifyTyping();
                },
                decoration: InputDecoration(
                  hintText: 'Message',
                  isDense: true,
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
            const SizedBox(width: 4),
            if (hasText)
              IconButton.filled(
                tooltip: 'Send',
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send),
              )
            else
              IconButton.filledTonal(
                tooltip: 'Record voice note',
                onPressed: _sending ? null : _startRecording,
                icon: const Icon(Icons.mic_none),
              ),
          ],
        ),
      ),
    );
  }

  /// The property this conversation belongs to. Tapping it opens the listing.
  Widget _listingHeader() {
    final title = widget.listingTitle ?? 'Conversation';
    final photo = widget.listingPhotoUrl;
    final canOpen = widget.listingId != null &&
        widget.cache != null &&
        widget.appState != null;

    return InkWell(
      onTap: canOpen ? _openListing : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 38,
                height: 38,
                child: photo == null
                    ? Container(
                        color: UnaColors.green100,
                        child: const Icon(
                          Icons.home_work_outlined,
                          size: 20,
                          color: UnaColors.green900,
                        ),
                      )
                    : Image.network(photo, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (widget.counterpartName != null)
                    Text(
                      widget.counterpartName!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
            if (canOpen)
              const Icon(Icons.chevron_right, size: 20),
          ],
        ),
      ),
    );
  }

  void _openListing() {
    final listingId = widget.listingId;
    final cache = widget.cache;
    final appState = widget.appState;
    if (listingId == null || cache == null || appState == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ListingDetailScreen(
          api: widget.api,
          cache: cache,
          appState: appState,
          listingId: listingId,
        ),
      ),
    );
  }

  Widget _senderAvatar() {
    final photo = widget.counterpartPhotoUrl;
    final name = widget.counterpartName ?? '';
    return CircleAvatar(
      radius: 14,
      backgroundColor: UnaColors.green100,
      backgroundImage: photo == null ? null : NetworkImage(photo),
      child: photo == null
          ? Text(
              _initials(name),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: UnaColors.green900,
              ),
            )
          : null,
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _listingHeader(),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(_error!, textAlign: TextAlign.center),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                        itemCount: _messages.length + (_isTyping ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index >= _messages.length) {
                            return const Padding(
                              padding: EdgeInsets.all(8),
                              child: Text(
                                'typing…',
                                style: TextStyle(fontStyle: FontStyle.italic, fontSize: 12),
                              ),
                            );
                          }
                          final message = _messages[index];
                          final senderId = message['sender_id'] as String?;
                          final mine = _myId != null && senderId == _myId;
                          final bubble = GestureDetector(
                            onLongPress: () => setState(() => _replyTo = message),
                            child: _messageBubble(message, mine),
                          );
                          if (mine) {
                            return Align(
                              alignment: Alignment.centerRight,
                              child: bubble,
                            );
                          }
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4, right: 6),
                                child: _senderAvatar(),
                              ),
                              Flexible(
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: bubble,
                                ),
                              ),
                            ],
                          );
                        },
                      ),
          ),
          if (_recording) _recordingBar() else ...[_replyPreview(), _composer()],
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 84,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: UnaColors.green700),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      );
}
