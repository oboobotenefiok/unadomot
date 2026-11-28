import 'dart:async';
import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../theme.dart';

/// Home page hero carousel.
///
/// Loops through a fixed 100 slides, wrapping seamlessly at both ends, and
/// maps each slide onto the available listings. This is the infinite carousel
/// that used to sit on the listing detail page.
class HomeCarousel extends StatefulWidget {
  final List<Listing> listings;
  final ValueChanged<Listing> onTap;

  const HomeCarousel({
    super.key,
    required this.listings,
    required this.onTap,
  });

  @override
  State<HomeCarousel> createState() => _HomeCarouselState();
}

class _HomeCarouselState extends State<HomeCarousel> {
  static const _slideCount = 100;
  static const _firstSlide = 1;
  static const _lastSlide = 100;

  late final PageController _controller =
      PageController(viewportFraction: 0.9, initialPage: _firstSlide);
  Timer? _timer;
  int _slide = 0;

  @override
  void initState() {
    super.initState();
    _startAutoscroll();
  }

  @override
  void didUpdateWidget(covariant HomeCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.listings.length != widget.listings.length) {
      _slide = 0;
      if (_controller.hasClients) _controller.jumpToPage(_firstSlide);
      _startAutoscroll();
    }
  }

  void _startAutoscroll() {
    _timer?.cancel();
    if (widget.listings.length < 2) return;
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_controller.hasClients) return;
      _controller.nextPage(
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    });
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
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.listings.isEmpty) return const SizedBox.shrink();

    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Column(
        children: [
          SizedBox(
            height: 190,
            child: PageView.builder(
              controller: _controller,
              itemCount: _slideCount + 2,
              onPageChanged: _handlePageChanged,
              itemBuilder: (context, page) {
                final listing = widget.listings[page % widget.listings.length];
                final image = listing.media.isEmpty ? null : listing.media.first.url;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: GestureDetector(
                    onTap: () => widget.onTap(listing),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (image == null)
                            Container(color: UnaColors.green100)
                          else
                            Image.network(
                              image,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stack) =>
                                  Container(color: UnaColors.green100),
                            ),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.72),
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            left: 14,
                            right: 14,
                            bottom: 14,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  listing.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₦${listing.price.toStringAsFixed(0)} • ${listing.lga}, ${listing.state}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${_slide + 1} / $_slideCount',
            style: const TextStyle(
              color: UnaColors.text600,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
