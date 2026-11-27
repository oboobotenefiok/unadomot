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
            SizedBox(
              height: 160,
              width: double.infinity,
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
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: UnaColors.green900,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        listing.lga.isEmpty ? listing.state : listing.lga,
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ),
                  if (onFavorite != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: _RoundAction(
                        icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? Colors.red : Colors.white,
                        background: Colors.black45,
                        onTap: onFavorite!,
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
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text900, fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    listing.address.isEmpty ? '${listing.lga}, ${listing.state}' : listing.address,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text500, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (!listing.isAgentListing)
                        _badge('Agent-Free', UnaColors.green100, UnaColors.green700),
                      if (listing.propertyType != null) ...[
                        const SizedBox(width: 4),
                        _badge(listing.propertyType!, Colors.grey.shade100, Colors.grey.shade600),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(height: 1, color: Colors.grey.shade100),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          listing.landlordName.isEmpty ? 'Landlord' : listing.landlordName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: UnaColors.text500, fontSize: 12),
                        ),
                      ),
                      if (onMessage != null)
                        _ActionIcon(icon: Icons.chat_bubble_outline, onTap: onMessage!),
                      if (onShare != null)
                        _ActionIcon(icon: Icons.share_outlined, onTap: onShare!),
                      if (showOwnerActions && onEdit != null)
                        _ActionIcon(icon: Icons.edit_outlined, onTap: onEdit!),
                      if (showOwnerActions && onDelete != null)
                        _ActionIcon(icon: Icons.delete_outline, onTap: onDelete!, color: Colors.red),
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
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: background, shape: BoxShape.circle),
          child: Icon(icon, size: 16, color: color),
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
