// utils/loadingPriority.js
const LoadingPriority = {
  // Priority levels
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  
  // Script categories
  scripts: {
    critical: [
      '/services/firebase.js',
      '/utils/cache.js',
      '/utils/routeCache.js',
      '/components/Layout.js',
      '/components/Header.js'
    ],
    high: [
      '/pages/home/index.js',
      '/hooks/useListings.js',
      '/hooks/useFavorites.js',
      '/components/ListingCard.js'
    ],
    medium: [
      '/pages/profile/index.js',
      '/pages/FavoritesPage.js',
      '/components/ChatInterface.js',
      '/components/NotificationBell.js'
    ],
    low: [
      '/pages/admin/index.js',
      '/pages/terms/index.js',
      '/pages/privacy/index.js',
      '/components/ReportModal.js'
    ]
  },
  
  // Loaded scripts tracker
  loaded: new Set(),
  
  /**
   * Load scripts by priority
   * @param {string} priority - Priority level
   * @returns {Promise} - Promise that resolves when scripts are loaded
   */
  loadPriority: async function(priority) {
    const scripts = this.scripts[priority] || [];
    const promises = scripts.map(src => this.loadScript(src));
    return Promise.all(promises);
  },
  
  /**
   * Load a single script
   * @param {string} src - Script source
   * @returns {Promise} - Promise that resolves when script is loaded
   */
  loadScript: function(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loaded.has(src)) {
        resolve();
        return;
      }
      
      // Check if script already exists in DOM
      if (document.querySelector(`script[src="${src}"]`)) {
        this.loaded.add(src);
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        this.loaded.add(src);
        
        resolve();
      };
      
      script.onerror = () => {
        console.error(`❌ Failed to load: ${src}`);
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  },
  
  /**
   * Load critical path first (homepage)
   * @param {string} preferredMode - 'grid' or 'map'
   */
  loadHomepage: async function(preferredMode = 'grid') {
    
    
    // Load critical scripts first
    await this.loadPriority(this.CRITICAL);
    
    // Load high priority scripts
    await this.loadPriority(this.HIGH);
    
    // Load mode-specific scripts
    if (preferredMode === 'map') {
      await this.loadScript('/pages/home/components/map/index.js');
      await this.loadScript('/pages/home/components/map/MapCore.js');
      await this.loadScript('/pages/home/components/map/MapLayers.js');
    }
    
    // Load remaining in background
    setTimeout(() => {
      this.loadPriority(this.MEDIUM);
      this.loadPriority(this.LOW);
    }, 1000);
  },
  
  /**
   * Preload a page for faster navigation
   * @param {string} page - Page name
   */
  preloadPage: function(page) {
    const pageScripts = {
      profile: ['/pages/profile/index.js', '/hooks/useProfile.js'],
      favorites: ['/pages/FavoritesPage.js'],
      chat: ['/pages/ChatPage.js', '/components/ChatInterface.js'],
      listing: ['/pages/listing-detail/index.js']
    };
    
    const scripts = pageScripts[page] || [];
    scripts.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = src;
      document.head.appendChild(link);
    });
  },
  
  /**
   * Initialize hover-based preloading
   */
  initHoverPreloading: function() {
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a, button');
      if (!link) return;
      
      const href = link.getAttribute('href') || link.dataset.path;
      if (!href) return;
      
      // Preload based on href
      if (href === '/profile') this.preloadPage('profile');
      if (href === '/favorites') this.preloadPage('favorites');
      if (href === '/chat') this.preloadPage('chat');
      if (href.startsWith('/listing/')) this.preloadPage('listing');
    }, { passive: true });
  },
  
  /**
   * Get loading stats
   */
  getStats: function() {
    return {
      loaded: Array.from(this.loaded),
      count: this.loaded.size,
      critical: this.scripts.critical.filter(s => this.loaded.has(s)).length,
      high: this.scripts.high.filter(s => this.loaded.has(s)).length,
      medium: this.scripts.medium.filter(s => this.loaded.has(s)).length,
      low: this.scripts.low.filter(s => this.loaded.has(s)).length
    };
  }
};

// Make globally available
window.LoadingPriority = LoadingPriority;
console.log('✅ LoadingPriority loaded');