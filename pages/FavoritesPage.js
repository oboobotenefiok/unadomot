function FavoritesPage({ user, navigate, cachedState, locationState }) {
  const [favorites, setFavorites] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
  const { openModal } = window.useAuthModal();
  const toastTimeoutRef = React.useRef(null);
  const unsubscribeRef = React.useRef(null);
  const pageRef = React.useRef(null);

  
  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToast({ show: true, message, type });
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  
// pages/FavoritesPage.js - FIND THE handleCardMessageClick FUNCTION AND REPLACE

const handleCardMessageClick = async (listingId, userId, e) => {
  e.stopPropagation();
  
  if (!user) {
    openModal('login', window.location.pathname);
    return;
  }
  
  // ===== USE CENTRALIZED VERIFICATION CHECK =====
  const verificationCheck = window.VerificationHelpers?.checkEmailVerification(user, 'send messages');
  if (!verificationCheck?.allowed) {
    const message = verificationCheck?.message || 'Please verify your email to send messages';
    ToastHelpers?.warning(message);
    
    const warningEvent = new CustomEvent('show-verification-warning', {
      detail: { message }
    });
    window.dispatchEvent(warningEvent);
    
    return;
  }
  
  if (user.uid === userId) {
    showToast('You cannot message yourself', 'error');
    return;
  }
  
  try {
    showToast('Starting conversation...', 'info');
    
    const chatId = await ChatHelpers.getOrCreateListingChat(
      user.uid,
      userId,
      listingId,
      'Is this still available?'
    );
    
    navigate('/chat?chat=' + chatId);
    
  } catch (error) {
    showToast('Failed to start chat. Please try again.', 'error');
  }
};

  
  const handleShare = async (listing, e) => {
    e.stopPropagation();
    await ShareHelpers.shareListing(listing, { showToast });
  };

  // ===== Remove from favorites with proper database call =====
  const handleRemoveFromFavorites = async (listingId, e) => {
    e.stopPropagation();
    
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
    // Store current state for potential rollback
    const previousFavorites = [...favorites];
    
    // Optimistic UI update
    setFavorites(function(prev) { 
      return prev.filter(function(f) { return f.id !== listingId; }); 
    });
    
    try {
      
      
      // Call database to actually remove
      const result = await FavoritesHelpers.toggleFavorite(user.uid, listingId);
      
      
      
      // Show success toast
      showToast('✓ Removed from favorites', 'success');
      
      // Force a refresh of the favorites list
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      // Re-subscribe to get fresh data
      const unsubscribe = FavoritesHelpers.listenToFavorites(user.uid, function(result) {
        if (!result.loading) {
          
          setFavorites(result.favorites || []);
          setLoading(false);
        }
      });
      
      unsubscribeRef.current = unsubscribe;
      
    } catch (error) {
      
      
      // Rollback on error
      setFavorites(previousFavorites);
      showToast('Failed to remove from favorites', 'error');
    }
  };

  // ===== Remove all unavailable listings =====
  const handleRemoveAllUnavailable = async () => {
    if (!confirm('Remove all unavailable listings from your favourites?')) return;
    
    const unavailableIds = deletedFavorites.map(f => f.id);
    const previousFavorites = [...favorites];
    
    // Optimistic update
    setFavorites(activeFavorites);
    
    try {
      for (const listingId of unavailableIds) {
        await FavoritesHelpers.toggleFavorite(user.uid, listingId);
        
      }
      
      showToast('All unavailable listings removed', 'success');
      
      // Force refresh
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      const unsubscribe = FavoritesHelpers.listenToFavorites(user.uid, function(result) {
        if (!result.loading) {
          setFavorites(result.favorites || []);
        }
      });
      
      unsubscribeRef.current = unsubscribe;
      
    } catch (error) {
      
      setFavorites(previousFavorites);
      showToast('Failed to remove all listings', 'error');
    }
  };

  // ===== Setup favorites listener =====
  React.useEffect(function() {
    if (!user) {
      navigate('/');
      openModal('login', '/favorites');
      return;
    }
    
    setLoading(true);
    
    
    const unsubscribe = FavoritesHelpers.listenToFavorites(user.uid, function(result) {
            if (!result.loading) {
        setFavorites(result.favorites || []);
        setLoading(false);
      }
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return function() { 
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current(); 
      }
    };
  }, [user, navigate, openModal]);
  
  // ===== Restore scroll position from cache =====
  React.useEffect(() => {
    if (cachedState?.scrollPosition && pageRef.current) {
      setTimeout(() => {
        pageRef.current.scrollTop = cachedState.scrollPosition;
      }, 50);
    }
  }, [cachedState]);
  
  // ===== Save state before unload =====
  React.useEffect(() => {
    const saveState = () => {
      const scrollPosition = pageRef.current?.scrollTop || 0;
      
      window.__favoritesPageState = {
        scrollPosition,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('favorites_state', JSON.stringify({
          timestamp: Date.now()
        }));
      } catch (e) {}
    };
    
    window.addEventListener('beforeunload', saveState);
    
    return () => {
      saveState(); // Save when component unmounts
      window.removeEventListener('beforeunload', saveState);
      delete window.__favoritesPageState;
    };
  }, []);
  
  // ===== Toast cleanup =====
  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (!user) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 'Redirecting to login...')
      )
    );
  }
  
  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 py-8' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
        React.createElement(SkeletonLoader.ListingGrid, { count: 8, cols: 4 })
      )
    );
  }
  
  const activeFavorites = favorites.filter(function(f) { return f && f.status !== 'deleted'; });
  const deletedFavorites = favorites.filter(function(f) { return f && f.status === 'deleted'; });
  
  if (favorites.length === 0) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 py-8' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
        React.createElement('h1', { className: 'text-3xl font-bold mb-8' }, 'Saved Listings'),
        React.createElement('div', { className: 'text-center py-16 bg-white rounded-lg shadow-md' },
          React.createElement('svg', { className: 'w-20 h-20 mx-auto text-gray-400 mb-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
          ),
          React.createElement('p', { className: 'text-gray-500 text-lg mb-2' }, 'No saved listings yet'),
          React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Tap the heart icon on any listing to save it here'),
          React.createElement('a', {
            href: '/listings',
            onClick: function(e) { e.preventDefault();
              navigate('/'); },
            className: 'inline-block bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition'
          }, 'Browse Listings')
        )
      )
    );
  }
  
  return React.createElement(React.Fragment, null,
    
    toast.show && React.createElement('div', {
      className: 'fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-fade-in-up ' +
        (toast.type === 'success' ? 'bg-green-600' : 
         toast.type === 'error' ? 'bg-red-600' : 
         'bg-blue-600')
    }, toast.message),

    React.createElement('div', { 
      ref: pageRef,
      className: 'min-h-screen bg-green-50 py-8 overflow-y-auto' 
    },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4' },
        
    
        
        activeFavorites.length > 0 &&
        React.createElement('div', { className: 'mb-8' },
          React.createElement('h2', { className: 'text-xl font-semibold mb-4 text-gray-700' }, 'Available Listings'),
          React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
            activeFavorites.map(function(listing) {
              const isOwner = user && user.uid === listing.userId;
              
              return React.createElement('div', {
                key: listing.id,
                className: 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition',
                onClick: function() { navigate('/listing/' + listing.id); }
              },
                
                React.createElement('div', { className: 'relative h-40 bg-gray-200' },
                  React.createElement('img', {
                    src: listing.images?.[0]
                      ? window.CloudinaryHelpers.getCardUrl(listing.images[0])
                      : '/vault/img/no-image.jpg',
                    alt: listing.title,
                    className: 'w-full h-full object-cover',
                    loading: 'lazy',
                    onError: (e) => { e.target.src = '/vault/img/no-image.jpg'; }
                  }),
                  
                  React.createElement('div', { className: 'absolute bottom-1 left-1 bg-green-950 text-white px-1.5 py-0.5 rounded font-bold text-sm' },
                    '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                  )
                ),
                
                React.createElement('div', { className: 'p-2' },
                  React.createElement('h3', { className: 'font-bold text-gray-900 mb-0.5 line-clamp-1 text-sm' }, listing.title),
                  React.createElement('p', { className: 'text-gray-600 mb-1 line-clamp-1 text-xs' }, listing.address),
                  
                  // ===== UPDATED: Role badge - shows Landlord or Agent, no badge for regular users =====
                  React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                    listing.userType && listing.userType !== 'user' &&
                      React.createElement(RoleBadge, { 
                        user: { userType: listing.userType }, 
                        size: 'xs' 
                      }),
                    listing.propertyType && React.createElement('span', {
                      className: 'bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-[10px]'
                    }, listing.propertyType)
                  ),
                  
                  React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100' },
                    React.createElement('div', { className: 'flex gap-1' },
                      
                      user && !isOwner && React.createElement('button', {
                        onClick: function(e) { 
                          handleCardMessageClick(listing.id, listing.userId, e);
                        },
                        className: 'text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition text-xs',
                        title: 'Send message about this property'
                      },
                        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                        )
                      ),
                      
                      React.createElement('button', {
                        onClick: function(e) { 
                          handleShare(listing, e);
                        },
                        className: 'text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition text-xs',
                        title: 'Share'
                      },
                        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                        )
                      )
                    ),
                    
                    React.createElement('button', {
                      onClick: function(e) { 
                        handleRemoveFromFavorites(listing.id, e);
                      },
                      className: 'p-1 rounded hover:bg-gray-100 transition text-xs text-red-500 hover:text-red-700',
                      title: 'Remove from favorites'
                    },
                      React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                        React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                      )
                    )
                  )
                )
              );
            })
          )
        ),
        
        deletedFavorites.length > 0 &&
        React.createElement('div', null,
          React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('h2', { className: 'text-xl font-semibold text-gray-500' }, 'Unavailable Listings'),
            React.createElement('button', {
              onClick: handleRemoveAllUnavailable,
              className: 'text-sm text-red-600 hover:text-red-800 cursor-pointer'
            }, 'Remove all')
          ),
          React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 opacity-75' },
            deletedFavorites.map(function(listing) {
              return React.createElement('div', {
                key: listing.id,
                className: 'bg-white rounded-lg shadow-md overflow-hidden opacity-75',
                onClick: function() { navigate('/listing/' + listing.id); }
              },
                
                React.createElement('div', { className: 'relative h-40 bg-gray-200' },
                  React.createElement('img', {
                    src: listing.images?.[0]
                      ? window.CloudinaryHelpers.getCardUrl(listing.images[0])
                      : '/vault/img/no-image.jpg',
                    alt: listing.title,
                    className: 'w-full h-full object-cover grayscale',
                    loading: 'lazy',
                    onError: (e) => { e.target.src = '/vault/img/no-image.jpg'; }
                  }),
                  
                  React.createElement('div', { className: 'absolute inset-0 bg-black/50 flex items-center justify-center' },
                    React.createElement('span', { className: 'bg-red-500 text-white px-2 py-1 rounded text-xs font-bold' }, 'Removed')
                  ),
                  
                  React.createElement('div', { className: 'absolute bottom-1 left-1 bg-green-950 text-white px-1.5 py-0.5 rounded font-bold text-sm' },
                    '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                  )
                ),
                
                React.createElement('div', { className: 'p-2' },
                  React.createElement('h3', { className: 'font-bold text-gray-900 mb-0.5 line-clamp-1 text-sm line-through' }, listing.title),
                  React.createElement('p', { className: 'text-gray-600 mb-1 line-clamp-1 text-xs' }, listing.address),
                  
                  React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                    React.createElement('span', {
                      className: 'bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px]'
                    }, 'Removed')
                  ),
                  
                  React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100' },
                    React.createElement('div', { className: 'flex gap-1' },
                      
                      React.createElement('button', {
                        disabled: true,
                        className: 'text-gray-300 p-1 rounded text-xs cursor-not-allowed',
                        title: 'Cannot message on removed listing'
                      },
                        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                        )
                      ),
                      
                      React.createElement('button', {
                        disabled: true,
                        className: 'text-gray-300 p-1 rounded text-xs cursor-not-allowed',
                        title: 'Cannot share removed listing'
                      },
                        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                        )
                      )
                    ),
                    
                    React.createElement('button', {
                      onClick: function(e) { 
                        handleRemoveFromFavorites(listing.id, e);
                      },
                      className: 'p-1 rounded hover:bg-gray-100 transition text-xs text-red-500 hover:text-red-700',
                      title: 'Remove from favorites'
                    },
                      React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                        React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                      )
                    )
                  )
                )
              );
            })
          )
        )
      )
    )
  );
}

window.FavoritesPage = FavoritesPage;