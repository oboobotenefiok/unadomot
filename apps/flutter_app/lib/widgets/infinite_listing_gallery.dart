import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../theme.dart';

/// Bounded photo gallery for a single listing.
///
/// Shows exactly the photos attached to the listing, with a page counter and
/// dot indicators. The class keeps its historical name so existing call sites
/// do not change, but it no longer loops or pads the slide count.
class InfiniteListingGallery extends StatefulWidget {
  final List<ListingMedia> media;

  const InfiniteListingGallery({super.key, required this.media});

  @override
  State<InfiniteListingGallery> createState() => _InfiniteListingGalleryState();
}

class _InfiniteListingGalleryState extends State<InfiniteListingGallery> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = widget.media;

    if (media.isEmpty) {
      return Container(
        height: 240,
        color: UnaColors.green100,
        child: const Center(
          child: Icon(Icons.home_work_outlined, size: 72, color: UnaColors.green700),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 260,
          child: PageView.builder(
            controller: _controller,
            itemCount: media.length,
            onPageChanged: (index) => setState(() => _index = index),
            itemBuilder: (context, index) => Image.network(
              media[index].url,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stack) => Container(
                color: UnaColors.green100,
                child: const Center(
                  child: Icon(Icons.broken_image_outlined, color: UnaColors.green700),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ...List.generate(media.length, (index) {
                final active = index == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? UnaColors.green700 : UnaColors.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
              const SizedBox(width: 10),
              Text(
                '${_index + 1} / ${media.length}',
                style: const TextStyle(
                  color: UnaColors.text600,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
