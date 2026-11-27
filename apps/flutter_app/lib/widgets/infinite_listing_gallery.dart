import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../theme.dart';

class InfiniteListingGallery extends StatefulWidget {
  final List<ListingMedia> media;

  const InfiniteListingGallery({super.key, required this.media});

  @override
  State<InfiniteListingGallery> createState() => _InfiniteListingGalleryState();
}

class _InfiniteListingGalleryState extends State<InfiniteListingGallery> {
  static const _slideCount = 100;
  static const _firstSlide = 1;
  static const _lastSlide = 100;

  late final PageController _controller = PageController(initialPage: _firstSlide);
  int _slide = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  int _mediaIndexFor(int page) {
    if (page == 0) return _slideCount - 1;
    if (page == _slideCount + 1) return 0;
    return page - 1;
  }

  void _handlePageChanged(int page) {
    if (page == 0) {
      _controller.jumpToPage(_lastSlide);
      setState(() => _slide = _slideCount - 1);
      return;
    }
    if (page == _slideCount + 1) {
      _controller.jumpToPage(_firstSlide);
      setState(() => _slide = 0);
      return;
    }
    setState(() => _slide = page - 1);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.media.isEmpty) {
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
            itemCount: _slideCount + 2,
            onPageChanged: _handlePageChanged,
            itemBuilder: (context, page) {
              final mediaIndex = _mediaIndexFor(page) % widget.media.length;
              return Image.network(widget.media[mediaIndex].url, fit: BoxFit.cover);
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            '${_slide + 1} / $_slideCount',
            style: const TextStyle(
              color: UnaColors.text600,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
