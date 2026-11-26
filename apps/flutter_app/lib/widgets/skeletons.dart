import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme.dart';

class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;

  const SkeletonBox({
    super.key,
    this.width,
    required this.height,
    this.radius = 8,
  });

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: dark ? const Color(0xFF1F2A24) : const Color(0xFFE8ECE9),
      highlightColor: dark ? const Color(0xFF2C3A32) : const Color(0xFFF7F9F7),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

class ListingCardSkeleton extends StatelessWidget {
  const ListingCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SkeletonBox(height: 170, radius: 0),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(child: SkeletonBox(height: 16)),
                      const SizedBox(width: 12),
                      SkeletonBox(width: 72, height: 22, radius: 4),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const SkeletonBox(width: 140, height: 12),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const SkeletonBox(width: 18, height: 18, radius: 9),
                      const SizedBox(width: 8),
                      const SkeletonBox(width: 90, height: 12),
                      const Spacer(),
                      const SkeletonBox(width: 24, height: 24, radius: 12),
                      const SizedBox(width: 8),
                      const SkeletonBox(width: 24, height: 24, radius: 12),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class ListingSkeletonList extends StatelessWidget {
  final int count;

  const ListingSkeletonList({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) => ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: count,
        itemBuilder: (context, index) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: ListingCardSkeleton(),
        ),
      );
}

class DetailSkeleton extends StatelessWidget {
  const DetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBox(height: 240),
          SizedBox(height: 16),
          SkeletonBox(height: 24, width: 220),
          SizedBox(height: 10),
          SkeletonBox(height: 14, width: 160),
          SizedBox(height: 20),
          SkeletonBox(height: 14),
          SizedBox(height: 8),
          SkeletonBox(height: 14),
          SizedBox(height: 8),
          SkeletonBox(height: 14, width: 240),
          SizedBox(height: 24),
          SkeletonBox(height: 96),
        ],
      );
}
