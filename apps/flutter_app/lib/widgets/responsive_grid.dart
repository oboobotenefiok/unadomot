import 'package:flutter/material.dart';

SliverGridDelegate responsiveGridDelegate(
  BuildContext context, {
  double childAspectRatio = 0.66,
  double crossAxisSpacing = 12,
  double mainAxisSpacing = 12,
}) {
  final width = MediaQuery.sizeOf(context).width;
  final columns = width >= 1100
      ? 4
      : width >= 700
          ? 3
          : 2;
  return SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: columns,
    crossAxisSpacing: crossAxisSpacing,
    mainAxisSpacing: mainAxisSpacing,
    childAspectRatio: childAspectRatio,
  );
}

int responsiveColumns(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= 1100) return 4;
  if (width >= 700) return 3;
  return 2;
}
