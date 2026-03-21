const AppCache = {
  
  // Cache stores
  listings: new Map(),
  listingExpiry: new Map(),
  
  users: new Map(),
  userExpiry: new Map(),
  
  chats: new Map(),
  chatExpiry: new Map(),
  messages: new Map(),
  
  // Page state cache
  pages: new Map(),
  pageExpiry: new Map(),
  
  // Default TTL: 5 minutes for data, 30 minutes for page state
  CACHE_TTL: 5 * 60 * 1000,
  PAGE_CACHE_TTL: 30 * 60 * 1000,
  
  /**
   * Get an item from cache
   * @param {string} type - Cache type (listings, users, chats, pages)
   * @param {string} key - Cache key
   * @returns {any} - Cached data or null
   */
  get(type, key) {
    const cache = this[`${type}Expiry`];
    const data = this[type]?.get(key);
    
    if (!data) return null;
    
    const expiry = cache?.get(key);
    const ttl = type === 'pages' ? this.PAGE_CACHE_TTL : this.CACHE_TTL;
    
    if (expiry && Date.now() > expiry) {
      this[type]?.delete(key);
      cache?.delete(key);
      return null;
    }
    
    return data;
  },
  
  /**
   * Set an item in cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} customTTL - Optional custom TTL
   */
  set(type, key, data, customTTL = null) {
    if (!this[type]) return;
    
    this[type].set(key, data);
    const expiryMap = this[`${type}Expiry`];
    if (expiryMap) {
      const ttl = customTTL || (type === 'pages' ? this.PAGE_CACHE_TTL : this.CACHE_TTL);
      expiryMap.set(key, Date.now() + ttl);
    }
    
    // Also store in sessionStorage for persistence across refreshes
    try {
      const cacheData = {
        data,
        expiry: Date.now() + (type === 'pages' ? this.PAGE_CACHE_TTL : this.CACHE_TTL)
      };
      sessionStorage.setItem(`${type}_${key}`, JSON.stringify(cacheData));
    } catch (e) {
      // Ignore storage errors
    }
  },
  
  /**
   * Get page state with special handling
   * @param {string} path - Page path
   * @returns {object|null} - Page state or null
   */
  getPage(path) {
    return this.get('pages', path);
  },
  
  /**
   * Save page state
   * @param {string} path - Page path
   * @param {object} state - Page state
   * @param {number} customTTL - Optional custom TTL
   */
  setPage(path, state, customTTL = null) {
    this.set('pages', path, state, customTTL);
  },
  
  /**
   * Preload data into cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @returns {Promise<any>} - Cached or fetched data
   */
  preload(type, key, fetchFn) {
    const cached = this.get(type, key);
    if (cached) return Promise.resolve(cached);
    
    return fetchFn().then(data => {
      this.set(type, key, data);
      return data;
    });
  },
  
  /**
   * Clear cache
   * @param {string} type - Optional cache type
   * @param {string} key - Optional specific key
   */
  clear(type, key) {
    if (type && key) {
      // Clear specific item
      this[type]?.delete(key);
      this[`${type}Expiry`]?.delete(key);
      sessionStorage.removeItem(`${type}_${key}`);
      localStorage.removeItem(`route_${key}`); // Also clear route cache
    } else if (type) {
      // Clear entire cache type
      this[type]?.clear();
      this[`${type}Expiry`]?.clear();
      
      // Clear from sessionStorage
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(`${type}_`)) {
          sessionStorage.removeItem(k);
        }
      });
    } else {
      // Clear everything
      ['listings', 'users', 'chats', 'messages', 'pages'].forEach(t => {
        this[t]?.clear();
        this[`${t}Expiry`]?.clear();
      });
      
      // Clear all storage
      Object.keys(sessionStorage).forEach(k => {
        if (k.includes('_')) {
          sessionStorage.removeItem(k);
        }
      });
    }
  },
  
  /**
   * Check if cache is still valid
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {boolean} - Whether cache is valid
   */
  isValid(type, key) {
    const expiry = this[`${type}Expiry`]?.get(key);
    return expiry && Date.now() < expiry;
  },
  
  /**
   * Get cache age in milliseconds
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {number|null} - Age in ms or null
   */
  getAge(type, key) {
    const expiry = this[`${type}Expiry`]?.get(key);
    if (!expiry) return null;
    return Date.now() - (expiry - (type === 'pages' ? this.PAGE_CACHE_TTL : this.CACHE_TTL));
  },
  
  /**
   * Initialize cache from sessionStorage
   */
  init() {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const [type, ...idParts] = key.split('_');
        const id = idParts.join('_');
        
        if (type && id && this[type]) {
          const cached = JSON.parse(sessionStorage.getItem(key));
          if (cached.expiry > Date.now()) {
            this[type].set(id, cached.data);
            this[`${type}Expiry`].set(id, cached.expiry);
          }
        }
      }
      
    } catch (e) {
      console.warn('⚠️ Cache initialization error:', e);
    }
  },
  
  /**
   * Get cache stats
   * @returns {object} - Cache statistics
   */
  getStats() {
    return {
      listings: this.listings.size,
      users: this.users.size,
      chats: this.chats.size,
      messages: this.messages.size,
      pages: this.pages.size,
      total: this.listings.size + this.users.size + this.chats.size + this.messages.size + this.pages.size
    };
  }
};

// Initialize cache
AppCache.init();

// Make globally available
window.AppCache = AppCache;

// Optional: Enable debug logging via localStorage flag
// Add ?debug=true to URL or set localStorage.debug_mode = 'true' to see cache stats
const isDebugMode = () => {
  return localStorage.getItem('debug_mode') === 'true' ||
    new URLSearchParams(window.location.search).has('debug');
};

// Log cache stats periodically if in debug mode
setInterval(() => {
  if (isDebugMode()) {
    
  }
}, 60000); // Every minute