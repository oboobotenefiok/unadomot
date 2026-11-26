import 'dart:math';
import '../models/listing.dart';

class FeedRanker {
  static List<Listing> rank({
    required List<Listing> listings,
    required Map<String, double> affinity,
    required Set<String> favorites,
  }) {
    final random = Random();
    final scored = listings.map((listing) {
      var score = 0.0;

      score += (affinity['type_${listing.propertyType}'] ?? 0) * 6;
      score += (affinity['state_${listing.state}'] ?? 0) * 3;
      score += (affinity['lga_${listing.lga}'] ?? 0) * 2;
      score += (affinity['bed_${listing.bedrooms}'] ?? 0) * 2.5;
      score += (affinity['price_${_priceBand(listing.price)}'] ?? 0) * 2;

      if (favorites.contains(listing.id)) score += 28;
      if (listing.landlordVerified) score += 9;
      if (listing.isAgentListing) score += 2;

      score += listing.media.length.clamp(0, 6) * 1.8;
      score += (listing.description.length / 140).clamp(0, 1) * 7;
      if (listing.bedrooms != null) score += 2;
      if (listing.bathrooms != null) score += 1.5;
      if (listing.furnishing != null && listing.furnishing!.isNotEmpty) score += 2;

      score += random.nextDouble() * 16;
      return _ScoredListing(listing, score);
    }).toList()
      ..sort((a, b) => b.score.compareTo(a.score));

    final result = <Listing>[];
    final stateCount = <String, int>{};
    final landlordCount = <String, int>{};

    while (scored.isNotEmpty) {
      var bestIndex = 0;
      var bestAdjusted = double.negativeInfinity;

      for (var i = 0; i < scored.length; i++) {
        final item = scored[i];
        final statePenalty = (stateCount[item.listing.state] ?? 0) * 4.5;
        final landlordPenalty =
            (landlordCount[item.listing.landlordName] ?? 0) * 5.5;
        final adjusted = item.score - statePenalty - landlordPenalty;
        if (adjusted > bestAdjusted) {
          bestAdjusted = adjusted;
          bestIndex = i;
        }
      }

      final chosen = scored.removeAt(bestIndex);
      result.add(chosen.listing);
      stateCount[chosen.listing.state] =
          (stateCount[chosen.listing.state] ?? 0) + 1;
      landlordCount[chosen.listing.landlordName] =
          (landlordCount[chosen.listing.landlordName] ?? 0) + 1;
    }

    return result;
  }

  static Map<String, double> affinityFor(Listing listing) => {
        if (listing.propertyType != null)
          'type_${listing.propertyType}': 4,
        'state_${listing.state}': 2,
        'lga_${listing.lga}': 1.5,
        if (listing.bedrooms != null) 'bed_${listing.bedrooms}': 2,
        'price_${_priceBand(listing.price)}': 1.5,
      };

  static String _priceBand(double price) {
    if (price < 100000) return 'low';
    if (price < 300000) return 'mid';
    if (price < 700000) return 'high';
    return 'premium';
  }
}

class _ScoredListing {
  final Listing listing;
  final double score;

  const _ScoredListing(this.listing, this.score);
}
