import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import '../api/api_client.dart';

/// A call that can shrink into a floating card.
///
/// The route is pushed with `opaque: false` and no barrier, so when the call
/// is minimised only the small card is hit-testable and the rest of the app
/// stays usable underneath. The peer connection never tears down, which is
/// what makes restoring instant.
class CallScreen extends StatefulWidget {
  final ApiClient api;
  final String conversationId;
  final String kind;

  const CallScreen({
    super.key,
    required this.api,
    required this.conversationId,
    required this.kind,
  });

  static Route<void> route({
    required ApiClient api,
    required String conversationId,
    required String kind,
  }) =>
      PageRouteBuilder<void>(
        opaque: false,
        barrierColor: null,
        transitionDuration: const Duration(milliseconds: 220),
        pageBuilder: (_, __, ___) => CallScreen(
          api: api,
          conversationId: conversationId,
          kind: kind,
        ),
      );

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  RTCPeerConnection? _peer;
  MediaStream? _localStream;
  String? _callId;
  Timer? _poll;
  Timer? _tick;
  bool _muted = false;
  bool _speaker = false;
  bool _connected = false;
  bool _ending = false;
  bool _minimized = false;
  Duration _elapsed = Duration.zero;
  String? _error;

  bool get _isVideo => widget.kind == 'video';

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && !_ending) {
        setState(() => _elapsed += const Duration(seconds: 1));
      }
    });
    _start();
  }

  @override
  void dispose() {
    _poll?.cancel();
    _tick?.cancel();
    _localStream?.getTracks().forEach((track) => track.stop());
    _peer?.close();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    try {
      await _localRenderer.initialize();
      await _remoteRenderer.initialize();

      _peer = await createPeerConnection({
        'iceServers': await _iceServers(widget.api),
      });

      _peer!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          _remoteRenderer.srcObject = event.streams.first;
          if (mounted) setState(() => _connected = true);
        }
      };
      _peer!.onConnectionState = (state) {
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected && mounted) {
          setState(() => _connected = true);
        }
      };

      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': _isVideo
            ? {'facingMode': 'user', 'width': 1280, 'height': 720}
            : false,
      });
      _localRenderer.srcObject = _localStream;
      for (final track in _localStream!.getTracks()) {
        await _peer!.addTrack(track, _localStream!);
      }

      final offer = await _peer!.createOffer();
      await _peer!.setLocalDescription(offer);
      await _waitForIce(_peer!);

      final sdp = (await _peer!.getLocalDescription())?.sdp;
      if (sdp == null) throw StateError('Could not prepare the call');

      final call = await widget.api.startCall(
        widget.conversationId,
        kind: widget.kind,
        offerSdp: sdp,
      );
      _callId = call['id'] as String;
      _poll = Timer.periodic(const Duration(seconds: 2), (_) => _checkCall());
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _checkCall() async {
    final id = _callId;
    if (id == null || _ending) return;
    try {
      final call = await widget.api.getCall(id);
      final status = call['status'] as String?;
      final answer = call['answer_sdp'] as String?;
      if (status == 'accepted' && answer != null && !_connected) {
        await _peer!.setRemoteDescription(RTCSessionDescription(answer, 'answer'));
      } else if (status == 'declined' || status == 'ended') {
        await _hangUp(notify: false);
      }
    } catch (_) {
      // Keep polling through transient network errors.
    }
  }

  Future<void> _hangUp({bool notify = true}) async {
    if (_ending) return;
    _ending = true;
    _poll?.cancel();
    _tick?.cancel();
    final id = _callId;
    if (notify && id != null) {
      try {
        await widget.api.endCall(id);
      } catch (_) {}
    }
    if (mounted) Navigator.pop(context);
  }

  void _toggleMute() {
    final tracks = _localStream?.getAudioTracks() ?? [];
    for (final track in tracks) {
      track.enabled = _muted;
    }
    setState(() => _muted = !_muted);
  }

  Future<void> _toggleSpeaker() async {
    final next = !_speaker;
    await Helper.setSpeakerphoneOn(next);
    if (mounted) setState(() => _speaker = next);
  }

  Future<void> _switchCamera() async {
    final tracks = _localStream?.getVideoTracks() ?? [];
    if (tracks.isNotEmpty) await Helper.switchCamera(tracks.first);
  }

  void _minimize() {
    if (_minimized) return;
    setState(() => _minimized = true);
  }

  void _restore() {
    if (!_minimized) return;
    setState(() => _minimized = false);
  }

  @override
  Widget build(BuildContext context) => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _minimize();
        },
        child: _minimized ? _pip() : _fullScreen(),
      );

  Widget _pip() => Align(
        alignment: Alignment.bottomRight,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Material(
            elevation: 10,
            borderRadius: BorderRadius.circular(14),
            clipBehavior: Clip.antiAlias,
            color: Colors.black,
            child: InkWell(
              onTap: _restore,
              child: SizedBox(
                width: 104,
                height: 148,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: _isVideo && _connected
                          ? RTCVideoView(
                              _remoteRenderer,
                              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                            )
                          : Center(
                              child: Icon(
                                _isVideo ? Icons.videocam : Icons.phone_in_talk,
                                color: Colors.white54,
                                size: 34,
                              ),
                            ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        color: Colors.black54,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        child: Row(
                          children: [
                            Text(
                              _clock(_elapsed),
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                            const Spacer(),
                            InkWell(
                              onTap: _hangUp,
                              child: const Icon(Icons.call_end, color: Colors.red, size: 18),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

  Widget _fullScreen() => Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              if (_isVideo)
                Positioned.fill(
                  child: _connected
                      ? RTCVideoView(_remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover)
                      : const Center(
                          child: Text(
                            'Calling…',
                            style: TextStyle(color: Colors.white70, fontSize: 18),
                          ),
                        ),
                )
              else
                const Center(
                  child: Icon(Icons.phone_in_talk, color: Colors.white54, size: 96),
                ),
              if (_isVideo)
                Positioned(
                  right: 16,
                  top: 16,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 110,
                      height: 160,
                      child: RTCVideoView(_localRenderer, mirror: true),
                    ),
                  ),
                ),
              Positioned(
                left: 8,
                top: 8,
                child: IconButton(
                  tooltip: 'Minimize',
                  onPressed: _minimize,
                  icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
                ),
              ),
              if (_connected)
                Positioned(
                  top: 20,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Text(
                      _clock(_elapsed),
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ),
                ),
              if (_error != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 32,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _CallButton(
                      icon: _muted ? Icons.mic_off : Icons.mic,
                      label: _muted ? 'Unmute' : 'Mute',
                      onTap: _toggleMute,
                    ),
                    _CallButton(
                      icon: _speaker ? Icons.volume_up : Icons.volume_down,
                      label: _speaker ? 'Speaker' : 'Earpiece',
                      onTap: _toggleSpeaker,
                    ),
                    _CallButton(
                      icon: Icons.call_end,
                      label: 'End',
                      color: Colors.red,
                      onTap: _hangUp,
                    ),
                    if (_isVideo)
                      _CallButton(
                        icon: Icons.cameraswitch,
                        label: 'Flip',
                        onTap: _switchCamera,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

String _clock(Duration value) {
  final minutes = value.inMinutes;
  final seconds = value.inSeconds.remainder(60);
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

class IncomingCallScreen extends StatefulWidget {
  final ApiClient api;
  final String callId;
  final String kind;
  final String offerSdp;

  const IncomingCallScreen({
    super.key,
    required this.api,
    required this.callId,
    required this.kind,
    required this.offerSdp,
  });

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen> {
  final _localRenderer = RTCVideoRenderer();
  final _remoteRenderer = RTCVideoRenderer();
  RTCPeerConnection? _peer;
  MediaStream? _localStream;
  Timer? _poll;
  Timer? _ringTimer;
  Timer? _tick;
  bool _accepted = false;
  bool _muted = false;
  bool _speaker = false;
  bool _connected = false;
  bool _ending = false;
  bool _minimized = false;
  Duration _elapsed = Duration.zero;
  String? _error;

  bool get _isVideo => widget.kind == 'video';

  @override
  void initState() {
    super.initState();
    _ringTimer = Timer(const Duration(seconds: 45), _decline);
  }

  @override
  void dispose() {
    _poll?.cancel();
    _ringTimer?.cancel();
    _tick?.cancel();
    _localStream?.getTracks().forEach((track) => track.stop());
    _peer?.close();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  Future<void> _decline() async {
    if (_ending) return;
    _ending = true;
    _ringTimer?.cancel();
    try {
      await widget.api.endCall(widget.callId);
    } catch (_) {}
    if (mounted) Navigator.pop(context);
  }

  Future<void> _answer() async {
    if (_accepted) return;
    setState(() => _accepted = true);
    _ringTimer?.cancel();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && !_ending) {
        setState(() => _elapsed += const Duration(seconds: 1));
      }
    });
    try {
      await _localRenderer.initialize();
      await _remoteRenderer.initialize();

      _peer = await createPeerConnection({
        'iceServers': await _iceServers(widget.api),
      });
      _peer!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          _remoteRenderer.srcObject = event.streams.first;
          if (mounted) setState(() => _connected = true);
        }
      };
      _peer!.onConnectionState = (state) {
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected && mounted) {
          setState(() => _connected = true);
        }
      };

      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': _isVideo
            ? {'facingMode': 'user', 'width': 1280, 'height': 720}
            : false,
      });
      _localRenderer.srcObject = _localStream;
      for (final track in _localStream!.getTracks()) {
        await _peer!.addTrack(track, _localStream!);
      }

      await _peer!.setRemoteDescription(
        RTCSessionDescription(widget.offerSdp, 'offer'),
      );
      final answer = await _peer!.createAnswer();
      await _peer!.setLocalDescription(answer);
      await _waitForIce(_peer!);

      final sdp = (await _peer!.getLocalDescription())?.sdp;
      if (sdp == null) throw StateError('Could not answer the call');
      await widget.api.answerCall(widget.callId, answerSdp: sdp);
      _poll = Timer.periodic(const Duration(seconds: 2), (_) => _checkCall());
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _checkCall() async {
    if (_ending) return;
    try {
      final call = await widget.api.getCall(widget.callId);
      final status = call['status'] as String?;
      if (status == 'ended' || status == 'declined') {
        await _hangUp(notify: false);
      }
    } catch (_) {
      // Keep polling through transient network errors.
    }
  }

  Future<void> _hangUp({bool notify = true}) async {
    if (_ending) return;
    _ending = true;
    _poll?.cancel();
    _ringTimer?.cancel();
    _tick?.cancel();
    if (notify) {
      try {
        await widget.api.endCall(widget.callId);
      } catch (_) {}
    }
    if (mounted) Navigator.pop(context);
  }

  void _toggleMute() {
    final tracks = _localStream?.getAudioTracks() ?? [];
    for (final track in tracks) {
      track.enabled = _muted;
    }
    setState(() => _muted = !_muted);
  }

  Future<void> _toggleSpeaker() async {
    final next = !_speaker;
    await Helper.setSpeakerphoneOn(next);
    if (mounted) setState(() => _speaker = next);
  }

  Future<void> _switchCamera() async {
    final tracks = _localStream?.getVideoTracks() ?? [];
    if (tracks.isNotEmpty) await Helper.switchCamera(tracks.first);
  }

  void _minimize() {
    if (_minimized || !_accepted) return;
    setState(() => _minimized = true);
  }

  void _restore() {
    if (!_minimized) return;
    setState(() => _minimized = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_accepted) return _ringing();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _minimize();
      },
      child: _minimized ? _pip() : _inCall(),
    );
  }

  Widget _pip() => Align(
        alignment: Alignment.bottomRight,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Material(
            elevation: 10,
            borderRadius: BorderRadius.circular(14),
            clipBehavior: Clip.antiAlias,
            color: Colors.black,
            child: InkWell(
              onTap: _restore,
              child: SizedBox(
                width: 104,
                height: 148,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: _isVideo && _connected
                          ? RTCVideoView(
                              _remoteRenderer,
                              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                            )
                          : Center(
                              child: Icon(
                                _isVideo ? Icons.videocam : Icons.phone_in_talk,
                                color: Colors.white54,
                                size: 34,
                              ),
                            ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        color: Colors.black54,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        child: Row(
                          children: [
                            Text(
                              _clock(_elapsed),
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                            const Spacer(),
                            InkWell(
                              onTap: _hangUp,
                              child: const Icon(Icons.call_end, color: Colors.red, size: 18),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

  Widget _ringing() => Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              CircleAvatar(
                radius: 54,
                backgroundColor: Colors.white12,
                child: Icon(
                  _isVideo ? Icons.videocam : Icons.phone,
                  color: Colors.white,
                  size: 48,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                _isVideo ? 'Incoming video call' : 'Incoming voice call',
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ringing…',
                style: TextStyle(color: Colors.white60, fontSize: 14),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _CallButton(
                    icon: Icons.call_end,
                    label: 'Decline',
                    color: Colors.red,
                    onTap: _decline,
                  ),
                  _CallButton(
                    icon: _isVideo ? Icons.videocam : Icons.call,
                    label: 'Accept',
                    color: const Color(0xFF16A34A),
                    onTap: _answer,
                  ),
                ],
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      );

  Widget _inCall() => Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              if (_isVideo)
                Positioned.fill(
                  child: _connected
                      ? RTCVideoView(_remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover)
                      : const Center(
                          child: Text(
                            'Connecting…',
                            style: TextStyle(color: Colors.white70, fontSize: 18),
                          ),
                        ),
                )
              else
                const Center(
                  child: Icon(Icons.phone_in_talk, color: Colors.white54, size: 96),
                ),
              if (_isVideo)
                Positioned(
                  right: 16,
                  top: 16,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 110,
                      height: 160,
                      child: RTCVideoView(_localRenderer, mirror: true),
                    ),
                  ),
                ),
              Positioned(
                left: 8,
                top: 8,
                child: IconButton(
                  tooltip: 'Minimize',
                  onPressed: _minimize,
                  icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
                ),
              ),
              if (_connected)
                Positioned(
                  top: 20,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Text(
                      _clock(_elapsed),
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ),
                ),
              if (_error != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 32,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _CallButton(
                      icon: _muted ? Icons.mic_off : Icons.mic,
                      label: _muted ? 'Unmute' : 'Mute',
                      onTap: _toggleMute,
                    ),
                    _CallButton(
                      icon: _speaker ? Icons.volume_up : Icons.volume_down,
                      label: _speaker ? 'Speaker' : 'Earpiece',
                      onTap: _toggleSpeaker,
                    ),
                    _CallButton(
                      icon: Icons.call_end,
                      label: 'End',
                      color: Colors.red,
                      onTap: _hangUp,
                    ),
                    if (_isVideo)
                      _CallButton(
                        icon: Icons.cameraswitch,
                        label: 'Flip',
                        onTap: _switchCamera,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

Future<List<Map<String, dynamic>>> _iceServers(ApiClient api) async {
  try {
    final response = await http.get(
      api.baseUrl.resolve('/api/calls/ice'),
      headers: {'Accept': 'application/json'},
    ).timeout(const Duration(seconds: 10));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      final servers = (data['ice_servers'] as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      if (servers.isNotEmpty) return servers;
    }
  } catch (_) {
    // Fall back to public STUN.
  }
  return [
    {'urls': 'stun:stun.l.google.com:19302'},
  ];
}

Future<void> _waitForIce(RTCPeerConnection peer) async {
  final completer = Completer<void>();
  peer.onIceGatheringState = (state) {
    if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
        !completer.isCompleted) {
      completer.complete();
    }
  };
  if (peer.iceGatheringState == RTCIceGatheringState.RTCIceGatheringStateComplete) {
    completer.complete();
  }
  await completer.future.timeout(const Duration(seconds: 6), onTimeout: () {});
}

class _CallButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _CallButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = Colors.white24,
  });

  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: label,
            backgroundColor: color,
            onPressed: onTap,
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      );
}
