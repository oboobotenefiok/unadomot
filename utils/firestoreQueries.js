// utils/firestoreQueries.js
const FirestoreQueries = {
  /**
   * Execute a Firestore query with automatic fallback to JS sorting when indexes are missing
   * @param {Object} options - Query options
   * @param {string} options.collection - Collection name
   * @param {Array} options.where - Array of where conditions [[field, operator, value], ...]
   * @param {string} options.orderBy - Field to order by
   * @param {string} options.orderDirection - 'asc' or 'desc'
   * @param {number} options.limit - Maximum number of documents to return
   * @param {Object} options.startAfter - Document to start after (for pagination)
   * @param {Function} options.mapFn - Optional mapping function for results
   * @param {Object} options.ref - Optional document reference for subcollections
   * @returns {Promise<Object>} - { data: Array, lastVisible: Object, hasMore: boolean, usingIndex: boolean }
   */
  async query(options) {
    const {
      collection,
      where = [],
      orderBy = null,
      orderDirection = 'desc',
      limit = 30,
      startAfter = null,
      mapFn = null,
      ref = null
    } = options;

    let usingIndex = true;
    let snapshot;
    let collectionRef;

    // Determine collection reference (main collection or subcollection)
    if (ref) {
      collectionRef = ref.collection(collection);
    } else {
      collectionRef = db.collection(collection);
    }

    try {
      // Try with index first
      let query = collectionRef;

      // Apply where clauses
      where.forEach(w => {
        query = query.where(w[0], w[1], w[2]);
      });

      // Apply orderBy if specified
      if (orderBy) {
        query = query.orderBy(orderBy, orderDirection);
      }

      // Apply limit
      query = query.limit(limit);

      // Apply pagination
      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      snapshot = await query.get();
    } catch (indexError) {
      // Index missing - fall back to JS sorting
      
      usingIndex = false;

      // Build fallback query without orderBy
      let fallbackQuery = collectionRef;

      where.forEach(w => {
        fallbackQuery = fallbackQuery.where(w[0], w[1], w[2]);
      });

      const fallbackSnapshot = await fallbackQuery.get();
      
      // Convert to array and sort in JS
      let docs = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Manual sorting
      if (orderBy) {
        docs.sort((a, b) => {
          const aVal = a[orderBy]?.seconds || a[orderBy] || 0;
          const bVal = b[orderBy]?.seconds || b[orderBy] || 0;
          
          if (orderDirection === 'desc') {
            return bVal - aVal;
          } else {
            return aVal - bVal;
          }
        });
      }

      // Manual pagination
      const startIndex = startAfter ? limit : 0;
      const paginatedDocs = docs.slice(startIndex, startIndex + limit);

      // Create fake snapshot
      snapshot = {
        docs: paginatedDocs.map(data => ({
          id: data.id,
          data: () => data,
          exists: true
        })),
        empty: paginatedDocs.length === 0,
        size: paginatedDocs.length
      };
    }

    // Process results
    const data = snapshot.docs.map(doc => 
      mapFn ? mapFn(doc) : { id: doc.id, ...doc.data() }
    );

    const lastVisible = usingIndex && snapshot.docs.length > 0 
      ? snapshot.docs[snapshot.docs.length - 1] 
      : { offset: (startAfter?.offset || 0) + limit };

    const hasMore = usingIndex 
      ? snapshot.docs.length === limit
      : data.length === limit;

    return {
      data,
      lastVisible,
      hasMore,
      usingIndex
    };
  },

  /**
   * Listen to a collection with real-time updates and fallback
   * @param {Object} options - Same as query options
   * @param {Function} callback - Function to call with updates
   * @returns {Function} Unsubscribe function
   */
  listen(options, callback) {
    const {
      collection,
      where = [],
      orderBy = null,
      orderDirection = 'desc',
      limit = 30,
      ref = null
    } = options;

    let collectionRef;
    if (ref) {
      collectionRef = ref.collection(collection);
    } else {
      collectionRef = db.collection(collection);
    }

    // Build query
    let query = collectionRef;
    where.forEach(w => {
      query = query.where(w[0], w[1], w[2]);
    });
    
    if (orderBy) {
      query = query.orderBy(orderBy, orderDirection);
    }
    query = query.limit(limit);

    // Try with index first
    try {
      return query.onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback({ data, usingIndex: true, loading: false });
      }, async (error) => {
        // Index missing - use polling fallback
        
        
        const pollInterval = setInterval(async () => {
          const result = await this.query(options);
          callback({ ...result, loading: false });
        }, 30000);

        return () => clearInterval(pollInterval);
      });
    } catch (error) {
      // Fallback to polling
      const pollInterval = setInterval(async () => {
        const result = await this.query(options);
        callback({ ...result, loading: false });
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  },

  /**
   * Get a single document by ID
   */
  async getDoc(collection, docId, ref = null) {
    const collectionRef = ref ? ref.collection(collection) : db.collection(collection);
    const doc = await collectionRef.doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /**
   * Get multiple documents by IDs
   */
  async getDocs(collection, ids, ref = null) {
    if (!ids.length) return [];
    
    const results = [];
    const batchSize = 10;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const collectionRef = ref ? ref.collection(collection) : db.collection(collection);
      const snapshot = await collectionRef.where('__name__', 'in', batch).get();
      
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
    }
    
    return results;
  }
};

window.FirestoreQueries = FirestoreQueries;