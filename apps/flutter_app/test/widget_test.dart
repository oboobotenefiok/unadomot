import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unadomot/main.dart';

void main() {
  testWidgets('one app supports renter and lister experiences', (tester) async {
    await tester.pumpWidget(const UnaDomotApp());
    expect(find.text('Find a rental'), findsOneWidget);
    await tester.tap(find.byType(SwitchListTile));
    await tester.pumpAndSettle();
    expect(find.text('Manage your listings'), findsOneWidget);
  });
}
