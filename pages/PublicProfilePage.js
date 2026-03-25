// pages/PublicProfilePage.js - Username-based profile (FIXED)
function PublicProfilePage({ user, navigate }) {
  
  // Extract username from URL (e.g., /johnd1234)
  const username = window.location.pathname.slice(1); // Remove leading /

  const [profileUser, setProfileUser] = React.useState(null);
  const [listings, setListings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [listingsLoading, setListingsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('listings');
  const [usingIndex, setUsingIndex] = React.useState(true);
  const [favorites, setFavorites] = React.useState({});
  const [checkingFavorites, setCheckingFavorites] = React.useState({});
  const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
  
  const { openModal } = window.useAuthModal();
  const toastTimeoutRef = React.useRef(null);
  
  // ===== STATE FOR CURRENT USER'S USERNAME (for self-profile detection) =====
  const [currentUserUsername, setCurrentUserUsername] = React.useState(null);
  const [currentUserUid, setCurrentUserUid] = React.useState(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToast({ show: true, message, type });
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ===== FETCH CURRENT USER'S USERNAME AND UID =====
  React.useEffect(() => {
    if (!user) return;
    
    setCurrentUserUid(user.uid);
    
    const fetchCurrentUser = async () => {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setCurrentUserUsername(userDoc.data().username);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    
    fetchCurrentUser();
  }, [user]);

  // ===== FETCH USER BY USERNAME =====
  React.useEffect(function() {
    if (!username) {
      setError('No username provided');
      setLoading(false);
      return;
    }

    // ===== FIXED: Check if viewing own profile by comparing usernames =====
    // Also check if the URL username equals current user's username
    if (user && currentUserUsername && currentUserUsername === username) {
      navigate('/profile');
      return;
    }

    var isMounted = true;
    setLoading(true);
    setError('');

    async function fetchUserByUsername() {
      try {
        // Query Firestore by username
        const result = await FirestoreQueries.query({
          collection: 'users',
          where: [['username', '==', username.toLowerCase()]],
          limit: 1
        });
        
        if (result.data.length === 0) {
          if (isMounted) {
            setError('User not found');
            setLoading(false);
          }
          return;
        }

        var userData = { id: result.data[0].id, ...result.data[0] };
        
        // ===== CRITICAL FIX: Verify we actually got the correct user =====
        // Make sure the fetched user's username matches exactly what we searched for
        if (userData.username && userData.username.toLowerCase() !== username.toLowerCase()) {
          if (isMounted) {
            setError('User not found');
            setLoading(false);
          }
          return;
        }
        
        // Use displayName (new field) with fallback to name (old field)
        if (!userData.displayName && userData.name) {
          userData.displayName = userData.name;
        }
        if (!userData.displayName) {
          userData.displayName = 'User';
        }

        if (isMounted) {
          setProfileUser(userData);
          setLoading(false);
        }

      } catch (err) {
        console.error('Error fetching user by username:', err);
        if (isMounted) {
          setError('Failed to load profile');
          setLoading(false);
        }
      }
    }

    fetchUserByUsername();

    return function() {
      isMounted = false;
    };
  }, [username, user, currentUserUsername, navigate]);

  // ===== FETCH USER'S LISTINGS =====
  React.useEffect(function() {
    if (!profileUser) return;
    
    var isMounted = true;
    setListingsLoading(true);

    async function fetchListings() {
      try {
        const result = await FirestoreQueries.query({
          collection: 'listings',
          where: [
            ['userId', '==', profileUser.id],
            ['status', '==', 'available']
          ],
          orderBy: 'createdAt',
          orderDirection: 'desc',
          limit: 50
        });
        
        setUsingIndex(result.usingIndex);

        if (isMounted) {
          setListings(result.data);
          setListingsLoading(false);
          
          if (user) {
            checkAllFavorites(result.data);
          }
        }

      } catch (err) {
        console.error('Error fetching listings:', err);
        if (isMounted) {
          setListings([]);
          setListingsLoading(false);
        }
      }
    }

    fetchListings();

    return function() {
      isMounted = false;
    };
  }, [profileUser, user]);

  const checkAllFavorites = async (listingsArray) => {
    if (!user) return;
    
    const favoritesMap = {};
    
    for (const listing of listingsArray) {
      try {
        const isFav = await FavoritesHelpers.checkIsFavorite(user.uid, listing.id);
        favoritesMap[listing.id] = isFav;
      } catch (error) {
        
      }
    }
    
    setFavorites(favoritesMap);
  };

  const handleToggleFavorite = async (listingId, e) => {
    e.stopPropagation();
    
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
    const currentStatus = favorites[listingId] || false;
    
    setFavorites(prev => ({ ...prev, [listingId]: !currentStatus }));
    setCheckingFavorites(prev => ({ ...prev, [listingId]: true }));
    
    try {
      const newStatus = await FavoritesHelpers.toggleFavorite(user.uid, listingId);
      setFavorites(prev => ({ ...prev, [listingId]: newStatus }));
      
      showToast(
        newStatus ? '✓ Saved to favorites' : '✓ Removed from favorites',
        'success'
      );
      
    } catch (error) {
      
      setFavorites(prev => ({ ...prev, [listingId]: currentStatus }));
      showToast('Failed to update favorites', 'error');
    } finally {
      setCheckingFavorites(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const handleCardMessageClick = async (listingId, userId, e) => {
    e.stopPropagation();
    
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
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
    
    await ShareHelpers.shareListing(listing, {
      showToast,
      includePrice: true
    });
  };

  const formatJoinDate = function(timestamp) {
    if (!timestamp) return 'Recently';
    try {
      var date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });
    } catch (e) {
      return 'Recently';
    }
  };

  const getResponseRate = function() {
    return (profileUser && profileUser.replyRate) ? profileUser.replyRate : 98;
  };

  // ===== HELPER TO CHECK VERIFICATION STATUS =====
  const isLandlordVerified = profileUser?.verified?.landlord?.status === 'approved';
  const isAgentVerified = profileUser?.verified?.agent?.status === 'approved';

  // ===== RENDER ROLE BADGES (can show both) =====
  const renderRoleBadges = () => {
    const badges = [];
    
    if (isLandlordVerified) {
      badges.push(
        React.createElement('span', {
          key: 'landlord',
          className: 'inline-flex items-center bg-green-100 text-green-700 border border-green-200 rounded-full font-medium text-sm px-2.5 py-1'
        }, 'Landlord')
      );
    }
    
    if (isAgentVerified) {
      badges.push(
        React.createElement('span', {
          key: 'agent',
          className: 'inline-flex items-center bg-gray-700 text-white border border-gray-800 rounded-full font-medium text-sm px-2.5 py-1'
        }, 'Agent')
      );
    }
    
    if (badges.length === 0) return null;
    
    return React.createElement('div', { className: 'flex items-center gap-2 mt-1' }, ...badges);
  };

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50' },
      React.createElement('div', { className: 'max-w-4xl mx-auto px-4 py-8' },
        React.createElement('div', { className: 'flex justify-center items-center h-64' },
          React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
        )
      )
    );
  }

  if (error) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center max-w-sm mx-auto px-4' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '😕'),
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'User Not Found'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, error),
        React.createElement('button', {
          onClick: function() { navigate('/'); },
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Go Home')
      )
    );
  }

  if (!profileUser) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center max-w-sm mx-auto px-4' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '👤'),
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'No Profile Data'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 'This user profile could not be loaded.'),
        React.createElement('button', {
          onClick: function() { navigate('/'); },
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Go Home')
      )
    );
  }

  var isOwnProfile = user && user.uid === profileUser.id;
  var joinDate = formatJoinDate(profileUser.createdAt);
  var responseRate = getResponseRate();

  return React.createElement(React.Fragment, null,
    
    toast.show && React.createElement('div', {
      className: 'fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-fade-in-up ' +
        (toast.type === 'success' ? 'bg-green-600' : 
         toast.type === 'error' ? 'bg-red-600' : 
         'bg-blue-600')
    }, toast.message),

    React.createElement('div', { className: 'min-h-screen bg-green-50' },
      React.createElement('div', { className: 'max-w-4xl mx-auto px-4 py-8' },

        React.createElement('div', { className: 'mb-4' },
          React.createElement('button', {
            onClick: function() { window.history.back(); },
            className: 'text-gray-600 hover:text-green-950 flex items-center gap-1 text-sm'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M15 19l-7-7 7-7' })
            ),
            'Back'
          )
        ),

        React.createElement('div', { className: 'bg-white rounded-xl shadow-md overflow-hidden mb-6' },
          React.createElement('div', { className: 'h-32 bg-gradient-to-r from-green-800 to-green-600 relative' },
            React.createElement('div', { 
              className: 'absolute -bottom-12 left-6 w-24 h-24 rounded-full border-4 border-white bg-green-200 overflow-hidden shadow-lg'
            },
              profileUser.photoURL ?
                React.createElement('img', {
                  src: profileUser.photoURL,
                  alt: profileUser.displayName,
                  className: 'w-full h-full object-cover',
                  onError: function(e) {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-green-200"><span class="text-3xl font-bold text-green-800">' + 
                      (profileUser.displayName ? profileUser.displayName.charAt(0).toUpperCase() : 'U') + '</span></div>';
                  }
                }) :
                React.createElement('div', { className: 'w-full h-full flex items-center justify-center bg-green-200' },
                  React.createElement('span', { className: 'text-3xl font-bold text-green-800' },
                    profileUser.displayName ? profileUser.displayName.charAt(0).toUpperCase() : 'U'
                  )
                )
            )
          ),

          React.createElement('div', { className: 'pt-14 p-6' },
            React.createElement('div', { className: 'flex flex-wrap justify-between items-start gap-4' },
              React.createElement('div', null,
                // Display Name
                React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                  React.createElement('h1', { className: 'text-2xl font-bold text-gray-900' },
                    profileUser.displayName || 'User'
                  )
                ),
                
                // Username with @
                React.createElement('p', { className: 'text-sm text-gray-500 mb-2' },
                  '@' + (profileUser.username || 'username-not-set')
                ),
                
                // Role badges (both if verified)
                renderRoleBadges(),
                
                React.createElement('div', { className: 'flex items-center gap-4 text-sm text-gray-600 mt-2' },
                  React.createElement('span', { className: 'flex items-center gap-1' },
                    React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
                    ),
                    listings.length + ' active listing' + (listings.length !== 1 ? 's' : '')
                  ),
                  React.createElement('span', { className: 'flex items-center gap-1' },
                    React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
                    ),
                    responseRate + '% response rate'
                  )
                )
              ),

              React.createElement('div', { className: 'flex gap-2' },
                isOwnProfile ? React.createElement('button', {
                  onClick: function() { navigate('/profile-settings'); },
                  className: 'bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 text-sm'
                },
                  React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })
                  ),
                  'Edit Profile'
                ) : null
              )
            ),

            profileUser.bio ? React.createElement('div', { className: 'mt-4 pt-4 border-t border-gray-100' },
              React.createElement('p', { className: 'text-gray-700 text-sm whitespace-pre-line' }, profileUser.bio)
            ) : null
          )
        ),

        React.createElement('div', { className: 'border-b border-gray-200 mb-6' },
          React.createElement('div', { className: 'flex gap-6' },
            React.createElement('button', {
              onClick: function() { setActiveTab('listings'); },
              className: 'pb-3 font-medium text-sm transition ' + (activeTab === 'listings'
                  ? 'text-green-950 border-b-2 border-green-950'
                  : 'text-gray-500 hover:text-gray-700')
            }, 'Listings (' + listings.length + ')'),
            React.createElement('button', {
              onClick: function() { setActiveTab('about'); },
              className: 'pb-3 font-medium text-sm transition ' + (activeTab === 'about'
                  ? 'text-green-950 border-b-2 border-green-950'
                  : 'text-gray-500 hover:text-gray-700')
            }, 'About')
          )
        ),

        activeTab === 'listings' ? 
          React.createElement('div', null,
            listingsLoading ? 
              React.createElement('div', { className: 'flex justify-center py-12' },
                React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
              ) : (
              listings.length === 0 ?
                React.createElement('div', { className: 'text-center py-16 bg-white rounded-lg shadow-sm' },
                  React.createElement('div', { className: 'text-5xl mb-3' }, '🏠'),
                  React.createElement('p', { className: 'text-gray-500' }, 'No active listings at the moment.')
                ) :
                React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
                  listings.map(function(listing) {
                    const isOwner = user && user.uid === listing.userId;
                    const isFav = favorites[listing.id] || false;
                    const isChecking = checkingFavorites[listing.id] || false;
                    
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
                        
                        React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                          listing.listingRole === 'landlord' &&
                            React.createElement('span', {
                              className: 'bg-green-100 text-green-700 px-1 py-0.5 rounded text-[10px]'
                            }, 'Landlord'),
                          listing.listingRole === 'agent' &&
                            React.createElement('span', {
                              className: 'bg-gray-700 text-white px-1 py-0.5 rounded text-[10px]'
                            }, 'Agent'),
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
                              handleToggleFavorite(listing.id, e);
                            },
                            disabled: isChecking,
                            className: 'p-1 rounded hover:bg-gray-100 transition text-xs ' +
                              (isFav ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-red-500') +
                              (isChecking ? ' opacity-50 cursor-wait' : ''),
                            title: isFav ? 'Remove from favorites' : 'Save to favorites'
                          },
                            isFav ?
                              React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                                React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                              ) :
                              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                              )
                          )
                        )
                      )
                    );
                  })
                )
              )
          ) : null,

        activeTab === 'about' ? 
          React.createElement('div', { className: 'bg-white rounded-lg shadow-sm p-6' },
            React.createElement('div', { className: 'space-y-4' },
              React.createElement('div', null,
                React.createElement('h3', { className: 'text-sm font-medium text-gray-500 mb-2' }, 'Verification Status'),
                React.createElement('div', { className: 'space-y-2' },
                  React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-base' }, ''),
                      React.createElement('span', { className: 'text-sm text-gray-700' }, 'Landlord')
                    ),
                    React.createElement('span', { 
                      className: `text-xs px-2 py-0.5 rounded-full ${
                        isLandlordVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`
                    }, isLandlordVerified ? 'Verified' : 'Not Verified')
                  ),
                  React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-base' }, ''),
                      React.createElement('span', { className: 'text-sm text-gray-700' }, 'Agent')
                    ),
                    React.createElement('span', { 
                      className: `text-xs px-2 py-0.5 rounded-full ${
                        isAgentVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`
                    }, isAgentVerified ? 'Verified' : 'Not Verified')
                  )
                )
              ),

              React.createElement('div', null,
                React.createElement('h3', { className: 'text-sm font-medium text-gray-500 mb-2' }, 'Member Since'),
                React.createElement('p', { className: 'text-sm text-gray-700' }, joinDate)
              ),

              React.createElement('div', null,
                React.createElement('h3', { className: 'text-sm font-medium text-gray-500 mb-2' }, 'Response Stats'),
                React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                  React.createElement('div', null,
                    React.createElement('p', { className: 'text-lg font-bold text-gray-900' }, responseRate + '%'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Response Rate')
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { className: 'text-lg font-bold text-gray-900' }, profileUser.responseTime || '< 1hr'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Typical Response')
                  )
                )
              ),

              !isOwnProfile && user ? React.createElement('div', null,
                React.createElement('h3', { className: 'text-sm font-medium text-gray-500 mb-2' }, 'Contact'),
                React.createElement('p', { className: 'text-sm text-gray-600' },
                  'You can message ' + (profileUser.displayName || 'this user') + ' through any of their listings.'
                )
              ) : null
            )
          ) : null
      )
    )
  );
}

window.PublicProfilePage = PublicProfilePage;