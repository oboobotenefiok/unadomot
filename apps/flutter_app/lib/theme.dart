import 'package:flutter/material.dart';

class UnaColors {
  static const page = Color(0xFFF0FDF4);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF14532D);
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

  // Dark surfaces, shared so screens stop inventing their own hex values.
  static const darkPage = Color(0xFF0B1120);
  static const darkSurface = Color(0xFF111827);
  static const darkSurfaceAlt = Color(0xFF1B2434);
  static const darkBorder = Color(0xFF263244);
  static const darkText = Color(0xFFF3F4F6);
  static const darkTextMuted = Color(0xFF9CA3AF);
}

/// Semantic colours resolved from the active brightness.
///
/// Screens should reach for these instead of the raw light constants, which
/// is what made dark mode leak white cards and near-black text.
extension UnaThemeX on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  Color get pageColor => isDark ? UnaColors.darkPage : UnaColors.page;
  Color get cardColor => isDark ? UnaColors.darkSurface : UnaColors.surface;
  Color get subtleSurface =>
      isDark ? UnaColors.darkSurfaceAlt : const Color(0xFFF9FAFB);
  Color get hairline => isDark ? UnaColors.darkBorder : UnaColors.border;
  Color get bodyText => isDark ? UnaColors.darkText : UnaColors.text900;
  Color get mutedText => isDark ? UnaColors.darkTextMuted : UnaColors.text600;
  Color get chipBackground =>
      isDark ? const Color(0xFF14301F) : UnaColors.green100;
  Color get chipForeground => isDark ? UnaColors.green200 : UnaColors.green900;
  Color get accent => isDark ? UnaColors.green500 : UnaColors.green700;
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
        backgroundColor: UnaColors.green700,
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

ThemeData unaHighContrastTheme() {
  const scheme = ColorScheme.highContrastLight(
    primary: Colors.black,
    onPrimary: Colors.white,
    secondary: Color(0xFF004D1A),
    onSecondary: Colors.white,
    surface: Colors.white,
    onSurface: Colors.black,
    error: Color(0xFF8B0000),
    onError: Colors.white,
    outline: Colors.black,
    outlineVariant: Colors.black,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.white,
    fontFamily: 'Roboto',
  );

  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: Colors.black,
        fontSize: 19,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Colors.black, width: 1.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.black, width: 2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.black, width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Colors.black, width: 3),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        minimumSize: const Size(44, 50),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Colors.black,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    dividerColor: Colors.black,
    dividerTheme: const DividerThemeData(color: Colors.black, thickness: 1.5),
  );
}

/// Dark theme with the same component coverage as the light one.
///
/// Previously only the app bar and cards were themed, so inputs, dialogs,
/// sheets and dividers kept their light styling and flashed white.
ThemeData unaDarkTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: UnaColors.green600,
    brightness: Brightness.dark,
  ).copyWith(
    surface: UnaColors.darkSurface,
    onSurface: UnaColors.darkText,
    outline: UnaColors.darkBorder,
    outlineVariant: UnaColors.darkBorder,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: UnaColors.darkPage,
    fontFamily: 'Roboto',
  );

  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: UnaColors.darkSurface,
      foregroundColor: UnaColors.darkText,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: UnaColors.darkText,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
      iconTheme: IconThemeData(color: UnaColors.darkText),
    ),
    cardTheme: CardThemeData(
      color: UnaColors.darkSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: UnaColors.darkSurfaceAlt,
      hintStyle: const TextStyle(color: UnaColors.darkTextMuted),
      labelStyle: const TextStyle(color: UnaColors.darkTextMuted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.darkBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.darkBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: UnaColors.green500, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: UnaColors.green600,
        foregroundColor: Colors.white,
        minimumSize: const Size(44, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: UnaColors.green500),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: UnaColors.green200,
        side: const BorderSide(color: UnaColors.darkBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    dividerColor: UnaColors.darkBorder,
    dividerTheme: const DividerThemeData(color: UnaColors.darkBorder),
    dialogTheme: const DialogThemeData(
      backgroundColor: UnaColors.darkSurface,
      surfaceTintColor: Colors.transparent,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: UnaColors.darkSurface,
      surfaceTintColor: Colors.transparent,
      modalBackgroundColor: UnaColors.darkSurface,
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: UnaColors.darkSurfaceAlt,
      contentTextStyle: TextStyle(color: UnaColors.darkText),
      behavior: SnackBarBehavior.floating,
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: UnaColors.darkTextMuted,
      textColor: UnaColors.darkText,
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: UnaColors.darkSurfaceAlt,
      labelStyle: const TextStyle(color: UnaColors.darkText),
      side: const BorderSide(color: UnaColors.darkBorder),
    ),
    popupMenuTheme: const PopupMenuThemeData(
      color: UnaColors.darkSurface,
      surfaceTintColor: Colors.transparent,
    ),
  );
}
