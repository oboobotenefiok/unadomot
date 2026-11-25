import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:unadomot/data/local_cache.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('caches and restores listing summaries', () async {
    final cache = LocalCache(databasePath: inMemoryDatabasePath);
    addTearDown(cache.close);

    await cache.cacheListings([
      {'id': 'one', 'title': 'Flat', 'price': 800000},
    ]);
    final cached = await cache.readListings();

    expect(cached, isNotNull);
    expect(cached!.listings.single['title'], 'Flat');
  });

  test('stores favorites and drafts', () async {
    final cache = LocalCache(databasePath: inMemoryDatabasePath);
    addTearDown(cache.close);

    await cache.setFavorite('one', true);
    expect(await cache.isFavorite('one'), isTrue);
    await cache.setFavorite('one', false);
    expect(await cache.isFavorite('one'), isFalse);

    await cache.saveDraft('new-listing', {'title': 'Draft flat'});
    expect((await cache.readDraft('new-listing'))!['title'], 'Draft flat');
    await cache.clearDraft('new-listing');
    expect(await cache.readDraft('new-listing'), isNull);
  });
}
