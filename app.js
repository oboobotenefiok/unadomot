/* Main router */

/* Catches any page-level render error — prevents full app crash */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error) {
    if (window.ErrorLogger) {
      window.ErrorLogger.critical(error, {
        component: 'PageErrorBoundary',
        location: window.location.pathname
      });
    }
    return { hasError: true, errorMessage: error && error.message ? error.message : 'Unknown error' };
  }
  componentDidCatch(error, errorInfo) {
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
    
    if (!path.startsWith('/')) path = '/' + path;
    
    if (pageComponent && currentPath) {
      const scrollY = window.scrollY;
      let extra = {};
      
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
      
      cachePage?.(currentPath, pageComponent, pageData, scrollY, extra);
    }
    
    history.pushState(state, '', path);
    setCurrentPath(path.split('?')[0]);
  }, [pageComponent, currentPath, pageData, cachePage]);
  
  window.__navigate = navigate;
  
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
      
      const state = event.state || {};
      
      const cached = getCachedPage?.(path);
      if (cached) {
        setPageComponent(() => cached.component);
        setPageData(cached.data);
        setPageState({ ...cached, ...state });
        setTimeout(() => {
          window.scrollTo(0, cached.scrollPosition || 0);
        }, 50);
      } else {
        setPageComponent(null);
        setPageData(null);
        setPageState(state);
      }
      setCurrentPath(path);
    };
    
    window.addEventListener('popstate', handlePopState);
    return function() { window.removeEventListener('popstate', handlePopState); };
  }, [getCachedPage]);
  
  /* ===== LOAD PAGE WITH PRIORITY BASED ON USER PREFERENCE ===== */
  React.useEffect(function() {
    async function loadPage() {
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
        
        // ===== ROUTE HANDLING =====
        
        // Homepage
        if (base === '/') {
          component = await lazyLoad('HomePage', '/pages/home/index.js');
        }
        // Listings page
        else if (base === '/listings') {
          component = await lazyLoad('ListingsPage', '/pages/ListingsPage.js');
        }
        // Listing detail (by code or ID)
        else if (base.startsWith('/listing/')) {
          const codeOrId = base.split('/')[2];
          const isListingCode = codeOrId && /^\d{6}-\d{3}-[a-z0-9]{3}$/.test(codeOrId);
          
          if (isListingCode) {
            component = await lazyLoad('ListingByCodePage', '/pages/ListingByCodePage.js');
          } else {
            component = await lazyLoad('ListingDetailPage', '/pages/listing-detail/index.js');
          }
        }
        // ===== OWN PROFILE PAGE (MUST COME BEFORE USERNAME ROUTE) =====
        // User's own profile settings page
        else if (base === '/profile') {
          component = await lazyLoad('ProfilePage', '/pages/profile/index.js');
        }
        // ===== USERNAME PUBLIC PROFILE (for other users) =====
        // Check if path is a username (letters, numbers, underscore, 3-20 chars)
        // This handles URLs like /johnd1234 for viewing other users' profiles
        else if (/^[a-z0-9_]{3,20}$/.test(base.slice(1))) {
          component = await lazyLoad('PublicProfilePage', '/pages/PublicProfilePage.js');
        }
        // Chat
        else if (base === '/chat') {
          component = await lazyLoad('ChatPage', '/pages/ChatPage.js');
        }
        // Favorites
        else if (base === '/favorites') {
          component = await lazyLoad('FavoritesPage', '/pages/FavoritesPage.js');
        }
        // Post listing
        else if (base === '/post') {
          navigate('/');
          setTimeout(() => {
            if (window.__openAuthModal) {
              window.__openAuthModal('post', {});
            }
          }, 100);
          return;
        }
        // Edit listing
        else if (base.startsWith('/edit/')) {
          const lid = base.split('/')[2];
          navigate('/listing/' + lid);
          const { openModal } = window.useAuthModal?.() || {};
          if (openModal) setTimeout(() => openModal('post', { listingId: lid }), 100);
          return;
        }
        // Verification
        else if (base === '/verify') {
          component = await lazyLoad('VerificationPage', '/pages/VerificationPage.js');
        }
        // Checkout notice
        else if (base === '/checkout') {
          component = await lazyLoad('CheckoutNoticePage', '/pages/CheckoutNoticePage.js');
        }
        // Forgot password
        else if (base === '/forgot-password') {
          component = await lazyLoad('ForgotPasswordPage', '/pages/ForgotPasswordPage.js');
        }
        // Admin
        else if (base === '/admin') {
          component = await lazyLoad('AdminPage', '/pages/AdminPage.js');
        }
        // Terms
        else if (base === '/terms') {
          component = await lazyLoad('TermsPage', '/pages/TermsPage.js');
        }
        // Privacy
        else if (base === '/privacy') {
          component = await lazyLoad('PrivacyPage', '/pages/PrivacyPage.js');
        }
        // 404
        else {
          component = await lazyLoad('NotFoundPage', '/pages/NotFoundPage.js');
        }
        
        if (component) {
          setPageComponent(() => component);
          setPageData(null);
          setPageState(null);
        }
      } catch (err) {
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
    
    const sharedProps = {
      user,
      navigate,
      cachedData: pageData,
      cachedState: pageState,
      locationState: window.history.state
    };
    
    // For own profile page (/profile)
    if (base === '/profile') {
      return React.createElement(PageErrorBoundary, null,
        React.createElement(Layout, { user, navigate, currentPath, installProps: {} },
          React.createElement(pageComponent, sharedProps)
        )
      );
    }
    
    // For username-based public profile pages (other users)
    if (/^[a-z0-9_]{3,20}$/.test(base.slice(1))) {
      return React.createElement(PageErrorBoundary, null,
        React.createElement(Layout, { user, navigate, currentPath, installProps: {} },
          React.createElement(pageComponent, sharedProps)
        )
      );
    }
    
    return React.createElement(PageErrorBoundary, null,
      React.createElement(Layout, { user, navigate, currentPath, installProps: {} },
        React.createElement(pageComponent, sharedProps)
      )
    );
  };
  
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