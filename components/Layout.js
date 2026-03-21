// components/Layout.js - COMPLETE FIXED VERSION WITH UNIFIED NOTIFICATION
function Layout({ user, navigate, children, currentPath, installProps = {} }) {
  
  // ===== SYNCHRONOUS DETECTION - Runs immediately on render =====
  const isChatPage = currentPath === '/chat';
  // Check URL params synchronously
  const hasChatParam = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).has('chat')
    : false;
  const hasChatOpen = isChatPage && hasChatParam;
  
  const mainRef = React.useRef(null);
  const isHomePage = currentPath === '/';
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const { openModal } = window.useAuthModal?.() || { openModal: () => {} };
  
  // ===== DETECT DESKTOP MODE - Synchronous =====
  const [isDesktop, setIsDesktop] = React.useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
  });
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ===== GET VIEW MODE FROM LOCAL STORAGE =====
  const [viewMode, setViewMode] = React.useState(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = localStorage.getItem('home_view_mode');
    return (saved === 'grid' || saved === 'map') ? saved : 'grid';
  });
  
  // ===== LISTEN FOR VIEW MODE CHANGES =====
  React.useEffect(() => {
    const handleViewModeChange = (event) => {
      const newMode = event.detail?.mode || event.detail;
      if (newMode === 'grid' || newMode === 'map') {
        setViewMode(newMode);
        localStorage.setItem('home_view_mode', newMode);
      }
    };
    
    window.addEventListener('view-mode-changed', handleViewModeChange);
    return () => window.removeEventListener('view-mode-changed', handleViewModeChange);
  }, []);
  
  // ===== DESKTOP NAVIGATION ITEMS =====
  const navItems = [
    { 
      icon: React.createElement('img', {
        src: '/vault/img/unadomot.jpg',
        alt: 'Home',
        className: 'w-6 h-6 rounded-full object-cover'
      }),
      label: 'Home', 
      path: '/' 
    },
    { 
      icon: React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
      ),
      label: 'Favorites', 
      path: '/favorites', 
      protected: true 
    },
    { 
      icon: React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' })
      ),
      label: 'Post', 
      path: '/post', 
      protected: true, 
      isPost: true 
    },
    { 
      icon: React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
      ),
      label: 'Messages', 
      path: '/chat', 
      protected: true 
    },
    { 
      icon: user?.photoURL 
        ? React.createElement('img', {
            src: user.photoURL,
            alt: 'Profile',
            className: 'w-6 h-6 rounded-full object-cover'
          })
        : React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
          ),
      label: 'Profile', 
      path: '/profile', 
      protected: true 
    }
  ];
  
  const handleNavClick = (path, isProtected, isPost) => {
    if (isPost) {
      if (!user) {
        window.__openAuthModal('signup', { path: '/', openPostAfterLogin: true });
      } else {
        openModal('post', {});
      }
      return;
    }
    
    if (isProtected && !user) {
      window.__openAuthModal('login', path);
    } else {
      navigate(path);
    }
  };
  
  // ===== SAVE SCROLL POSITION =====
  React.useEffect(() => {
    const saveScrollPosition = () => {
      if (mainRef.current) {
        const position = mainRef.current.scrollTop;
        setScrollPosition(position);
        try {
          sessionStorage.setItem(`scroll_${currentPath}`, position.toString());
        } catch (e) {}
      }
    };
    
    const handleScroll = () => saveScrollPosition();
    
    const currentMain = mainRef.current;
    if (currentMain) {
      currentMain.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (currentMain) {
        currentMain.removeEventListener('scroll', handleScroll);
      }
      saveScrollPosition();
    };
  }, [currentPath]);
  
  // ===== RESTORE SCROLL POSITION =====
  React.useEffect(() => {
    if (mainRef.current) {
      try {
        const saved = sessionStorage.getItem(`scroll_${currentPath}`);
        if (saved) {
          const position = parseInt(saved, 10);
          if (!isNaN(position)) {
            setTimeout(() => {
              if (mainRef.current) {
                mainRef.current.scrollTop = position;
              }
            }, 50);
          }
        }
      } catch (e) {}
    }
  }, [currentPath]);
  
  // ===== DESKTOP LAYOUT =====
  if (isDesktop) {
    return React.createElement('div', { className: 'h-screen flex overflow-hidden bg-gray-50' },
      
      // Left Navigation
      React.createElement('nav', {
          className: 'desktop-nav'
        },
        React.createElement('div', null,
          navItems.map(item => {
            const isActive = currentPath === item.path;
            
            return React.createElement('div', {
                key: item.path,
                onClick: () => handleNavClick(item.path, item.protected, item.isPost),
                className: `desktop-nav-item ${isActive ? 'active' : ''}`
              },
              item.icon,
              React.createElement('span', null, item.label)
            );
          })
        )
      ),
      
      // Right Content Area
      React.createElement('div', {
          className: 'flex-1 flex flex-col overflow-hidden'
        },
        
        // ===== TOP BAR (only on homepage grid view) =====
        isHomePage && viewMode === 'grid' && React.createElement(Header, {
          user: user,
          navigate: navigate,
          installProps: installProps,
          isDesktop: true,
          currentPath: currentPath,
          isHomePage: true,
          viewMode: viewMode,
          onViewToggle: window.__homePageState?.handleViewToggle
        }),
        
        // ===== BACK BUTTON PANEL - CONDITIONALLY RENDERED =====
        !isHomePage && !hasChatOpen && React.createElement('div', {
            className: 'desktop-back-panel'
          },
          React.createElement('div', {
              onClick: () => window.history.back(),
              className: 'desktop-back-btn'
            },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M15 19l-7-7 7-7' })
            ),
            React.createElement('span', null, 'Back')
          ),
          React.createElement('span', {
            className: 'desktop-page-title'
          }, getPageTitle(currentPath))
        ),
        
        // ===== MAIN CONTENT =====
        React.createElement('main', {
          ref: mainRef,
          className: `flex-1 overflow-auto ${
            isHomePage && viewMode === 'grid' 
              ? 'desktop-content' 
              : isHomePage && viewMode === 'map'
                ? 'desktop-content-map'
                : hasChatOpen
                  ? 'p-0 m-0'
                  : 'p-6'
          }`
        }, children)
      )
    );
  }
  
  // ===== MOBILE LAYOUT =====
  return React.createElement('div', {
      className: 'h-screen flex flex-col overflow-hidden bg-gray-50'
    },
    
    // Mobile back button
    !isHomePage && !hasChatOpen && React.createElement(BackButton, {
      currentPath: currentPath,
      navigate: navigate
    }),
    
    // Mobile main content
    React.createElement('main', {
      ref: mainRef,
      className: `flex-1 overflow-auto ${
        hasChatOpen 
          ? 'p-0' 
          : !isHomePage 
            ? 'pt-0 pb-0' 
            : 'p-0'
      }`
    }, children),
    
    !hasChatOpen && !isHomePage && React.createElement(ScrollToTopButton, {
      containerRef: mainRef,
      scrollable: true
    }),
    
    !hasChatOpen && React.createElement('div', {
        className: 'fixed bottom-0 left-0 right-0 z-50'
      },
      React.createElement(Header, {
        user: user,
        navigate: navigate,
        installProps: installProps,
        isBottom: true,
        scrollContainerRef: isHomePage ? mainRef : null
      })
    )
  );
}

function getPageTitle(path) {
  const titles = {
    '/favorites': 'Favorites',
    '/chat': 'Messages',
    '/profile': 'Profile',
    '/listings': 'Listings',
    '/settings': 'Settings'
  };
  
  if (path.startsWith('/listing/')) return 'Property Details';
  if (path.startsWith('/profile/')) return 'Profile';
  if (path.startsWith('/public-profile/')) return 'Public Profile';
  
  return titles[path] || 'UnaDomot';
}

window.Layout = Layout;