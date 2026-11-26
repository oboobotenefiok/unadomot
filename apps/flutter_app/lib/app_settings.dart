import 'package:flutter/material.dart';

final ValueNotifier<ThemeMode> appThemeMode = ValueNotifier(ThemeMode.light);
final ValueNotifier<bool> appHighContrast = ValueNotifier(false);
final ValueNotifier<bool> appLargeText = ValueNotifier(false);
