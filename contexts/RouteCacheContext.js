const RouteCacheContext = React.createContext({
  cachedPages: {},
  cachePage: () => {},
  getCachedPage: () => null,
  clearCache: () => {},
  getCacheStats: () => ({})
});

function RouteCacheProvider({ children }) {
  
  const [cachedPages, setCachedPages] = React.useState(() => {
    // Initialize from AppCache on mount
    const initial = {};
    try {
      // Try to restore from localStorage first
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('route_')) {
          const path = key.replace('route_', '');
          try {
            const saved = JSON.parse(localStorage.getItem(key));
            if (saved.timestamp && Date.now() - saved.timestamp <= 30 * 60 * 1000) {
              initial[path] = saved;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return initial;
  });
  
  // ===== Cache a page with full state =====
  const cachePage = React.useCallback((path, component, data = {}, scrollPosition = 0, additionalState = {}) => {
    const pageData = {
      component,
      data,
      scrollPosition,
      timestamp: Date.now(),
      ...additionalState
    };
    
    setCachedPages(prev => ({
      ...prev,
      [path]: pageData
    }));
    
    // Store in AppCache as well
    if (window.AppCache) {
      window.AppCache.setPage(path, pageData);
    }
    
    // Store in localStorage for persistence across sessions
    try {
      localStorage.setItem(`route_${path}`, JSON.stringify({
        data,
        scrollPosition,
        timestamp: Date.now(),
        ...additionalState
      }));
    } catch (e) {
      // Ignore storage errors
    }
    
    
  }, []);
  
  // ===== Get cached page =====
  const getCachedPage = React.useCallback((path) => {
    // First check React state
    const cached = cachedPages[path];
    if (cached) {
      // Check if still valid (30 minutes)
      if (Date.now() - cached.timestamp <= 30 * 60 * 1000) {
        return cached;
      }
    }
    
    // Then check AppCache
    if (window.AppCache) {
      const appCached = window.AppCache.getPage(path);
      if (appCached) {
        // Update React state
        setCachedPages(prev => ({ ...prev, [path]: appCached }));
        return appCached;
      }
    }
    
    // Finally check localStorage
    try {
      const stored = localStorage.getItem(`route_${path}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp <= 30 * 60 * 1000) {
          // Reconstruct with component reference
          const pageData = {
            ...parsed,
            component: cachedPages[path]?.component // Component might be in memory
          };
          
          // Update React state
          setCachedPages(prev => ({ ...prev, [path]: pageData }));
          
          // Update AppCache
          if (window.AppCache) {
            window.AppCache.setPage(path, pageData);
          }
          
          return pageData;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    
    return null;
  }, [cachedPages]);
  
  // ===== Clear cache =====
  const clearCache = React.useCallback((path) => {
    if (path) {
      // Clear specific page
      setCachedPages(prev => {
        const newCache = { ...prev };
        delete newCache[path];
        return newCache;
      });
      localStorage.removeItem(`route_${path}`);
      if (window.AppCache) {
        window.AppCache.clear('pages', path);
      }
    } else {
      // Clear all pages
      setCachedPages({});
      
      // Clear all route caches from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('route_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear from AppCache
      if (window.AppCache) {
        window.AppCache.clear('pages');
      }
    }
    
  }, []);
  
  // ===== Get cache statistics =====
  const getCacheStats = React.useCallback(() => {
    const stats = {
      total: Object.keys(cachedPages).length,
      pages: {},
      oldest: null,
      newest: null
    };
    
    let oldestTime = Date.now();
    let newestTime = 0;
    
    Object.entries(cachedPages).forEach(([path, data]) => {
      stats.pages[path] = {
        age: Date.now() - data.timestamp,
        hasComponent: !!data.component,
        scrollPosition: data.scrollPosition
      };
      
      if (data.timestamp < oldestTime) {
        oldestTime = data.timestamp;
        stats.oldest = path;
      }
      if (data.timestamp > newestTime) {
        newestTime = data.timestamp;
        stats.newest = path;
      }
    });
    
    return stats;
  }, [cachedPages]);
  
  // ===== Clean up old cache entries periodically =====
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      setCachedPages(prev => {
        const newCache = {};
        let changed = false;
        
        Object.entries(prev).forEach(([path, data]) => {
          if (now - data.timestamp <= maxAge) {
            newCache[path] = data;
          } else {
            changed = true;
            // Also remove from localStorage
            localStorage.removeItem(`route_${path}`);
          }
        });
        
        return changed ? newCache : prev;
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  const value = {
    cachedPages,
    cachePage,
    getCachedPage,
    clearCache,
    getCacheStats
  };
  
  return React.createElement(RouteCacheContext.Provider, { value }, children);
}

window.RouteCacheContext = RouteCacheContext;
window.RouteCacheProvider = RouteCacheProvider;
window.useRouteCache = () => React.useContext(RouteCacheContext);