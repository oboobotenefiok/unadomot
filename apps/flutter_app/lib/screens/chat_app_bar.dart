part of 'chat_screen.dart';

extension _ChatAppBar on _ChatScreenState {
  PreferredSizeWidget _appBar() {
    final title = widget.listingTitle ?? 'Conversation';
    final photo = widget.listingPhotoUrl;
    final canOpen = widget.listingId != null && widget.cache != null && widget.appState != null;

    return AppBar(
      titleSpacing: 0,
      title: InkWell(
        onTap: canOpen
            ? () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ListingDetailScreen(
                      api: widget.api,
                      cache: widget.cache!,
                      appState: widget.appState!,
                      listingId: widget.listingId!,
                    ),
                  ),
                )
            : null,
        borderRadius: BorderRadius.circular(12),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: UnaColors.green100,
              backgroundImage: photo == null ? null : NetworkImage(photo),
              child: photo == null
                  ? const Icon(Icons.chat_bubble_outline, size: 18, color: UnaColors.green700)
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  if (widget.counterpartName != null)
                    Text(
                      widget.counterpartName!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        IconButton(
          tooltip: 'Voice call',
          onPressed: () => _startCall('voice'),
          icon: const Icon(Icons.call_outlined),
        ),
        IconButton(
          tooltip: 'Video call',
          onPressed: () => _startCall('video'),
          icon: const Icon(Icons.videocam_outlined),
        ),
      ],
    );
  }
}
