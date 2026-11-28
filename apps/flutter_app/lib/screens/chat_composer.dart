part of 'chat_screen.dart';

extension _ChatComposer on _ChatScreenState {
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
          _replyThumb(
            url: reply['media_url'] as String?,
            type: reply['media_type'] as String?,
            size: 30,
          ),
          const SizedBox(width: 8),
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
                      : switch (reply['media_type']) {
                          'audio' => 'Voice note',
                          'video' => 'Video',
                          'document' => 'Document',
                          'image' => 'Photo',
                          _ => 'Attachment',
                        },
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
          const SizedBox(width: 8),
          Text(
            _recordPaused ? 'Paused' : 'Recording',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const Spacer(),
          Text(
            '${remaining}s left',
            style: TextStyle(
              fontSize: 12,
              color: remaining <= 15 ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          IconButton(
            tooltip: _recordPaused ? 'Resume' : 'Pause',
            onPressed: _toggleRecordPause,
            icon: Icon(_recordPaused ? Icons.mic : Icons.pause),
          ),
          IconButton(
            tooltip: 'Send',
            onPressed: _finishRecording,
            icon: const Icon(Icons.send, color: UnaColors.green700),
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
        padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(
            top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
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
                    borderRadius: BorderRadius.circular(20),
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
              IconButton(
                tooltip: 'Record a voice note',
                onPressed: _sending ? null : _startRecording,
                icon: const Icon(Icons.mic_none),
              ),
          ],
        ),
      ),
    );
  }
}
