part of 'chat_screen.dart';

extension _ChatAttachments on _ChatScreenState {
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
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 90,
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
}
