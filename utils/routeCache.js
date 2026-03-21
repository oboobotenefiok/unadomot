// utils/routeCache.js - Enhanced route caching with localStorage persistence

const RouteCache = {
  // Cache storage
  _cache: new Map(),
  _expiry: new Map(),
  
  // Default TTL: 30 minutes
  DEFAULT_TTL: 30 * 60 * 1000,
  
  /**
   * Save route data to cache
   * @param {string} path - Route path
   * @param {object} data - Route data to cache
   * @param {number} ttl - Time to live in ms
   */
  set(path, data, ttl = this.DEFAULT_TTL) {
    const cacheKey = `route_${path}`;
    
    // Store in memory
    this._cache.set(cacheKey, data);
    this._expiry.set(cacheKey, Date.now() + ttl);
    
    // Store in localStorage for persistence
    try {
      const storageData = {
        data,
        expiry: Date.now() + ttl,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(storageData));
    } catch (e) {
      console.warn('Failed to save route to localStorage:', e);
    }
    
    
  },
  
  /**
   * Get route data from cache
   * @param {string} path - Route path
   * @returns {object|null} - Cached data or null
   */
  get(path) {
    const cacheKey = `route_${path}`;
    
    // Check memory cache first
    if (this._cache.has(cacheKey)) {
      const expiry = this._expiry.get(cacheKey);
      if (expiry > Date.now()) {
        return this._cache.get(cacheKey);
      } else {
        // Expired, clean up
        this._cache.delete(cacheKey);
        this._expiry.delete(cacheKey);
      }
    }
    
    // Check localStorage
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiry > Date.now()) {
          // Restore to memory cache
          this._cache.set(cacheKey, parsed.data);
          this._expiry.set(cacheKey, parsed.expiry);
          return parsed.data;
        } else {
          // Expired, remove
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn('Failed to read route from localStorage:', e);
    }
    
    return null;
  },
  
  /**
   * Check if route exists in cache
   * @param {string} path - Route path
   * @returns {boolean}
   */
  has(path) {
    return this.get(path) !== null;
  },
  
  /**
   * Remove route from cache
   * @param {string} path - Route path
   */
  remove(path) {
    const cacheKey = `route_${path}`;
    
    this._cache.delete(cacheKey);
    this._expiry.delete(cacheKey);
    
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      console.warn('Failed to remove route from localStorage:', e);
    }
    
    
  },
  
  /**
   * Clear all routes from cache
   */
  clear() {
    this._cache.clear();
    this._expiry.clear();
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('route_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear routes from localStorage:', e);
    }
    
    
  },
  
  /**
   * Get all cached routes
   * @returns {Array} - Array of cached route paths
   */
  getAll() {
    const routes = [];
    
    // Get from memory
    this._cache.forEach((_, key) => {
      routes.push(key.replace('route_', ''));
    });
    
    // Get from localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('route_') && !this._cache.has(key)) {
          routes.push(key.replace('route_', ''));
        }
      });
    } catch (e) {}
    
    return [...new Set(routes)]; // Remove duplicates
  },
  
  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    const stats = {
      memory: this._cache.size,
      total: 0,
      routes: []
    };
    
    // Count localStorage items
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('route_')) {
          stats.total++;
          stats.routes.push(key.replace('route_', ''));
        }
      });
    } catch (e) {}
    
    return stats;
  },
  
  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    
    // Clean memory cache
    this._expiry.forEach((expiry, key) => {
      if (expiry <= now) {
        this._cache.delete(key);
        this._expiry.delete(key);
      }
    });
    
    // Clean localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('route_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.expiry <= now) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              localStorage.removeItem(key); // Invalid JSON, remove
            }
          }
        }
      });
    } catch (e) {}
    
    
  }
};

// Run cleanup every 10 minutes
setInterval(() => RouteCache.cleanup(), 10 * 60 * 1000);

// Make globally available
window.RouteCache = RouteCache;
