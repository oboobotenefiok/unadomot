class Listing {
  final String id;
  final String title;
  final String description;
  final double price;
  final String address;
  final String state;
  final String lga;
  final bool isAgentListing;
  final String status;
  final int? bedrooms;
  final int? bathrooms;
  final String? propertyType;
  final String? furnishing;
  final List<ListingMedia> media;

  const Listing({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.address,
    required this.state,
    required this.lga,
    required this.isAgentListing,
    required this.status,
    required this.media,
    this.bedrooms,
    this.bathrooms,
    this.propertyType,
    this.furnishing,
  });

  factory Listing.fromJson(Map<String, dynamic> json) => Listing(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String? ?? '',
        price: (json['price'] as num?)?.toDouble() ?? 0,
        address: json['address'] as String? ?? '',
        state: json['state'] as String? ?? '',
        lga: json['lga'] as String? ?? '',
        isAgentListing: json['is_agent_listing'] as bool? ?? false,
        status: json['status'] as String? ?? 'available',
        bedrooms: json['bedrooms'] as int?,
        bathrooms: json['bathrooms'] as int?,
        propertyType: json['property_type'] as String?,
        furnishing: json['furnishing'] as String?,
        media: (json['media'] as List? ?? const [])
            .map((item) => ListingMedia.fromJson(
                Map<String, dynamic>.from(item as Map)))
            .toList(),
      );
}

class ListingMedia {
  final String id;
  final String url;
  final String? altText;
  final int position;

  const ListingMedia({
    required this.id,
    required this.url,
    required this.position,
    this.altText,
  });

  factory ListingMedia.fromJson(Map<String, dynamic> json) => ListingMedia(
        id: json['id'] as String,
        url: json['url'] as String? ?? '',
        altText: json['alt_text'] as String?,
        position: (json['position'] as num?)?.toInt() ?? 0,
      );
}
