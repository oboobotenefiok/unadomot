// utils/favorites.js - COMPLETE WITH ALL FUNCTIONS

const FavoritesHelpers = {
  
  // ===== GLOBAL STATE =====
  _favorites: {},
  _listeners: [],
  _unsubscribe: null,
  _currentUserId: null,
  
  /**
   * Initialize favorites listener
   */
  initFavoritesListener: function(userId) {
    // Don't re-initialize if same user
    if (this._currentUserId === userId && this._unsubscribe) {
      
      return;
    }
    
    // Clean up existing listener
    if (this._unsubscribe) {
      
      this._unsubscribe();
      this._unsubscribe = null;
    }
    
    this._currentUserId = userId;
    
    if (!userId) {
            this._favorites = {};
      this._notifyListeners();
      return;
    }
    
    
    const userRef = db.collection('users').doc(userId);
    const favoritesRef = userRef.collection('favorites');
    
    this._unsubscribe = favoritesRef.onSnapshot((snapshot) => {
      
      
      // Build new favorites object
      const newFavorites = {};
      snapshot.docs.forEach(doc => {
        newFavorites[doc.id] = true;
      });
      
      this._favorites = newFavorites;
      
      // Update cache
      if (window.AppCache) {
        AppCache.set('favorites', `user_${userId}`, Object.keys(newFavorites));
      }
      
      // Notify all listeners
      this._notifyListeners();
      
    }, (error) => {
          });
  },
  
  /**
   * Notify all listeners
   */
  _notifyListeners: function() {
    const favoritesCopy = { ...this._favorites };
    this._listeners.forEach(callback => {
      try {
        callback(favoritesCopy);
      } catch (e) {
        
      }
    });
  },
  
  /**
   * Get current favorites
   */
  getCurrentFavorites: function() {
    return { ...this._favorites };
  },
  
  /**
   * Check if a specific listing is favorited
   */
  isFavorite: function(listingId) {
    return !!this._favorites[listingId];
  },
  
  /**
   * Subscribe to favorites changes
   */
  subscribeToFavorites: function(callback) {
    this._listeners.push(callback);
    
    // Call immediately with current value
    callback({ ...this._favorites });
    
    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  },

  /**
   * Toggle favorite status for a listing
   */
  toggleFavorite: async function(userId, listingId, optimisticCallback = null) {
    if (!userId) throw new Error('Must be logged in');
    
    // Call optimistic callback if provided
    if (optimisticCallback) {
      optimisticCallback(true);
    }
    
    const favoriteRef = db.collection('users').doc(userId)
      .collection('favorites').doc(listingId);
    
    try {
      const favoriteDoc = await favoriteRef.get();
      
      if (favoriteDoc.exists) {
        // Remove from favorites
        await favoriteRef.delete();
                
        // Clear cache
        if (window.AppCache) {
          AppCache.clear('favorites', `user_${userId}`);
          AppCache.clear('favorites', `${userId}_${listingId}`);
        }
        
        // Track analytics if available
        if (window.analytics) {
          window.analytics.track('favorite_removed', {
            userId,
            listingId
          });
        }
        
        // Dispatch event for other components
        this.dispatchFavoriteEvent(listingId, false, userId);
        
        return false;
      } else {
        // Add to favorites
        await favoriteRef.set({
          listingId: listingId,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        
        // Clear user favorites cache
        if (window.AppCache) {
          AppCache.clear('favorites', `user_${userId}`);
        }
        
        // Track analytics if available
        if (window.analytics) {
          window.analytics.track('favorite_added', {
            userId,
            listingId
          });
        }
        
        // Dispatch event for other components
        this.dispatchFavoriteEvent(listingId, true, userId);
        
        return true;
      }
    } catch (error) {
      
      
      // Revert optimistic update on error
      if (optimisticCallback) {
        optimisticCallback(false);
      }
      throw error;
    }
  },

  /**
   * Dispatch a favorite changed event
   */
  dispatchFavoriteEvent: function(listingId, isFavorite, userId) {
    const event = new CustomEvent('favorite-changed', {
      detail: { 
        listingId, 
        isFavorite, 
        userId,
        timestamp: Date.now()
      },
      bubbles: true
    });
    window.dispatchEvent(event);
    
  },

  /**
   * Check if a listing is favorited (with cache)
   */
  checkIsFavorite: async function(userId, listingId, useCache = true) {
    if (!userId) return false;
    
    // Check cache first
    if (useCache && window.AppCache) {
      const cached = AppCache.get('favorites', `${userId}_${listingId}`);
      if (cached !== null) return cached;
    }
    
    try {
      const favoriteRef = db.collection('users').doc(userId)
        .collection('favorites').doc(listingId);
      
      const favoriteDoc = await favoriteRef.get();
      const isFavorite = favoriteDoc.exists;
      
      // Update cache
      if (window.AppCache) {
        AppCache.set('favorites', `${userId}_${listingId}`, isFavorite);
      }
      
      return isFavorite;
    } catch (error) {
      
      return false;
    }
  },

  /**
   * Get fresh favorite status for a listing (skip cache)
   */
  getFreshFavoriteStatus: async function(userId, listingId) {
    if (!userId || !listingId) return false;
    
    try {
      const favoriteRef = db.collection('users').doc(userId)
        .collection('favorites').doc(listingId);
      
      const favoriteDoc = await favoriteRef.get();
      return favoriteDoc.exists;
    } catch (error) {
      console.error('Error getting fresh favorite status:', error);
      return false;
    }
  },

  /**
   * Get fresh favorite status for multiple listings at once
   */
  getFreshFavoritesForListings: async function(userId, listings) {
    if (!userId || !listings || !listings.length) return {};
    
    const results = {};
    
    // Process in batches to avoid too many requests
    const batchSize = 10;
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (listing) => {
        try {
          const favoriteRef = db.collection('users').doc(userId)
            .collection('favorites').doc(listing.id);
          
          const favoriteDoc = await favoriteRef.get();
          results[listing.id] = favoriteDoc.exists;
        } catch (e) {
          results[listing.id] = false;
        }
      }));
    }
    
    return results;
  },

  /**
   * Get all favorites for a user
   */
  getFavorites: async function(userId) {
    if (!userId) return [];
    
    // Check cache
    if (window.AppCache) {
      const cached = AppCache.get('favorites', `user_${userId}`);
      if (cached) return cached;
    }
    
    try {
      const userRef = db.collection('users').doc(userId);
      
      const result = await FirestoreQueries.query({
        collection: 'favorites',
        ref: userRef,
        orderBy: 'savedAt',
        orderDirection: 'desc',
        limit: 100
      });
      
      if (result.data.length === 0) return [];
      
      const favoriteIds = result.data.map(f => f.id);
      const savedAtMap = {};
      result.data.forEach(f => {
        savedAtMap[f.id] = f.savedAt;
      });
      
      // Get full listing details
      const listings = await FirestoreQueries.getDocs('listings', favoriteIds);
      
      // Add savedAt back to listings
      const enrichedListings = listings.map(listing => ({
        ...listing,
        savedAt: savedAtMap[listing.id]
      }));
      
      // Sort by savedAt (newest first)
      const sorted = enrichedListings.sort((a, b) => {
        const aTime = a.savedAt?.seconds || 0;
        const bTime = b.savedAt?.seconds || 0;
        return bTime - aTime;
      });
      
      // Update cache
      if (window.AppCache) {
        AppCache.set('favorites', `user_${userId}`, sorted);
      }
      
      return sorted;
      
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },

  /**
   * Listen to favorites in real-time - THIS WAS MISSING!
   */
  listenToFavorites: function(userId, callback) {
    if (!userId) return () => {};
    
    let listingCache = {};
    let favoritesList = [];
    let isLoading = true;
    
    const userRef = db.collection('users').doc(userId);
    const favoritesRef = userRef.collection('favorites').orderBy('savedAt', 'desc');
    
    const unsubscribeFavs = favoritesRef.onSnapshot(
      async function(snapshot) {
        if (isLoading) {
          callback({ loading: true, favorites: [] });
          isLoading = false;
        }
        
        const favoriteIds = snapshot.docs.map(doc => doc.id);
        const savedAtMap = {};
        snapshot.docs.forEach(doc => {
          savedAtMap[doc.id] = doc.data().savedAt;
        });
        
        // Fetch only new listings
        const idsToFetch = favoriteIds.filter(id => !listingCache[id]);
        
        if (idsToFetch.length > 0) {
          const fetchedListings = await FirestoreQueries.getDocs('listings', idsToFetch);
          fetchedListings.forEach(listing => {
            listingCache[listing.id] = listing;
          });
        }
        
        // Build favorites list
        favoritesList = favoriteIds
          .filter(id => listingCache[id])
          .map(id => ({
            ...listingCache[id],
            savedAt: savedAtMap[id]
          }));
        
        // Update cache
        if (window.AppCache) {
          AppCache.set('favorites', `user_${userId}`, favoritesList);
        }
        
        callback({ loading: false, favorites: favoritesList, usingIndex: true });
      },
      function(error) {
        console.error('Error in favorites listener:', error);
        
        // Fallback to polling
        const interval = setInterval(async () => {
          const favorites = await FavoritesHelpers.getFavorites(userId);
          callback({ loading: false, favorites, usingIndex: false });
        }, 30000);
        
        return () => clearInterval(interval);
      }
    );
    
    return function() {
      unsubscribeFavs();
    };
  },

  /**
   * Remove multiple favorites at once
   */
  batchRemoveFavorites: async function(userId, listingIds) {
    if (!userId || !listingIds.length) return;
    
    const batch = db.batch();
    const favoritesRef = db.collection('users').doc(userId).collection('favorites');
    
    listingIds.forEach(listingId => {
      batch.delete(favoritesRef.doc(listingId));
    });
    
    await batch.commit();
    
    // Clear cache
    if (window.AppCache) {
      AppCache.clear('favorites', `user_${userId}`);
      listingIds.forEach(id => {
        AppCache.clear('favorites', `${userId}_${id}`);
      });
    }
    
    // Dispatch events for each removed favorite
    listingIds.forEach(listingId => {
      this.dispatchFavoriteEvent(listingId, false, userId);
    });
  },

  /**
   * Toggle favorite from a popup element
   */
  toggleFavoriteFromPopup: async function(listingId, buttonElement) {
    // Check if user is logged in
    if (!window.auth?.currentUser) {
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Please log in to save favorites', type: 'error' }
      });
      window.dispatchEvent(toastEvent);
      
      if (window.__openAuthModal) {
        window.__openAuthModal('login', window.location.pathname);
      }
      return { success: false, newState: null };
    }
    
    const userId = window.auth.currentUser.uid;
    
    // Disable button during operation
    buttonElement.style.pointerEvents = 'none';
    buttonElement.style.opacity = '0.5';
    
    try {
      // DIRECT DATABASE ACCESS
      const favoriteRef = db.collection('users').doc(userId)
        .collection('favorites').doc(listingId);
      
      const favoriteDoc = await favoriteRef.get();
      let newState;
      
      if (favoriteDoc.exists) {
        await favoriteRef.delete();
        newState = false;
        
      } else {
        await favoriteRef.set({
          listingId: listingId,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newState = true;
        
      }
      
      // Update button appearance
      const svg = buttonElement.querySelector('svg');
      
      if (newState) {
        buttonElement.classList.add('text-red-500');
        buttonElement.classList.remove('text-gray-500');
        if (svg) svg.setAttribute('fill', 'currentColor');
        buttonElement.title = 'Remove from favorites';
      } else {
        buttonElement.classList.remove('text-red-500');
        buttonElement.classList.add('text-gray-500');
        if (svg) svg.setAttribute('fill', 'none');
        buttonElement.title = 'Save to favorites';
      }
      
      // Clear cache
      if (window.AppCache) {
        AppCache.clear('favorites', `user_${userId}`);
        AppCache.clear('favorites', `${userId}_${listingId}`);
      }
      
      // Dispatch event for other components
      this.dispatchFavoriteEvent(listingId, newState, userId);
      
      // Show success toast
      const toastEvent = new CustomEvent('show-toast', {
        detail: { 
          message: newState ? '✓ Saved to favorites' : '✓ Removed from favorites',
          type: 'success' 
        }
      });
      window.dispatchEvent(toastEvent);
      
      return { success: true, newState };
      
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Failed to update favorites', type: 'error' }
      });
      window.dispatchEvent(toastEvent);
      
      return { success: false, newState: null };
      
    } finally {
      buttonElement.style.pointerEvents = '';
      buttonElement.style.opacity = '';
    }
  }
};

// Make sure initFavoritesListener is called when auth state changes
if (window.auth) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      FavoritesHelpers.initFavoritesListener(user.uid);
    } else {
      FavoritesHelpers.initFavoritesListener(null);
    }
  });
}

// Make it globally available
window.FavoritesHelpers = FavoritesHelpers;
