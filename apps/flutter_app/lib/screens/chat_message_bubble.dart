part of 'chat_screen.dart';

extension _ChatMessageBubble on _ChatScreenState {
  Widget _replyThumb({
    required String? url,
    required String? type,
    double size = 28,
    bool onDark = false,
  }) {
    final radius = BorderRadius.circular(6);
    if (url != null && type == 'image') {
      return ClipRRect(
        borderRadius: radius,
        child: Image.network(
          url,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _replyIcon(type, size, onDark),
        ),
      );
    }
    return _replyIcon(type, size, onDark);
  }

  Widget _replyIcon(String? type, double size, bool onDark) {
    final icon = switch (type) {
      'video' => Icons.videocam,
      'audio' => Icons.mic,
      'document' => Icons.description,
      _ => Icons.image,
    };
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: onDark ? Colors.white24 : Colors.black.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Icon(
        icon,
        size: size * 0.55,
        color: onDark ? Colors.white70 : UnaColors.green700,
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
            onLongPress: () => _showMessageActions(message),
            onDoubleTap: () => _react(message, '❤️'),
            onHorizontalDragEnd: (details) {
              if ((details.primaryVelocity ?? 0).abs() > 250) {
                _startReply(message);
              }
            },
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
                      padding: const EdgeInsets.fromLTRB(6, 6, 8, 6),
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
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _replyThumb(
                            url: message['reply_to_media_url'] as String?,
                            type: message['reply_to_media_type'] as String?,
                            size: 26,
                            onDark: mine,
                          ),
                          const SizedBox(width: 6),
                          Flexible(
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
}
