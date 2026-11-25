import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unadomot/main.dart';

void main() {
  testWidgets('shows sign-in screen before authentication', (tester) async {
    await tester.pumpWidget(const UnaDomotApp());
    expect(find.text('Sign in'), findsOneWidget);
  });
}
