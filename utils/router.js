

const Router = {
  
  currentPath: '/',
  
  
  callback: null,
  
  
  normalizePath(path) {
    
    let normalized = path.replace(window.location.origin, '');
    
    
    if (normalized === '/index.html' || normalized === '') {
      normalized = '/';
    }
    
    
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  },
  
  
  init(routeCallback) {
    this.callback = routeCallback;
    
    
    const rawPath = window.location.pathname;
    this.currentPath = this.normalizePath(rawPath);
    
    
    this.callback(this.currentPath);
    
    
    window.addEventListener('popstate', (event) => {
      const rawPath = window.location.pathname;
      this.currentPath = this.normalizePath(rawPath);
      this.callback(this.currentPath);
    });
  },
  
  
  navigateTo(path) {
    
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    
    history.pushState(null, '', path);
    
    
    this.currentPath = path;
    
    
    if (this.callback) {
      this.callback(path);
    }
  }
};