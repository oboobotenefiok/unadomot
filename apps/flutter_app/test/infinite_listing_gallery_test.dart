import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unadomot/widgets/infinite_listing_gallery.dart';

void main() {
  testWidgets('shows the placeholder when a listing has no media', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: InfiniteListingGallery(media: []),
        ),
      ),
    );

    expect(find.byIcon(Icons.home_work_outlined), findsOneWidget);
  });
}
