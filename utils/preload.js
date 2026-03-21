
const PreloadHelpers = {
  
  preloadPage(pageName) {
    const pages = {
      'listings': '/pages/ListingsPage.js',
      'favorites': '/pages/FavoritesPage.js',
      'profile': '/pages/ProfilePage.js',
      'chat': '/pages/ChatPage.js'
    };
    
    const path = pages[pageName];
    if (path && !window.loadedScripts?.[path]) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = path;
      document.head.appendChild(link);
    }
  },
  
  
  initHoverPreloading() {
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a, button');
      if (!link) return;
      
      const href = link.getAttribute('href') || link.dataset.path;
      if (href === '/listings') this.preloadPage('listings');
      if (href === '/favorites') this.preloadPage('favorites');
      if (href === '/profile') this.preloadPage('profile');
      if (href === '/chat') this.preloadPage('chat');
    }, { passive: true });
  }
};

window.PreloadHelpers = PreloadHelpers;