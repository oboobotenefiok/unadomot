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
  final String? code;
  final List<String> amenities;
  final int viewCount;
  final String landlordName;
  final bool landlordVerified;
  final String? landlordPhotoUrl;
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
    this.code,
    this.amenities = const [],
    this.viewCount = 0,
    this.landlordName = '',
    this.landlordVerified = false,
    this.landlordPhotoUrl,
  });

  factory Listing.fromJson(Map<String, dynamic> json) => Listing(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String? ?? '',
        price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
        address: json['address'] as String? ?? '',
        state: json['state'] as String? ?? '',
        lga: json['lga'] as String? ?? '',
        isAgentListing: json['is_agent_listing'] as bool? ?? false,
        status: json['status'] as String? ?? 'available',
        bedrooms: json['bedrooms'] as int?,
        bathrooms: json['bathrooms'] as int?,
        propertyType: json['property_type'] as String?,
        furnishing: json['furnishing'] as String?,
        code: json['code'] as String?,
        amenities: (json['amenities'] as List? ?? const [])
            .map((item) => item.toString())
            .toList(),
        viewCount: (json['view_count'] as num?)?.toInt() ?? 0,
        landlordName: json['landlord_name'] as String? ?? '',
        landlordVerified: json['landlord_verified'] as bool? ?? false,
        landlordPhotoUrl: json['landlord_photo_url'] as String?,
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
