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
import '../api/event_stream.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'call_screen.dart';
import 'listing_detail_screen.dart';

part 'chat_message_bubble.dart';
part 'chat_composer.dart';
part 'chat_app_bar.dart';
part 'chat_attachments.dart';

part 'chat_message_bubble.dart';
part 'chat_composer.dart';
part 'chat_app_bar.dart';
part 'chat_attachments.dart';

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

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();

  List<Map<String, dynamic>> _messages = [];
  final Set<String> _seenIds = {};
  Map<String, dynamic>? _replyTo;
  String? _myId;
  bool _loading = true;
  bool _sending = false;
  bool _showingIncoming = false;
  bool _isTyping = false;
  bool _hasEarlier = false;
  bool _loadingEarlier = false;
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
  EventStream? _events;
  StreamSubscription<Map<String, dynamic>>? _eventsSub;

  @override
  void initState() {
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addObserver(this);
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
    // The reader's own id is needed to tell their messages apart from the
    // other person's, so it is resolved before the thread is positioned.
    _loadMe().then((_) {
      if (mounted) _load();
    });
    _listenForChanges();
    _incomingTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkIncoming());
    _typingTimer = Timer.periodic(const Duration(seconds: 2), (_) => _checkTyping());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    WidgetsBinding.instance.removeObserver(this);
    _recordTimer?.cancel();
    _incomingTimer?.cancel();
    _typingTimer?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _completeSub?.cancel();
    _eventsSub?.cancel();
    _events?.dispose();
    _recorder.dispose();
    _player.dispose();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Appends messages written on another device as they arrive. The sender's
  /// own device also receives the event, so anything already on screen is
  /// skipped by id rather than duplicated.
  void _listenForChanges() {
    _events = EventStream(widget.api)..start();
    _eventsSub = _events!.events.listen((event) {
      if (event['type'] != 'message') return;
      if (event['conversation_id'] != widget.conversationId) return;
      final message = event['message'];
      if (message is! Map) return;
      _appendMessage(Map<String, dynamic>.from(message));
    });
  }

  void _appendMessage(Map<String, dynamic> message) {
    final id = message['id'] as String?;
    if (id == null || _seenIds.contains(id)) return;

    final wasNearBottom = !_scrollController.hasClients ||
        _scrollController.position.maxScrollExtent - _scrollController.offset < 120;

    setState(() {
      _seenIds.add(id);
      _messages = [..._messages, message];
    });

    if (wasNearBottom) {
      _scrollToBottom();
    }
    widget.api.markRead(widget.conversationId).catchError((_) {});
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
          PageRouteBuilder<void>(
            opaque: false,
            barrierColor: null,
            pageBuilder: (_, __, ___) => IncomingCallScreen(
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

  /// Opens the conversation at the first message the reader has not seen yet,
  /// keeping one earlier message for context. Anything older is behind the
  /// "Earlier messages" control rather than forcing a scroll through history.
  Future<void> _load() async {
    try {
      final messages = await widget.api.messages(widget.conversationId);
      if (mounted) {
        var loaded = messages.reversed.toList();
        final firstUnread = loaded.indexWhere((message) {
          final mine = _myId != null && message['sender_id'] == _myId;
          return !mine && message['read_at'] == null;
        });

        if (firstUnread > 0) {
          loaded = loaded.sublist(firstUnread - 1);
          _hasEarlier = true;
        } else {
          _hasEarlier = false;
        }

        setState(() {
          _messages = loaded;
          _seenIds
            ..clear()
            ..addAll(_messages.map((item) => item['id'] as String? ?? ''));
        });
        _scrollToBottom();
      }
      await widget.api.markRead(widget.conversationId);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadEarlier() async {
    if (_loadingEarlier || _messages.isEmpty) return;
    setState(() => _loadingEarlier = true);
    try {
      final older = await widget.api.messages(
        widget.conversationId,
        before: _messages.first['created_at'] as String?,
      );
      if (!mounted) return;
      if (older.isEmpty) {
        setState(() {
          _hasEarlier = false;
          _loadingEarlier = false;
        });
        return;
      }
      setState(() {
        _messages = [...older.reversed.toList(), ..._messages];
        _seenIds.addAll(_messages.map((item) => item['id'] as String? ?? ''));
        _hasEarlier = older.length >= 50;
        _loadingEarlier = false;
      });
    } catch (error) {
      if (mounted) {
        setState(() => _loadingEarlier = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  @override
  void didChangeMetrics() {
    final bottom = View.of(context).viewInsets.bottom;
    if (bottom > 0) _scrollToBottom();
  }

  @override
  void didChangeMetrics() {
    final bottom = View.of(context).viewInsets.bottom;
    if (bottom > 0) _scrollToBottom();
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

  Future<void> _startCall(String kind) async {
    if (!widget.api.signedIn) return;
    await Navigator.push(
      context,
      CallScreen.route(
        api: widget.api,
        conversationId: widget.conversationId,
        kind: kind,
      ),
    );
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
          _seenIds.add(message['id'] as String? ?? '');
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
          _seenIds.add(message['id'] as String? ?? '');
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

  void _startReply(Map<String, dynamic> message) {
    setState(() {
      _replyTo = {
        'id': message['id'],
        'body': message['body'],
        'media_type': message['media_type'],
        'media_url': message['media_url'],
        'sender_name': message['sender_id'] == _myId
            ? 'You'
            : (widget.counterpartName ?? 'them'),
      };
    });
  }

  void _showMessageActions(Map<String, dynamic> message) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.reply),
              title: const Text('Reply'),
              onTap: () {
                Navigator.pop(context);
                _startReply(message);
              },
            ),
            ListTile(
              leading: const Icon(Icons.emoji_emotions_outlined),
              title: const Text('React'),
              onTap: () {
                Navigator.pop(context);
                _showReactions(message);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showEarlier = _hasEarlier && _messages.isNotEmpty;
    return Scaffold(
      resizeToAvoidBottomInset: true,
      resizeToAvoidBottomInset: true,
      appBar: _appBar(),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_error!, textAlign: TextAlign.center),
                              const SizedBox(height: 12),
                              FilledButton(onPressed: _load, child: const Text('Try again')),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                        itemCount: _messages.length + (showEarlier ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (showEarlier && index == 0) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: TextButton.icon(
                                  onPressed: _loadingEarlier ? null : _loadEarlier,
                                  icon: _loadingEarlier
                                      ? const SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : const Icon(Icons.history, size: 16),
                                  label: const Text('Earlier messages'),
                                ),
                              ),
                            );
                          }

                          final message = _messages[index - (showEarlier ? 1 : 0)];
                          final mine = _myId != null && message['sender_id'] == _myId;
                          final bubble = _messageBubble(message, mine);
                          if (mine) {
                            return Align(
                              alignment: Alignment.centerRight,
                              child: bubble,
                            );
                          }
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              _SenderAvatar(
                                photoUrl: widget.counterpartPhotoUrl,
                                name: widget.counterpartName,
                              ),
                              const SizedBox(width: 6),
                              Flexible(child: bubble),
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

class _SenderAvatar extends StatelessWidget {
  final String? photoUrl;
  final String? name;

  const _SenderAvatar({required this.photoUrl, required this.name});

  @override
  Widget build(BuildContext context) {
    final initials = (name ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) => part.characters.first.toUpperCase())
        .take(2)
        .join();

    return CircleAvatar(
      radius: 14,
      backgroundColor: UnaColors.green100,
      backgroundImage: photoUrl == null ? null : NetworkImage(photoUrl!),
      child: photoUrl == null
          ? Text(
              initials.isEmpty ? '?' : initials,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: UnaColors.green900,
              ),
            )
          : null,
    );
  }
}

