// components/Header.js - Desktop & Mobile Support with UNIFIED NOTIFICATION
const Header = React.memo(function Header({ 
  user, 
  navigate, 
  installProps = {}, 
  isBottom = false, 
  scrollContainerRef = null,
  isDesktop = false,
  currentPath = '',
  onFilterClick = null,
  isHomePage = false,
  viewMode = 'grid',
  onViewToggle = null
}) {
  
  const { showInstallButton = false, onInstallClick = null } = installProps;
  
  const [showAccessibility, setShowAccessibility] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);
  const [searchSuggestions, setSearchSuggestions] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const { openModal } = window.useAuthModal();
  const accessibility = window.useAccessibility?.() || { settings: {} };
  const searchInputRef = React.useRef(null);
  const searchDropdownRef = React.useRef(null);
  
  // ===== LOAD SEARCH SUGGESTIONS =====
  React.useEffect(() => {
    if (!window.__homePageState?.listings || !searchTerm || searchTerm.length < 1) {
      setSearchSuggestions([]);
      return;
    }
    
    const listings = window.__homePageState.listings || [];
    const term = searchTerm.toLowerCase();
    const suggestions = [];
    const seen = new Set();
    
    listings.forEach(listing => {
      [listing.state, listing.lga, listing.propertyType, listing.title].forEach(val => {
        if (val && val.toLowerCase().includes(term) && !seen.has(val.toLowerCase())) {
          seen.add(val.toLowerCase());
          suggestions.push(val);
        }
      });
    });
    
    setSearchSuggestions(suggestions.slice(0, 6));
  }, [searchTerm]);
  
  // ===== CLICK OUTSIDE TO CLOSE SUGGESTIONS =====
  React.useEffect(() => {
    function handleClickOutside(e) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // ===== Unread count listener (for chat badge only) =====
  React.useEffect(() => {
    if (!user) return;
    
    const unsubscribe = NotificationHelpers.listenToUnreadCount(user.uid, (count) => {
      setUnreadCount(count);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);
  
  // ===== DESKTOP TOP BAR - ONLY SHOW IN GRID VIEW =====
  if (isDesktop && isHomePage && viewMode === 'grid') {
    return React.createElement(React.Fragment, null,
      React.createElement('div', {
        className: 'desktop-top-bar'
      },
        // Left side - Filter + Search
        React.createElement('div', {
          className: 'desktop-search-section'
        },
          // Filter Icon
          React.createElement('div', {
            onClick: onFilterClick || (() => window.__homePageState?.openFilterModal?.()),
            className: `desktop-filter-icon`,
            title: 'Filter listings'
          },
            React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
              })
            )
          ),
          
          // Search Input with Cancel Icon INSIDE
          React.createElement('div', {
            className: 'desktop-search-wrapper',
            ref: searchDropdownRef
          },
            React.createElement('input', {
              ref: searchInputRef,
              type: 'text',
              placeholder: 'Search properties, locations...',
              className: 'desktop-search-input',
              value: searchTerm,
              onChange: (e) => {
                setSearchTerm(e.target.value);
                setShowSearchDropdown(true);
                if (window.__homePageState?.setSearchTerm) {
                  window.__homePageState.setSearchTerm(e.target.value);
                }
              },
              onFocus: () => setShowSearchDropdown(true),
              onKeyDown: (e) => {
                if (e.key === 'Enter' && window.__homePageState?.handleSearchSubmit) {
                  window.__homePageState.handleSearchSubmit(e.target.value);
                  setShowSearchDropdown(false);
                }
              }
            }),
            React.createElement('span', {
              className: 'desktop-search-icon'
            }, '🔍'),
            
            // Cancel X inside search bar
            searchTerm && React.createElement('button', {
              onClick: () => {
                setSearchTerm('');
                setShowSearchDropdown(false);
                if (window.__homePageState?.setSearchTerm) {
                  window.__homePageState.setSearchTerm('');
                }
              },
              className: 'absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600',
              title: 'Clear search'
            },
              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
              )
            ),
            
            // Search Suggestions Dropdown
            showSearchDropdown && searchSuggestions.length > 0 && React.createElement('div', {
              className: 'absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto'
            },
              searchSuggestions.map((suggestion, index) =>
                React.createElement('button', {
                  key: index,
                  className: 'w-full text-left px-4 py-2 hover:bg-green-50 text-sm border-b last:border-0',
                  onClick: () => {
                    setSearchTerm(suggestion);
                    setShowSearchDropdown(false);
                    if (window.__homePageState?.setSearchTerm) {
                      window.__homePageState.setSearchTerm(suggestion);
                    }
                    if (window.__homePageState?.handleSearchSubmit) {
                      window.__homePageState.handleSearchSubmit(suggestion);
                    }
                  }
                }, suggestion)
              )
            )
          )
        ),
        
        // Right side - Actions + Map Toggle
        React.createElement('div', {
          className: 'desktop-actions'
        },
          // Map/Grid Toggle
          React.createElement('div', {
            onClick: () => {
              if (onViewToggle) {
                onViewToggle();
              } else if (window.__homePageState?.handleViewToggle) {
                window.__homePageState.handleViewToggle();
              }
            },
            className: `desktop-action-btn`,
            title: viewMode === 'grid' ? 'Switch to map view' : 'Switch to grid view'
          },
            viewMode === 'grid' 
              ? React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
                  })
                )
              : React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                  })
                )
          ),
          
          // Notification Bell - USING UNIFIED COMPONENT
          React.createElement('div', {
            className: 'desktop-action-btn',
            onClick: () => {}, // NotificationBell handles its own click
            title: 'Notifications'
          },
            user ? 
              React.createElement(window.NotificationBell, {}) : 
              React.createElement('button', {
                onClick: () => openModal('login', currentPath),
                className: 'w-full h-full flex items-center justify-center'
              },
                React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                  })
                )
              )
          ),
          
          // Accessibility
          React.createElement('div', {
            className: 'desktop-action-btn',
            onClick: () => setShowAccessibility(true),
            title: 'Accessibility'
          },
            React.createElement('img', {
              src: '/vault/img/accessibility.png',
              alt: 'Accessibility',
              className: 'w-5 h-5'
            })
          )
        )
      ),
      
      // Accessibility Panel
      showAccessibility && window.AccessibilityPanel &&
      React.createElement(window.AccessibilityPanel, {
        onClose: () => setShowAccessibility(false)
      })
    );
  }
  
  // ===== MOBILE BOTTOM HEADER (original) =====
  React.useEffect(() => {
    if (!isBottom || !scrollContainerRef?.current) return;
    
    const container = scrollContainerRef.current;
    let lastScrollTop = 0;
    let ticking = false;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollingDown = scrollTop > lastScrollTop && scrollTop > 50;
      const scrollingUp = scrollTop < lastScrollTop;
      
      if (scrollingDown && isVisible) {
        setIsVisible(false);
      } else if (scrollingUp && !isVisible) {
        setIsVisible(true);
      }
      
      lastScrollTop = scrollTop;
      ticking = false;
    };
    
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, [isBottom, scrollContainerRef, isVisible]);
  
  // Keyboard detection
  React.useEffect(() => {
    const handleResize = () => {
      const isKeyboard = window.innerHeight < 500;
      setKeyboardVisible(isKeyboard);
    };
    
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setKeyboardVisible(true);
      }
    };
    
    const handleFocusOut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          setKeyboardVisible(false);
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
  
  // Protected navigation
  const handleProtectedNavigation = React.useCallback((path, mode = 'login') => {
    if (user) {
      navigate(path);
    } else {
      openModal(mode, path);
    }
  }, [user, navigate, openModal]);
  
  // Header classes
  const getHeaderClasses = React.useCallback(() => {
    if (!isBottom) {
      return 'bg-green-50 shadow-sm sticky top-0 z-50 border-b border-gray-200';
    }
    
    const hide = !isVisible || keyboardVisible;
    
    return `bg-green-50 py-0 shadow-lg border-t border-gray-200 w-full transition-transform duration-300 transform-gpu ${
      hide ? 'translate-y-full' : 'translate-y-0'
    }`;
  }, [isBottom, keyboardVisible, isVisible]);
  
  return React.createElement('header', {
      className: getHeaderClasses()
    },
    React.createElement('div', {
        className: 'container mx-auto px-4 py-4'
      },
      React.createElement('div', {
          className: 'flex items-center justify-between'
        },
        
        // Navigation icons
        React.createElement('div', {
            className: 'flex items-center justify-center flex-1 mx-6'
          },
          React.createElement('div', {
              className: 'flex items-center space-x-8'
            },
            
            // Home button
            React.createElement('button', {
                onClick: React.useCallback(() => navigate('/'), [navigate]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition',
                title: 'Go to Home'
              },
              React.createElement('img', {
                src: '/vault/img/unadomot.jpg',
                alt: 'UnaDomot Home',
                className: 'w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity',
                onError: function(e) {
                  e.target.style.display = 'none';
                }
              }),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            ),
            
            // Favorites
            React.createElement('button', {
                onClick: React.useCallback(() => handleProtectedNavigation('/favorites', 'login'), [handleProtectedNavigation]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition'
              },
              React.createElement('svg', { className: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
              ),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            ),
            
            // Post listing
            React.createElement('button', {
                onClick: React.useCallback(() => {
                  if (user) {
                    openModal('post', {});
                  } else {
                    openModal('signup', { path: '/', openPostAfterLogin: true });
                  }
                }, [user, openModal]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition'
              },
              React.createElement('svg', { className: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' })
              ),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            ),
            
            // Chat
            React.createElement('button', {
                onClick: React.useCallback(() => handleProtectedNavigation('/chat', 'login'), [handleProtectedNavigation]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition relative'
              },
              React.createElement('div', { className: 'relative' },
                React.createElement('svg', { className: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                ),
                user && window.UnreadBadge ? React.createElement(window.UnreadBadge, { count: unreadCount }) : null
              ),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            ),
            
            // Profile / Login
            user ?
            React.createElement('button', {
                onClick: React.useCallback(() => navigate('/profile'), [navigate]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition'
              },
              user.photoURL ?
              React.createElement('img', {
                src: user.photoURL,
                alt: 'Profile',
                className: 'w-8 h-8 rounded-full object-cover',
                onError: function(e) {
                  e.target.style.display = 'none';
                }
              }) :
              React.createElement('svg', { className: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
              ),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            ) :
            React.createElement('button', {
                onClick: React.useCallback(() => openModal('login', window.location.pathname), [openModal]),
                className: 'flex flex-col items-center text-gray-600 hover:text-green-950 transition'
              },
              React.createElement('svg', { className: 'w-8 h-8', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' })
              ),
              isBottom && React.createElement('span', { className: 'text-xs mt-1' }, '')
            )
          )
        ),
        
        // Right side icons (mobile only)
        React.createElement('div', {
            className: 'flex items-center space-x-2'
          },
          showInstallButton && React.createElement('button', {
              onClick: onInstallClick,
              className: 'bg-green-950 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-800 transition flex items-center gap-1 hidden sm:flex'
            },
            React.createElement('span', null, '📱'),
            React.createElement('span', { className: 'hidden md:inline' }, 'Install')
          )
        )
      )
    ),
    
    // Accessibility panel (mobile)
    showAccessibility && window.AccessibilityPanel &&
    React.createElement(window.AccessibilityPanel, {
      onClose: React.useCallback(() => setShowAccessibility(false), [])
    })
  );
});

window.Header = Header;