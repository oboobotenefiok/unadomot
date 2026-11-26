import 'package:flutter/material.dart';

class UnaColors {
  static const page = Color(0xFFF0FDF4);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF052E16);
  static const primaryHover = Color(0xFF166534);
  static const green900 = Color(0xFF14532D);
  static const green700 = Color(0xFF15803D);
  static const green600 = Color(0xFF16A34A);
  static const green500 = Color(0xFF22C55E);
  static const green100 = Color(0xFFDCFCE7);
  static const green200 = Color(0xFFBBF7D0);
  static const text900 = Color(0xFF111827);
  static const text700 = Color(0xFF374151);
  static const text600 = Color(0xFF4B5563);
  static const text500 = Color(0xFF6B7280);
  static const border = Color(0xFFE5E7EB);
  static const error = Color(0xFFB91C1C);
}

ThemeData unaTheme() {
  const scheme = ColorScheme.light(
    primary: UnaColors.primary,
    onPrimary: Colors.white,
    secondary: UnaColors.green700,
    onSecondary: Colors.white,
    surface: UnaColors.surface,
    onSurface: UnaColors.text900,
    error: UnaColors.error,
    onError: Colors.white,
    outline: UnaColors.border,
    outlineVariant: UnaColors.border,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: UnaColors.page,
    fontFamily: 'Roboto',
  );

  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: UnaColors.surface,
      foregroundColor: UnaColors.text900,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: UnaColors.text900,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardThemeData(
      color: UnaColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: UnaColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.green600, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: UnaColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(44, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: UnaColors.green700),
    ),
    dividerColor: UnaColors.border,
  );
}
