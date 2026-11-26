import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

class CachedListings {
  final List<Map<String, dynamic>> listings;
  final DateTime updatedAt;

  const CachedListings(this.listings, this.updatedAt);
}

class CachedDetail {
  final Map<String, dynamic> listing;
  final DateTime updatedAt;

  const CachedDetail(this.listing, this.updatedAt);
}

class LocalCache {
  final String? databasePath;
  Database? _database;

  LocalCache({this.databasePath});

  Future<Database> get _db async {
    if (_database != null) return _database!;
    final path = databasePath ??
        p.join(await getDatabasesPath(), 'unadomot_cache.db');
    _database = await openDatabase(
      path,
      version: 3,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE cached_listings (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE listing_details (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE favorites (
            listing_id TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE drafts (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE affinity (
            key TEXT PRIMARY KEY,
            score REAL NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        ''');
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await db.execute('''
            CREATE TABLE affinity (
              key TEXT PRIMARY KEY,
              score REAL NOT NULL,
              updated_at INTEGER NOT NULL
            )
          ''');
        }
        if (oldVersion < 3) {
          await db.execute('''
            CREATE TABLE settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )
          ''');
        }
      },
    );
    return _database!;
  }

  Future<String?> getSetting(String key) async {
    final db = await _db;
    final rows = await db.query('settings', where: 'key = ?', whereArgs: [key], limit: 1);
    if (rows.isEmpty) return null;
    return rows.first['value'] as String;
  }

  Future<void> setSetting(String key, String value) async {
    final db = await _db;
    await db.insert(
      'settings',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> cacheListings(List<Map<String, dynamic>> listings) async {
    final db = await _db;
    final now = DateTime.now().millisecondsSinceEpoch;
    final batch = db.batch();
    for (final listing in listings) {
      batch.insert(
        'cached_listings',
        {
          'id': listing['id'],
          'payload': jsonEncode(listing),
          'updated_at': now,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<CachedListings?> readListings() async {
    final db = await _db;
    final rows = await db.query('cached_listings', orderBy: 'updated_at DESC');
    if (rows.isEmpty) return null;
    return CachedListings(
      rows
          .map((row) =>
              Map<String, dynamic>.from(jsonDecode(row['payload'] as String)))
          .toList(),
      DateTime.fromMillisecondsSinceEpoch(rows.first['updated_at'] as int),
    );
  }

  Future<void> cacheDetail(Map<String, dynamic> listing) async {
    final db = await _db;
    await db.insert(
      'listing_details',
      {
        'id': listing['id'],
        'payload': jsonEncode(listing),
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<CachedDetail?> readDetail(String id) async {
    final db = await _db;
    final rows = await db.query(
      'listing_details',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.first;
    return CachedDetail(
      Map<String, dynamic>.from(jsonDecode(row['payload'] as String)),
      DateTime.fromMillisecondsSinceEpoch(row['updated_at'] as int),
    );
  }

  Future<bool> isFavorite(String listingId) async {
    final db = await _db;
    final rows = await db.query(
      'favorites',
      where: 'listing_id = ?',
      whereArgs: [listingId],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  Future<Set<String>> readFavoriteIds() async {
    final db = await _db;
    final rows = await db.query('favorites', orderBy: 'created_at DESC');
    return rows.map((row) => row['listing_id'] as String).toSet();
  }

  Future<void> setFavorite(String listingId, bool favorite) async {
    final db = await _db;
    if (favorite) {
      await db.insert(
        'favorites',
        {
          'listing_id': listingId,
          'created_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } else {
      await db.delete('favorites', where: 'listing_id = ?', whereArgs: [listingId]);
    }
  }

  Future<Map<String, double>> readAffinity() async {
    final db = await _db;
    final rows = await db.query('affinity');
    return {
      for (final row in rows)
        row['key'] as String: (row['score'] as num).toDouble(),
    };
  }

  Future<void> addAffinity(Map<String, double> deltas) async {
    if (deltas.isEmpty) return;
    final db = await _db;
    final now = DateTime.now().millisecondsSinceEpoch;
    final batch = db.batch();
    for (final entry in deltas.entries) {
      batch.rawInsert(
        '''
        INSERT INTO affinity (key, score, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          score = score + excluded.score,
          updated_at = excluded.updated_at
        ''',
        [entry.key, entry.value, now],
      );
    }
    await batch.commit(noResult: true);
  }

  Future<void> saveDraft(String id, Map<String, dynamic> draft) async {
    final db = await _db;
    await db.insert(
      'drafts',
      {
        'id': id,
        'payload': jsonEncode(draft),
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> readDraft(String id) async {
    final db = await _db;
    final rows = await db.query('drafts', where: 'id = ?', whereArgs: [id], limit: 1);
    if (rows.isEmpty) return null;
    return Map<String, dynamic>.from(jsonDecode(rows.first['payload'] as String));
  }

  Future<void> clearDraft(String id) async {
    final db = await _db;
    await db.delete('drafts', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
