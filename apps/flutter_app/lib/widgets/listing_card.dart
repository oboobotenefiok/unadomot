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
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
                    left: 6,
                    bottom: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: UnaColors.green900,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        formatNaira(listing.price),
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        listing.lga.isEmpty ? listing.state : listing.lga,
                        style: const TextStyle(color: Colors.white, fontSize: 9),
                      ),
                    ),
                  ),
                  if (onFavorite != null)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: _RoundAction(
                        icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? Colors.red : Colors.white,
                        background: Colors.black45,
                        onTap: onFavorite!,
                      ),
                    ),
                  if (isOwner)
                    Positioned(
                      bottom: 6,
                      right: 6,
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
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text900, fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    listing.address.isEmpty ? '${listing.lga}, ${listing.state}' : listing.address,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UnaColors.text500, fontSize: 10),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (!listing.isAgentListing)
                        _badge('Agent-Free', UnaColors.green100, UnaColors.green700),
                      if (listing.propertyType != null) ...[
                        const SizedBox(width: 4),
                        _badge(listing.propertyType!, Colors.grey.shade100, Colors.grey.shade700),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (onMessage != null)
                        InkWell(
                          onTap: onMessage,
                          borderRadius: BorderRadius.circular(20),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.chat_bubble_outline, size: 16, color: UnaColors.green700),
                          ),
                        ),
                      if (onShare != null) ...[
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: onShare,
                          borderRadius: BorderRadius.circular(20),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.share_outlined, size: 16, color: UnaColors.green700),
                          ),
                        ),
                      ],
                      if (showOwnerActions && onEdit != null) ...[
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: onEdit,
                          borderRadius: BorderRadius.circular(20),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.edit_outlined, size: 16, color: UnaColors.green700),
                          ),
                        ),
                      ],
                      if (showOwnerActions && onDelete != null) ...[
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: onDelete,
                          borderRadius: BorderRadius.circular(20),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.delete_outline, size: 16, color: Colors.red),
                          ),
                        ),
                      ],
                      const Spacer(),
                      Flexible(
                        child: Text(
                          listing.landlordName.isEmpty ? 'Landlord' : listing.landlordName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: UnaColors.text500, fontSize: 10),
                        ),
                      ),
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
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(3),
        ),
        child: Text(
          text,
          style: TextStyle(color: foreground, fontSize: 9, fontWeight: FontWeight.w600),
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
