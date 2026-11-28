import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../theme.dart';
import '../utils/format.dart';

class ListingCard extends StatelessWidget {
  final Listing listing;
  final String? imageUrl;
  final bool isFavorite;
  final bool isOwner;
  final bool showOwnerActions;
  final VoidCallback? onTap;
  final VoidCallback? onFavorite;
  final VoidCallback? onShare;
  final VoidCallback? onMessage;
  final VoidCallback? onDelete;
  final VoidCallback? onEdit;

  const ListingCard({
    super.key,
    required this.listing,
    this.imageUrl,
    this.isFavorite = false,
    this.isOwner = false,
    this.showOwnerActions = false,
    this.onTap,
    this.onFavorite,
    this.onShare,
    this.onMessage,
    this.onDelete,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final image = imageUrl ?? (listing.media.isEmpty ? null : listing.media.first.url);
    final location = listing.lga.isEmpty ? listing.state : listing.lga;
    final accountType = listing.isAgentListing ? 'Agent' : 'Landlord';

    return Material(
      color: UnaColors.surface,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      elevation: 1,
      shadowColor: Colors.black12,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // The image takes whatever height the grid cell leaves over, so the
            // action row below can never be pushed out of the viewport.
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (image == null)
                    Container(
                      color: UnaColors.green100,
                      child: const Icon(Icons.home_work_outlined, size: 40, color: UnaColors.green700),
                    )
                  else
                    Image.network(image, fit: BoxFit.cover),
                  Positioned(
                    left: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: UnaColors.green900,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        formatNaira(listing.price),
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: UnaColors.green900.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showOwnerActions && onEdit != null) ...[
                          _RoundAction(
                            icon: Icons.edit_outlined,
                            color: Colors.white,
                            background: Colors.black45,
                            onTap: onEdit!,
                          ),
                          const SizedBox(width: 6),
                        ],
                        if (showOwnerActions && onDelete != null) ...[
                          _RoundAction(
                            icon: Icons.delete_outline,
                            color: Colors.white,
                            background: Colors.red.shade600,
                            onTap: onDelete!,
                          ),
                          const SizedBox(width: 6),
                        ],
                        if (onFavorite != null)
                          _RoundAction(
                            icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                            color: isFavorite ? Colors.red : Colors.white,
                            background: Colors.black45,
                            onTap: onFavorite!,
                          ),
                      ],
                    ),
                  ),
                  if (isOwner)
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: UnaColors.green900,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Yours',
                          style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text900, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${listing.lga.isEmpty ? listing.state : listing.lga}, ${listing.state}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text500, fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Flexible(
                        child: _badge(
                          accountType,
                          listing.isAgentListing ? Colors.orange.shade50 : UnaColors.green100,
                          listing.isAgentListing ? Colors.orange.shade800 : UnaColors.green700,
                        ),
                      ),
                      if (listing.propertyType != null) ...[
                        const SizedBox(width: 4),
                        Flexible(
                          child: _badge(
                            listing.propertyType!,
                            Colors.grey.shade100,
                            Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(height: 1, color: Colors.grey.shade100),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          listing.landlordName.isEmpty ? 'Landlord' : listing.landlordName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: UnaColors.text500, fontSize: 11),
                        ),
                      ),
                      if (onMessage != null)
                        _ActionIcon(icon: Icons.chat_bubble_outline, onTap: onMessage!),
                      if (onShare != null)
                        _ActionIcon(icon: Icons.share_outlined, onTap: onShare!),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(String text, Color background, Color foreground) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: foreground, fontSize: 10, fontWeight: FontWeight.w600),
        ),
      );
}

class _RoundAction extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color background;
  final VoidCallback onTap;

  const _RoundAction({
    required this.icon,
    required this.color,
    required this.background,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(color: background, shape: BoxShape.circle),
          child: Icon(icon, size: 15, color: color),
        ),
      );
}

class _ActionIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color color;

  const _ActionIcon({
    required this.icon,
    required this.onTap,
    this.color = UnaColors.green700,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(icon, size: 16, color: color),
        ),
      );
}
