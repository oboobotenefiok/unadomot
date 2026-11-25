import 'package:flutter_test/flutter_test.dart';
import 'package:unadomot/models/listing.dart';

void main() {
  test('parses decimal price strings from the API', () {
    final listing = Listing.fromJson({
      'id': 'one',
      'title': 'Flat',
      'price': '800000.00',
      'state': 'Rivers',
      'lga': 'Obio/Akpor',
      'media': [],
    });

    expect(listing.price, 800000);
    expect(listing.lga, 'Obio/Akpor');
  });
}
