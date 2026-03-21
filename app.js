/* Main router */

/* Catches any page-level render error — prevents full app crash */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error) {
    // Log to our new error system
    if (window.ErrorLogger) {
      window.ErrorLogger.critical(error, {
        component: 'PageErrorBoundary',
        location: window.location.pathname
      });
    }
    return { hasError: true, errorMessage: error && error.message ? error.message : 'Unknown error' };
  }
  componentDidCatch(error, errorInfo) {
    // Log to our new error system
    if (window.ErrorLogger) {
      window.ErrorLogger.critical(error, {
        component: 'PageErrorBoundary',
        errorInfo,
        location: window.location.pathname
      });
    }
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
          className: 'min-h-screen bg-green-50 flex items-center justify-center p-6'
        },
        React.createElement('div', { className: 'text-center max-w-sm' },
          React.createElement('div', { className: 'text-5xl mb-4' }, '🏚'),
          React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, 'Something went wrong'),
          React.createElement('p', { className: 'text-gray-500 text-sm mb-6' }, this.state.errorMessage || 'This page ran into a problem. Your data is safe.'),
          React.createElement('button', {
            onClick: function() {
              window.history.back();
            },
            className: 'bg-green-950 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition mr-3'
          }, '← Go Back'),
          React.createElement('button', {
            onClick: function() {
              if (window.__navigate) window.__navigate('/');
              else window.location.href = '/';
            },
            className: 'bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition'
          }, 'Home')
        )
      );
    }
    return this.props.children;
  }
}

/* Full-screen skeleton - kept as fallback but splash screen in HTML will be used first */
function PageLoader() {
  return React.createElement('div', {
      className: 'flex h-screen bg-green-50 items-center justify-center'
    },
    React.createElement('div', { className: 'text-center' },
      React.createElement('div', { className: 'w-12 h-12 rounded-full bg-gray-200 animate-pulse mx-auto mb-3' }),
      React.createElement('div', { className: 'h-3 bg-gray-200 rounded animate-pulse w-24 mx-auto' })
    )
  );
}

function App() {
  /* Auth + route state */
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [currentPath, setCurrentPath] = React.useState(function() {
    let path = window.location.pathname;
    if (path === '/index.html' || path === '') return '/';
    if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
    return path;
  });
  
  const [pageComponent, setPageComponent] = React.useState(null);
  const [pageData, setPageData] = React.useState(null);
  const [pageState, setPageState] = React.useState(null);
  
  const { cachePage, getCachedPage } = window.useRouteCache?.() || {};
  
  React.useEffect(function() {
    document.body.classList.add('has-bottom-header');
    return function() { document.body.classList.remove('has-bottom-header'); };
  }, []);
  
  /* ===== ENHANCED SPA NAVIGATE HELPER ===== */
  const navigate = React.useCallback(function(path, state) {
    state = state || {};
    
    // Ensure path starts with '/'
    if (!path.startsWith('/')) path = '/' + path;
    
    // Cache current page state before navigating away
    if (pageComponent && currentPath) {
      const scrollY = window.scrollY;
      let extra = {};
      
      // Collect page-specific state
      if (currentPath === '/' && window.__homePageState) {
        extra = {
          ...window.__homePageState,
          mapCenter: window.__homePageState.mapCenter,
          mapZoom: window.__homePageState.mapZoom,
          viewMode: window.__homePageState.viewMode
        };
      } else if (currentPath === '/profile' && window.__profilePageState) {
        extra = window.__profilePageState;
      } else if (currentPath === '/favorites' && window.__favoritesPageState) {
        extra = window.__favoritesPageState;
      }
      
      // Save to route cache
      cachePage?.(currentPath, pageComponent, pageData, scrollY, extra);
    }
    
    // Push new state to history WITH the state object
    history.pushState(state, '', path);
    setCurrentPath(path.split('?')[0]);
  }, [pageComponent, currentPath, pageData, cachePage]);
  
  /* Expose for global use */
  window.__navigate = navigate;
  
  /* Initialize favorites listener when user changes */
  React.useEffect(function() {
    if (user) {
      window.FavoritesHelpers?.initFavoritesListener(user.uid);
    } else {
      window.FavoritesHelpers?.initFavoritesListener(null);
    }
  }, [user]);
  
  React.useEffect(function() {
    const unsubscribe = auth.onAuthStateChanged(
      function(u) {
        setUser(u);
        setLoading(false);
      },
      function(err) {
        if (window.ErrorLogger) {
          window.ErrorLogger.error(err, { source: 'auth.onAuthStateChanged' });
        }
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);
  
  /* ===== ENHANCED POPSTATE HANDLER ===== */
  React.useEffect(function() {
    const handlePopState = function(event) {
      let path = window.location.pathname;
      if (path === '/index.html' || path === '') path = '/';
      if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
      
      // Get the state from the event
      const state = event.state || {};
      
      // Try to get cached page
      const cached = getCachedPage?.(path);
      if (cached) {
        setPageComponent(() => cached.component);
        setPageData(cached.data);
        setPageState({ ...cached, ...state }); // Merge with navigation state
        
        // Restore scroll position after a tiny delay to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo(0, cached.scrollPosition || 0);
        }, 50);
      } else {
        setPageComponent(null);
        setPageData(null);
        setPageState(state); // Store navigation state
      }
      setCurrentPath(path);
    };
    
    window.addEventListener('popstate', handlePopState);
    return function() { window.removeEventListener('popstate', handlePopState); };
  }, [getCachedPage]);
  
  /* ===== LOAD PAGE WITH PRIORITY BASED ON USER PREFERENCE ===== */
  React.useEffect(function() {
    async function loadPage() {
      /* Serve cache instantly */
      const cached = getCachedPage?.(currentPath);
      if (cached && cached.component) {
        setPageComponent(() => cached.component);
        setPageData(cached.data);
        setPageState(cached);
        setTimeout(() => { window.scrollTo(0, cached.scrollPosition || 0); }, 50);
        return;
      }
      
      if (currentPath === '/') {
        document.body.classList.add('homepage');
      } else {
        document.body.classList.remove('homepage');
      }
      
      try {
        let component = null;
        const base = currentPath.split('?')[0];
        
        // Page routes - load with priority
        if (base === '/') {
          // For homepage, load critical path first based on preferred mode
          const preferredMode = localStorage.getItem('home_view_mode') || 'grid';
          
          
          // Load homepage component (this will handle its own priority loading)
          component = await lazyLoad('HomePage', '/pages/home/index.js');
        } else if (base === '/listings') {
          component = await lazyLoad('ListingsPage', '/pages/ListingsPage.js');
        } else if (base.startsWith('/listing/')) {
          component = await lazyLoad('ListingDetailPage', '/pages/listing-detail/index.js');
        } else if (base.startsWith('/l/')) {
          component = await lazyLoad('ListingByShortCodePage', '/pages/ListingByShortCodePage.js');
        } else if (base === '/profile') {
          component = await lazyLoad('ProfilePage', '/pages/profile/index.js');
        } else if (base.startsWith('/profile/')) {
          component = await lazyLoad('ProfileRedirectPage', '/pages/ProfileRedirectPage.js');
        } else if (base.startsWith('/public-profile/')) {
          component = await lazyLoad('PublicProfilePage', '/pages/PublicProfilePage.js');
        } else if (base.startsWith('/u/')) {
          component = await lazyLoad('UserByUsernamePage', '/pages/UserByUsernamePage.js');
        } else if (base === '/chat') {
          component = await lazyLoad('ChatPage', '/pages/ChatPage.js');
        } else if (base === '/favorites') {
          component = await lazyLoad('FavoritesPage', '/pages/FavoritesPage.js');
        } else if (base === '/post') {
          // Redirect to home and open the post modal
          navigate('/');
          setTimeout(() => {
            if (window.__openAuthModal) {
              window.__openAuthModal('post', {});
            }
          }, 100);
          return;
        } else if (base.startsWith('/edit/')) {
          const lid = base.split('/')[2];
          navigate('/listing/' + lid);
          const { openModal } = window.useAuthModal?.() || {};
          if (openModal) setTimeout(() => openModal('post', { listingId: lid }), 100);
          return;
        } else if (base === '/verify') {
          component = await lazyLoad('VerificationPage', '/pages/VerificationPage.js');
        } else if (base === '/checkout') {
          component = await lazyLoad('CheckoutNoticePage', '/pages/CheckoutNoticePage.js');
        } else if (base === '/forgot-password') {
          component = await lazyLoad('ForgotPasswordPage', '/pages/ForgotPasswordPage.js');
        } else if (base === '/admin') {
          component = await lazyLoad('AdminPage', '/pages/AdminPage.js');
        } else if (base === '/terms') {
          component = await lazyLoad('TermsPage', '/pages/TermsPage.js');
        } else if (base === '/privacy') {
          component = await lazyLoad('PrivacyPage', '/pages/PrivacyPage.js');
        } else {
          component = await lazyLoad('NotFoundPage', '/pages/NotFoundPage.js');
        }
        
        if (component) {
          setPageComponent(() => component);
          setPageData(null);
          setPageState(null);
        }
      } catch (err) {
        // Log the error
        if (window.ErrorLogger) {
          window.ErrorLogger.error(err, {
            source: 'page-loader',
            path: currentPath
          });
        }
        
        try {
          const nf = await lazyLoad('NotFoundPage', '/pages/NotFoundPage.js');
          setPageComponent(() => nf);
        } catch (e) {
          if (window.ErrorLogger) {
            window.ErrorLogger.critical(e, { source: 'not-found-page' });
          }
        }
      }
    }
    
    if (!loading) loadPage();
  }, [currentPath, user, loading, navigate]);
  
  // ===== REMOVED DUPLICATE useEffect =====
  // The duplicate verification warning handler has been removed
  // The one below this line is the only one needed
  
  // Hide splash screen when app is ready
  React.useEffect(() => {
    if (!loading && pageComponent) {
      setTimeout(() => {
        if (window.hideSplashScreen) {
          window.hideSplashScreen();
        }
      }, 100);
    }
  }, [loading, pageComponent]);
  
  if (loading) {
    return React.createElement(window.SplashScreen || PageLoader, null);
  }
  
  if (!pageComponent) {
    return React.createElement(PageLoader, null);
  }
  
  const renderPage = function() {
    const base = currentPath.split('?')[0];
    const params = new URLSearchParams(window.location.search);
    
    // Pass both cached state and navigation state to pages
    const sharedProps = {
      user,
      navigate,
      cachedData: pageData,
      cachedState: pageState, // This contains navigation state
      locationState: window.history.state // Raw history state
    };
    
    if (base === '/profile') {
      const tab = params.get('tab');
      const initialTab = (tab === 'listings' || tab === 'favorites') ? tab : 'listings';
      return React.createElement(PageErrorBoundary, null,
        React.createElement(Layout, { user, navigate, currentPath, installProps: {} },
          React.createElement(pageComponent, { ...sharedProps, initialTab })
        )
      );
    }
    
    return React.createElement(PageErrorBoundary, null,
      React.createElement(Layout, { user, navigate, currentPath, installProps: {} },
        React.createElement(pageComponent, sharedProps)
      )
    );
  };
  
  // Wrap the entire app with ErrorProvider
  const ErrorProvider = window.ErrorProvider || function({ children }) { return children; };
  
  return React.createElement(
    ErrorProvider, null,
    React.createElement(
      window.AccessibilityProvider || function({ children }) { return children; }, null,
      React.createElement(
        window.AuthModalProvider || function({ children }) { return children; }, null,
        React.createElement(
          window.RouteCacheProvider || function({ children }) { return children; }, null,
          React.createElement(
            window.NotificationProvider || function({ children }) { return children; }, null,
            React.createElement(React.Fragment, null,
              renderPage(),
              window.AuthModal ? React.createElement(window.AuthModal, null) : null
            )
          )
        )
      )
    )
  );
}

document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(React.createElement(App, null));
  } else {
    ReactDOM.render(React.createElement(App, null), root);
  }
});