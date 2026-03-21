// pages/home/index.js - COMPLETE WITH SEARCH TOGGLE (ARROW → X) AND FAVORITES TOAST
// Includes: delete modal, owner controls, other locations, recommendations, desktop layout

function HomePage({ user, navigate, cachedState, locationState }) {
  // ===== HOOKS =====
  const accessibility = window.useAccessibility?.() || {
    settings: { fontSize: 'normal', highContrast: false, reduceMotion: false, dyslexicFont: false, showLinks: false },
    updateSetting: function() {},
    resetSettings: function() {}
  };

  const { settings } = accessibility;
  
  // Custom hooks
  const listingsHook = window.useListings(cachedState);
  const favoritesHook = window.useFavorites(user);
  const searchHook = window.useSearch(cachedState?.searchTerm || '');
  const filtersHook = window.useFilters(cachedState?.filters);
  const carouselHook = window.useCarousel(cachedState?.carouselListings);
  
  // ===== USE TOAST HOOK =====
  const { showToast, ToastComponent } = window.useToast?.() || { 
    showToast: () => {}, 
    ToastComponent: null 
  };
  
  // ===== SEARCH TOGGLE STATE =====
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  
  // ===== OTHER LOCATIONS HOOK =====
  const otherLocationsHook = window.useOtherLocations(
    listingsHook.listings,
    searchHook.searchTerm,
    filtersHook.filters
  );
  
  // ===== RECOMMENDATIONS HOOK =====
  const [recommendedListings, setRecommendedListings] = React.useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = React.useState(false);
  
  // ===== DELETE MODAL STATE =====
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [listingToDelete, setListingToDelete] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Toast state
  const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
  const [showAccessibility, setShowAccessibility] = React.useState(false);
  
  const feedContainerRef = React.useRef(null);
  const toastTimeoutRef = React.useRef(null);
  const { openModal } = window.useAuthModal();

  // ===== View mode state (grid or map) =====
  const [viewMode, setViewMode] = React.useState(() => {
    if (cachedState?.viewMode) {
      return cachedState.viewMode;
    }
    if (locationState?.from === 'listing-detail' && locationState?.returnTo === 'map') {
      return 'map';
    }
    return localStorage.getItem('home_view_mode') || 'grid';
  });

  // ===== Map-related state =====
  const [mapCenter, setMapCenter] = React.useState(() => {
    if (cachedState?.mapCenter) {
      return cachedState.mapCenter;
    }
    if (locationState?.mapCenter) {
      return locationState.mapCenter;
    }
    return null;
  });
  
  const [mapZoom, setMapZoom] = React.useState(() => {
    if (cachedState?.mapZoom) {
      return cachedState.mapZoom;
    }
    if (locationState?.mapZoom) {
      return locationState.mapZoom;
    }
    return 6;
  });
  
  const [mapInstance, setMapInstance] = React.useState(null);
  
  // Scroll detection
  const { scrollDirection, scrollY } = window.useScrollDirection({ container: feedContainerRef });
  const [showSearchBar, setShowSearchBar] = React.useState(true);

  // ===== DETECT DESKTOP MODE =====
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 768);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Layout helpers
  const layout = window.AccessibilityLayout || {
    getGridCols: function() { return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'; },
    getCardSize: function() { return { image: 'h-40', title: 'text-sm', price: 'text-sm', address: 'text-xs', badge: 'text-[10px]', button: 'text-xs' }; },
    getContainerPadding: function() { return 'px-4 py-4'; },
    getBodyTextSize: function() { return 'text-base'; },
    getHeadingSize: function() { return 'text-2xl'; },
    getSpacing: function() { return 'space-y-3'; },
    getTouchTargetSize: function() { return 'min-h-[44px] min-w-[44px]'; },
    getLineHeight: function() { return 'leading-relaxed'; }
  };

  // Desktop grid classes
  const desktopGridCols = isDesktop ? 'desktop-card-grid' : layout.getGridCols(settings.fontSize, 'listings');
  const cardSizes = layout.getCardSize(settings.fontSize);
  const bodyTextSize = layout.getBodyTextSize(settings.fontSize);
  const headingSize = layout.getHeadingSize(settings.fontSize, 'h2');
  const spacing = layout.getSpacing(settings.fontSize);

  // ===== COMPUTED VALUES =====
  const searchSuggestions = React.useMemo(function() {
    return searchHook.getSearchSuggestions(listingsHook.listings);
  }, [searchHook.searchTerm, listingsHook.listings]);

  // Apply filters to listings
  const filteredListings = React.useMemo(function() {
    return window.ScoringHelpers?.filterListings(
      listingsHook.listings, 
      searchHook.searchTerm, 
      filtersHook.filters
    ) || [];
  }, [listingsHook.listings, searchHook.searchTerm, filtersHook.filters]);

  const sortedListings = React.useMemo(function() {
    return window.ScoringHelpers?.sortListings(
      filteredListings,
      filtersHook.filters.sortBy,
      window.AffinityHelpers?.loadAffinity() || {}
    ) || [];
  }, [filteredListings, filtersHook.filters.sortBy]);

  // ===== LOAD RECOMMENDATIONS WHEN NO RESULTS =====
  React.useEffect(() => {
    const loadRecommendations = async () => {
      const hasActiveFilters = filtersHook.activeFilterCount > 0;
      const hasSearchTerm = searchHook.searchTerm && searchHook.searchTerm.length >= 2;
      const hasNoResults = sortedListings.length === 0;
      
      if ((hasActiveFilters || hasSearchTerm) && hasNoResults) {
        setRecommendationsLoading(true);
        
        try {
          const affinity = window.AffinityHelpers?.loadAffinity() || {};
          
          let query = db.collection('listings')
            .where('status', '==', 'available')
            .limit(20);
          
          const preferredStates = [];
          const preferredTypes = [];
          const preferredBedrooms = [];
          
          Object.keys(affinity).forEach(key => {
            if (key.startsWith('state_')) preferredStates.push(key.replace('state_', ''));
            if (key.startsWith('type_')) preferredTypes.push(key.replace('type_', ''));
            if (key.startsWith('bed_')) preferredBedrooms.push(key.replace('bed_', ''));
          });
          
          const snapshot = await query.get();
          let listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          listings = listings.map(listing => {
            let score = 0;
            if (preferredStates.includes(listing.state)) score += 3;
            if (preferredTypes.includes(listing.propertyType)) score += 2;
            if (preferredBedrooms.includes(listing.bedrooms)) score += 1;
            return { ...listing, score };
          });
          
          listings.sort((a, b) => (b.score || 0) - (a.score || 0));
          setRecommendedListings(listings.slice(0, 12));
          
        } catch (err) {
          console.error('Error loading recommendations:', err);
        } finally {
          setRecommendationsLoading(false);
        }
      } else {
        setRecommendedListings([]);
      }
    };
    
    loadRecommendations();
  }, [
    searchHook.searchTerm, 
    sortedListings.length, 
    filtersHook.activeFilterCount,
    filtersHook.filters.minPrice,
    filtersHook.filters.maxPrice,
    filtersHook.filters.state,
    filtersHook.filters.lga,
    filtersHook.filters.bedrooms,
    filtersHook.filters.propertyType,
    filtersHook.filters.furnishing,
    filtersHook.filters.agentOnly,
    filtersHook.filters.noAgentFees
  ]);

  // ===== EFFECTS =====
  React.useEffect(function() {
    if (user && listingsHook.listings.length > 0) {
      favoritesHook.loadFavorites(listingsHook.listings);
    }
  }, [user, listingsHook.listings]);

  // Load carousel favorites
  React.useEffect(function() {
    if (user && carouselHook.carouselListings.length > 0) {
      (async function() {
        const map = {};
        await Promise.all(carouselHook.carouselListings.map(async function(l) {
          try { map[l.id] = await window.FavoritesHelpers?.checkIsFavorite(user.uid, l.id); } catch(e) {}
        }));
        if (carouselHook.setCarouselFavorites) {
          carouselHook.setCarouselFavorites(map);
        }
      })();
    }
  }, [user, carouselHook.carouselListings]);

  // Restore cached state
  React.useEffect(function() {
    if (!cachedState) return;
    if (cachedState.currentCarouselIndex !== undefined) {
      carouselHook.setCurrentCarouselIndex(cachedState.currentCarouselIndex);
    }
    if (cachedState.searchTerm) {
      searchHook.setSearchTerm(cachedState.searchTerm);
    }
  }, [cachedState, carouselHook, searchHook]);

  // ===== HANDLE VIEW TOGGLE - FIXED VERSION =====
  const handleViewToggle = React.useCallback(() => {
    // Use functional update to ensure we have the latest state
    setViewMode(prevMode => {
      const newMode = prevMode === 'grid' ? 'map' : 'grid';
      localStorage.setItem('home_view_mode', newMode);
      
      // Dispatch event for other components (like Layout)
      const event = new CustomEvent('view-mode-changed', { 
        detail: { mode: newMode } 
      });
      window.dispatchEvent(event);
      
      // Also update window.__homePageState immediately
      if (window.__homePageState) {
        window.__homePageState.viewMode = newMode;
      }
      
      return newMode;
    });
  }, []); // Empty dependency array is fine because we use functional update

  // ===== SAVE STATE FOR CACHE =====
  React.useEffect(function() {
    let mapCenterState = mapCenter;
    let mapZoomState = mapZoom;
    let scrollPosition = feedContainerRef.current?.scrollTop || 0;
    
    if (mapInstance) {
      const center = mapInstance.getCenter();
      mapCenterState = [center.lat, center.lng];
      mapZoomState = mapInstance.getZoom();
    }
    
    window.__homePageState = { 
      searchTerm: searchHook.searchTerm, 
      filters: filtersHook.filters, 
      currentCarouselIndex: carouselHook.currentCarouselIndex, 
      listings: listingsHook.listings, 
      hasMore: listingsHook.hasMore, 
      usingIndex: listingsHook.usingIndex, 
      carouselListings: carouselHook.carouselListings,
      viewMode: viewMode,
      mapCenter: mapCenterState,
      mapZoom: mapZoomState,
      scrollPosition: scrollPosition,
      setSearchTerm: searchHook.setSearchTerm,
      handleSearchSubmit: handleSearchSubmit,
      openFilterModal: filtersHook.openFilterModal,
      handleViewToggle: handleViewToggle,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('homepage_state', JSON.stringify({
        viewMode: viewMode,
        mapCenter: mapCenterState,
        mapZoom: mapZoomState,
        filters: filtersHook.filters,
        searchTerm: searchHook.searchTerm,
        currentCarouselIndex: carouselHook.currentCarouselIndex,
        timestamp: Date.now()
      }));
    } catch (e) {}
    
    return function() { delete window.__homePageState; };
  }, [
    searchHook.searchTerm, 
    filtersHook.filters, 
    carouselHook.currentCarouselIndex, 
    listingsHook.listings, 
    listingsHook.hasMore, 
    listingsHook.usingIndex, 
    carouselHook.carouselListings,
    viewMode,
    mapCenter,
    mapZoom,
    mapInstance,
    handleViewToggle
  ]);

  // Scroll control for search bar (mobile only)
  React.useEffect(() => {
    if (!isDesktop) {
      setShowSearchBar(!(scrollDirection === 'down' && scrollY > 50));
    }
  }, [scrollDirection, scrollY, isDesktop]);

  // Load initial data
  React.useEffect(function() {
    if (!cachedState?.carouselListings || cachedState.carouselListings.length === 0) {
      carouselHook.fetchCarouselListings();
    }
  }, [cachedState]);

  React.useEffect(function() {
    if (!cachedState?.listings || cachedState.listings.length === 0) {
      listingsHook.loadListings();
    }
  }, [cachedState]);

  // Restore scroll position
  React.useEffect(() => {
    if (cachedState?.scrollPosition && feedContainerRef.current) {
      feedContainerRef.current.scrollTop = cachedState.scrollPosition;
    }
  }, [cachedState]);

  // ===== LISTEN FOR VIEW MODE CHANGES =====
  React.useEffect(() => {
    const handleViewModeChange = (event) => {
      const newMode = event.detail?.mode || event.detail;
      if (newMode === 'grid') {
        setViewMode('grid');
        localStorage.setItem('home_view_mode', 'grid');
      }
    };
    
    window.addEventListener('view-mode-changed', handleViewModeChange);
    return () => window.removeEventListener('view-mode-changed', handleViewModeChange);
  }, []);

  // ===== HANDLERS =====
  // Use the showToast from useToast hook
  const showToastMessage = showToast;

  // Listen for toast events (backward compatibility)
  React.useEffect(() => {
    const handleToast = (e) => {
      showToastMessage(e.detail.message, e.detail.type);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, [showToastMessage]);

  // ===== FAVORITES HANDLER WITH TOAST =====
  const handleToggleFavorite = React.useCallback(async (listingId, e) => {
    e.stopPropagation();
    
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
    const previousState = favoritesHook.favorites[listingId] || false;
    
    // Optimistic update
    favoritesHook.setFavorites(prev => ({ ...prev, [listingId]: !previousState }));
    
    try {
      const newState = await FavoritesHelpers.toggleFavorite(user.uid, listingId);
      
      // Update with actual server response
      favoritesHook.setFavorites(prev => ({ ...prev, [listingId]: newState }));
      
      showToastMessage(
        newState ? '✓ Saved to favorites' : '✓ Removed from favorites',
        'success'
      );
      
    } catch (error) {
      // Revert on error
      favoritesHook.setFavorites(prev => ({ ...prev, [listingId]: previousState }));
      showToastMessage('Failed to update favorites', 'error');
    }
  }, [user, openModal, favoritesHook, showToastMessage]);

  // ===== SEARCH HANDLERS WITH TOGGLE =====
  const handleSearchSubmit = React.useCallback(function(term) {
    if (term.trim().length > 1) {
      searchHook.saveSearchHistory(term);
      const count = sortedListings.length;
      setIsSearchActive(true); // Mark search as active - turns arrow into X
      showToastMessage(
        count > 0 ? count + ' result' + (count === 1 ? '' : 's') + ' found' : 'No listings match your search', 
        count > 0 ? 'success' : 'info'
      );
    }
  }, [searchHook, sortedListings, showToastMessage]);

  const handleClearSearch = React.useCallback(function() {
    searchHook.setSearchTerm('');
    setIsSearchActive(false); // Exit search mode - X disappears
    showToastMessage('Search cleared', 'info');
  }, [searchHook, showToastMessage]);

  const handleSelectSuggestion = React.useCallback(function(suggestion) {
    searchHook.setSearchTerm(suggestion);
    searchHook.setShowSearchDropdown(false);
    searchHook.saveSearchHistory(suggestion);
    setIsSearchActive(true); // Mark search as active
    setTimeout(() => {
      const count = sortedListings.length;
      showToastMessage(
        count > 0 ? count + ' result' + (count === 1 ? '' : 's') + ' found' : 'No listings match your search', 
        count > 0 ? 'success' : 'info'
      );
    }, 100);
  }, [searchHook, sortedListings, showToastMessage]);

  // ===== USE CENTRALIZED VERIFICATION CHECK =====
  const handleStartChat = React.useCallback(async function(landlordId, listingId, e) {
    e.stopPropagation();
    
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
    // ===== USE CENTRALIZED VERIFICATION CHECK =====
    const verificationCheck = window.VerificationHelpers?.checkEmailVerification(user, 'send messages');
    if (!verificationCheck?.allowed) {
      const message = verificationCheck?.message || 'Please verify your email to send messages';
      showToastMessage(message, 'warning');
      
      const event = new CustomEvent('show-verification-warning', {
        detail: { message }
      });
      window.dispatchEvent(event);
      
      return;
    }
    
    if (user.uid === landlordId) {
      showToastMessage('You cannot chat with yourself', 'error');
      return;
    }
    
    try {
      showToastMessage('Starting conversation...', 'info');
      
      if (!window.ChatHelpers) {
        throw new Error('Chat system not available');
      }
      
      const chatId = await window.ChatHelpers.getOrCreateListingChat(
        user.uid,
        landlordId,
        listingId,
        'Is this still available?'
      );
      
      if (!chatId) {
        throw new Error('No chat ID returned');
      }
      
      navigate('/chat?chat=' + chatId);
      
    } catch (err) {
      showToastMessage(err.message || 'Failed to start chat. Please try again.', 'error');
    }
  }, [user, openModal, navigate, showToastMessage]);

  const handleShare = React.useCallback(async function(listing, e) {
    e.stopPropagation();
    await window.ShareHelpers?.shareNaijaStyle(listing, { showToast: showToastMessage });
  }, [showToastMessage]);

  const handleDeleteListing = React.useCallback(async function(listingId) {
    if (!user) return;
    
    try {
      await db.collection('listings').doc(listingId).update({
        status: 'deleted',
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      listingsHook.setListings(function(prev) { 
        return prev.filter(function(l) { return l.id !== listingId; }); 
      });
      carouselHook.setCarouselListings(function(prev) { 
        return prev.filter(function(l) { return l.id !== listingId; }); 
      });
      
      showToastMessage('Listing deleted successfully');
    } catch(err) {
      showToastMessage('Failed to delete listing', 'error');
    }
  }, [user, showToastMessage, listingsHook, carouselHook]);

  const handleEditListing = React.useCallback(function(listingId) {
    openModal('post', { listingId: listingId });
  }, [openModal]);

  // ===== DELETE MODAL HANDLERS =====
  const handleOpenDeleteModal = React.useCallback(function(listingId) {
    const listing = listingsHook.listings.find(l => l.id === listingId);
    setListingToDelete(listing);
    setShowDeleteModal(true);
  }, [listingsHook.listings]);

  const handleCloseDeleteModal = React.useCallback(function() {
    setShowDeleteModal(false);
    setListingToDelete(null);
  }, []);

  const handleConfirmDelete = React.useCallback(async function() {
    if (!listingToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await db.collection('listings').doc(listingToDelete.id).update({
        status: 'deleted',
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      listingsHook.setListings(function(prev) { 
        return prev.filter(function(l) { return l.id !== listingToDelete.id; }); 
      });
      carouselHook.setCarouselListings(function(prev) { 
        return prev.filter(function(l) { return l.id !== listingToDelete.id; }); 
      });
      
      showToastMessage('Listing deleted successfully');
      handleCloseDeleteModal();
    } catch(err) {
      showToastMessage('Failed to delete listing', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [listingToDelete, listingsHook, carouselHook, showToastMessage, handleCloseDeleteModal]);

  // ===== Handle listing click =====
  const handleListingClick = React.useCallback(function(listing) {
    window.AffinityHelpers?.saveAffinity(listing);
    
    let mapCenterState = mapCenter;
    let mapZoomState = mapZoom;
    let scrollPosition = feedContainerRef.current?.scrollTop || 0;
    
    if (mapInstance && viewMode === 'map') {
      const center = mapInstance.getCenter();
      mapCenterState = [center.lat, center.lng];
      mapZoomState = mapInstance.getZoom();
    }
    
    navigate('/listing/' + listing.id, { 
      from: 'home',
      returnTo: viewMode,
      mapCenter: mapCenterState,
      mapZoom: mapZoomState,
      scrollPosition: scrollPosition
    });
  }, [navigate, mapInstance, viewMode, mapCenter, mapZoom]);

  // ===== Handle location selection =====
  const handleLocationSelect = (location) => {
    if (location.lat && location.lng) {
      setMapCenter([location.lat, location.lng]);
      setMapZoom(12);
      showToastMessage(`📍 Showing properties in ${location.display}`, 'success');
    }
  };

  // ===== Determine if we should show recommendations =====
  const showRecommendations = React.useMemo(() => {
    const hasActiveFilters = filtersHook.activeFilterCount > 0;
    const hasSearchTerm = searchHook.searchTerm && searchHook.searchTerm.length >= 2;
    const hasNoResults = sortedListings.length === 0;
    
    return (hasActiveFilters || hasSearchTerm) && hasNoResults && recommendedListings.length > 0;
  }, [filtersHook.activeFilterCount, searchHook.searchTerm, sortedListings.length, recommendedListings.length]);

  // ===== RENDER =====
  return React.createElement(React.Fragment, null,
    
    // Toast notification (from hook)
    ToastComponent,

    // Main scrollable container
    React.createElement('div', {
      ref: feedContainerRef,
      className: `h-full overflow-y-auto bg-green-50 ${bodyTextSize} ${
        isDesktop 
          ? 'desktop-content-wrapper' 
          : ''
      }`,
      onScroll: function(e) {
        if (listingsHook.handleScroll) listingsHook.handleScroll(e);
      }
    },

      // ===== MOBILE STICKY SEARCH/FILTER BAR (hidden on desktop) =====
      !isDesktop && viewMode === 'grid' && React.createElement('div', { 
        className: `sticky top-0 z-30 bg-green-50/95 backdrop-blur-sm border-b border-gray-200 px-4 py-4 transition-transform duration-300 ${
          showSearchBar ? 'translate-y-0' : '-translate-y-full'
        }`
      },
        React.createElement('div', { className: 'flex items-center gap-2' },

          // Filter button
          React.createElement(window.FilterBar || FilterBar, {
            activeFilterCount: filtersHook.activeFilterCount,
            onOpenFilters: filtersHook.openFilterModal,
            touchTargetSize: 'min-h-[44px] min-w-[44px]'
          }),

          // Search bar with toggle props
          React.createElement(window.SearchBar || SearchBar, {
            searchTerm: searchHook.searchTerm,
            onSearchChange: searchHook.setSearchTerm,
            onSearchSubmit: handleSearchSubmit,
            onClearSearch: handleClearSearch,
            showDropdown: searchHook.showSearchDropdown,
            setShowDropdown: searchHook.setShowSearchDropdown,
            searchHistory: searchHook.searchHistory,
            suggestions: searchSuggestions,
            onSelectSuggestion: handleSelectSuggestion,
            onClearHistory: searchHook.clearSearchHistory,
            searchInputRef: searchHook.searchInputRef,
            searchDropdownRef: searchHook.searchDropdownRef,
            touchTargetSize: 'min-h-[44px] min-w-[44px]',
            showToast: showToastMessage,
            isSearchActive: isSearchActive
          }),

          // View toggle button
          React.createElement(ViewToggle, {
            viewMode: viewMode,
            onToggle: handleViewToggle
          }),

          // Notification bell
          user && window.NotificationBell ? 
            React.createElement(window.NotificationBell, { key: 'notif' }) : null,

          // Accessibility button
          React.createElement('button', {
            onClick: function() { setShowAccessibility(true); document.body.style.overflow = 'hidden'; },
            className: 'p-2 text-gray-600 hover:text-green-950 rounded-full hover:bg-gray-100 transition min-h-[44px] min-w-[44px]',
            'aria-label': 'Accessibility options'
          },
            React.createElement('img', { 
              src: '/vault/img/accessibility.png', 
              alt: '', 
              className: 'w-5 h-5', 
              'aria-hidden': 'true' 
            })
          )
        )
      ),

      // ===== FILTER MODAL =====
      filtersHook.showFilters && React.createElement(FilterModal, {
        show: filtersHook.showFilters,
        onClose: filtersHook.closeFilterModal,
        filters: filtersHook.filters,
        tempFilters: filtersHook.tempFilters,
        availableLgas: filtersHook.availableLgas,
        onUpdateFilter: filtersHook.updateFilter,
        onApply: filtersHook.applyFilters,
        onClear: filtersHook.clearAllFilters,
        activeFilterCount: filtersHook.activeFilterCount,
        hideLocationFilters: false,
        onLocationSelect: handleLocationSelect,
        mapInstance: mapInstance,
        isDesktop: isDesktop
      }),

      // Accessibility modal
      showAccessibility && React.createElement(AccessibilityModal, {
        onClose: function() { 
          setShowAccessibility(false); 
          document.body.style.overflow = 'unset'; 
        },
        settings,
        updateSetting: accessibility.updateSetting,
        resetSettings: accessibility.resetSettings
      }),

      // Conditional content: GRID VIEW or MAP VIEW
      viewMode === 'grid' 
        ? React.createElement(React.Fragment, null,
            // ===== DESKTOP CAROUSEL =====
            React.createElement('div', { className: isDesktop ? 'desktop-carousel' : 'px-4' },
              React.createElement(Carousel, {
                listings: carouselHook.carouselListings,
                currentIndex: carouselHook.currentCarouselIndex,
                loading: carouselHook.carouselLoading,
                onSlideChange: carouselHook.setCurrentCarouselIndex,
                onPrev: carouselHook.goToPrevSlide,
                onNext: carouselHook.goToNextSlide,
                touchHandlers: carouselHook.touchHandlers,
                user,
                favorites: favoritesHook.favorites,
                checkingFavorites: favoritesHook.checkingFavorites,
                onToggleFavorite: handleToggleFavorite,
                onStartChat: handleStartChat,
                onShare: handleShare,
                onEdit: handleEditListing,
                onDelete: handleOpenDeleteModal,
                onNavigate: navigate,
                cardSizes,
                headingSize
              })
            ),

            // ===== MAIN LISTINGS GRID =====
            React.createElement('div', { className: isDesktop ? '' : 'px-4 pb-20' },
              // Search result count
              (searchHook.searchTerm || filtersHook.activeFilterCount > 0) && 
                React.createElement('div', { className: isDesktop ? 'mb-4 text-sm text-gray-600 px-6' : 'mb-3 text-sm text-gray-600' },
                  sortedListings.length === 0 
                    ? 'No listings match your criteria'
                    : sortedListings.length + ' result' + (sortedListings.length === 1 ? '' : 's') + ' found'
                ),

              // Main results grid
              React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3 mb-8' },
                sortedListings.map(function(listing) {
                  const isOwner = user && user.uid === listing.userId;
                  const isFav = favoritesHook.favorites[listing.id] || false;
                  const isChecking = favoritesHook.checkingFavorites[listing.id] || false;

                  return React.createElement('div', {
                    key: listing.id,
                    'data-listing-card': '1',
                    className: isDesktop ? 'desktop-card' : 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition',
                    onClick: function() { handleListingClick(listing); }
                  },
                    // Image section
                    React.createElement('div', { className: isDesktop ? 'desktop-card-image' : 'relative ' + cardSizes.image + ' bg-gray-200' },
                      React.createElement('img', {
                        src: listing.images?.[0]
                          ? window.CloudinaryHelpers.getCardUrl(listing.images[0])
                          : '/vault/img/no-image.jpg',
                        alt: listing.title,
                        className: 'w-full h-full object-cover',
                        loading: 'lazy',
                        onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
                      }),
                      
                      // ===== OWNER CONTROLS =====
                      isOwner && React.createElement('div', { className: 'absolute top-1 right-1 flex gap-0.5 z-10' },
                        React.createElement('button', { 
                          onClick: function(e) { 
                            e.stopPropagation(); 
                            handleEditListing(listing.id); 
                          }, 
                          className: 'bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700 transition', 
                          title: 'Edit' 
                        },
                          React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })
                          )
                        ),
                        React.createElement('button', { 
                          onClick: function(e) { 
                            e.stopPropagation(); 
                            handleOpenDeleteModal(listing.id);
                          }, 
                          className: 'bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition', 
                          title: 'Delete' 
                        },
                          React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                          )
                        )
                      ),
                      
                      // Price tag
                      React.createElement('div', { className: 'absolute bottom-2 left-2 bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20' },
                        '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                      )
                    ),
                    
                    // Listing details
                    React.createElement('div', { className: isDesktop ? 'desktop-card-content' : 'p-2 ' + spacing },
                      React.createElement('h3', { className: isDesktop ? 'desktop-card-title' : 'font-bold text-gray-900 mb-0.5 line-clamp-1 ' + cardSizes.title }, listing.title),
                      React.createElement('p', { className: isDesktop ? 'desktop-card-location' : 'text-gray-600 mb-1 line-clamp-1 ' + cardSizes.address }, 
                        isDesktop 
                          ? [listing.lga, listing.state].filter(Boolean).join(', ')
                          : listing.address
                      ),
                      
                      // ===== UPDATED: Role badge - shows Landlord or Agent, no badge for regular users =====
                      React.createElement('div', { className: isDesktop ? 'flex items-center gap-2 mb-2' : 'flex flex-wrap gap-0.5 mb-1' },
                        listing.userType && listing.userType !== 'user' &&
                          React.createElement(RoleBadge, { 
                            user: { userType: listing.userType }, 
                            size: 'xs' 
                          })
                      ),
                      
                      // Action buttons
                      React.createElement('div', { className: isDesktop ? 'flex items-center justify-between mt-2' : 'flex items-center justify-between pt-1 border-t border-gray-100' },
                        React.createElement('div', { className: 'flex gap-1' },
                          user && !isOwner && React.createElement('button', {
                            onClick: function(e) { handleStartChat(listing.userId, listing.id, e); },
                            className: 'text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition text-xs',
                            title: 'Send message'
                          },
                            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                            )
                          ),
                          React.createElement('button', {
                            onClick: function(e) { handleShare(listing, e); },
                            className: 'text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition text-xs',
                            title: 'Share'
                          },
                            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                            )
                          )
                        ),
                        React.createElement('button', {
                          onClick: function(e) { handleToggleFavorite(listing.id, e); },
                          disabled: isChecking,
                          className: `p-1 rounded hover:bg-gray-100 transition text-xs ${
                            isFav ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-red-500'
                          } ${isChecking ? ' opacity-50 cursor-wait' : ''}`,
                          title: isFav ? 'Remove from favorites' : 'Save to favorites'
                        },
                          isFav
                            ? React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                                React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                              )
                            : React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                              )
                        )
                      )
                    )
                  );
                })
              ),

              // ===== OTHER LOCATIONS SECTION =====
              (searchHook.searchTerm && searchHook.searchTerm.length >= 2 && 
               (sortedListings.length === 0 || otherLocationsHook.otherLocationListings.length > 0)) &&
                React.createElement('div', { className: isDesktop ? 'mt-8 pt-6 border-t-2 border-green-200 px-6' : 'mt-8 pt-6 border-t-2 border-green-200' },
                  
                  React.createElement('div', { className: 'mb-4 flex items-center gap-2' },
                    React.createElement('div', { className: 'w-1 h-6 bg-green-950 rounded-full' }),
                    React.createElement('h2', { className: 'text-lg font-bold text-gray-900' },
                      sortedListings.length === 0 
                        ? ''
                        : '📍 More properties in other locations'
                    )
                  ),

                  sortedListings.length === 0 &&
                    React.createElement('div', { className: 'mb-6 p-4 bg-green-50 rounded-xl border border-green-200 text-center' },
                      React.createElement('p', { className: 'text-gray-700 mb-3' },
                        'No listings match "' + searchHook.searchTerm + '"'
                      ),
                      React.createElement('button', {
                        onClick: function() {
                          if (user) {
                            window.__openAuthModal('post', {});
                          } else {
                            window.__openAuthModal('signup', '/post');
                          }
                        },
                        className: 'bg-green-950 text-white px-6 py-2 rounded-lg hover:bg-green-800 transition font-medium inline-flex items-center gap-2'
                      },
                        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' })
                        ),
                        'Post a Listing'
                      )
                    ),

                  otherLocationsHook.otherLocationListings.length > 0 &&
                    React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3' },
                      otherLocationsHook.otherLocationListings.map(function(listing) {
                        const isOwner = user && user.uid === listing.userId;
                        const isFav = favoritesHook.favorites[listing.id] || false;
                        const isChecking = favoritesHook.checkingFavorites[listing.id] || false;

                        return React.createElement('div', {
                          key: listing.id,
                          'data-listing-card': '1',
                          className: isDesktop ? 'desktop-card' : 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition',
                          onClick: function() { handleListingClick(listing); }
                        },
                          React.createElement('div', { className: isDesktop ? 'desktop-card-image' : 'relative ' + cardSizes.image + ' bg-gray-200' },
                            React.createElement('img', {
                              src: listing.images?.[0] ? window.CloudinaryHelpers.getCardUrl(listing.images[0]) : '/vault/img/no-image.jpg',
                              alt: listing.title,
                              className: 'w-full h-full object-cover',
                              loading: 'lazy',
                              onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
                            }),
                            React.createElement('div', { className: 'absolute bottom-2 left-2 bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20' },
                              '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                            )
                          ),
                          React.createElement('div', { className: isDesktop ? 'desktop-card-content' : 'p-2 ' + spacing },
                            React.createElement('h3', { className: isDesktop ? 'desktop-card-title' : 'font-bold text-gray-900 mb-0.5 line-clamp-1 ' + cardSizes.title }, listing.title),
                            React.createElement('p', { className: isDesktop ? 'desktop-card-location' : 'text-gray-600 mb-1 line-clamp-1 ' + cardSizes.address }, 
                              isDesktop 
                                ? [listing.lga, listing.state].filter(Boolean).join(', ')
                                : listing.address
                            ),
                            
                            // ===== UPDATED: Role badge in other locations section =====
                            React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                              listing.userType && listing.userType !== 'user' &&
                                React.createElement(RoleBadge, { 
                                  user: { userType: listing.userType }, 
                                  size: 'xs' 
                                }),
                              React.createElement('span', { className: 'bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[10px]' },
                                listing.lga ? listing.lga : listing.state
                              )
                            ),
                            
                            React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100' },
                              React.createElement('div', { className: 'flex gap-1' },
                                user && !isOwner && React.createElement('button', {
                                  onClick: function(e) { handleStartChat(listing.userId, listing.id, e); },
                                  className: 'text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition text-xs',
                                  title: 'Send message'
                                },
                                  React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                                  )
                                ),
                                React.createElement('button', {
                                  onClick: function(e) { handleShare(listing, e); },
                                  className: 'text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition text-xs',
                                  title: 'Share'
                                },
                                  React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                                  )
                                )
                              ),
                              React.createElement('button', {
                                onClick: function(e) { handleToggleFavorite(listing.id, e); },
                                disabled: isChecking,
                                className: `p-1 rounded hover:bg-gray-100 transition text-xs ${
                                  isFav ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-red-500'
                                } ${isChecking ? ' opacity-50 cursor-wait' : ''}`,
                                title: isFav ? 'Remove from favorites' : 'Save to favorites'
                              },
                                isFav
                                  ? React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                                      React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                                    )
                                  : React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                                    )
                              )
                            )
                          )
                        );
                      })
                    ),

                  otherLocationsHook.loadingOtherLocations && 
                    React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3 mt-3' },
                      Array.from({ length: 4 }).map(function(_, i) {
                        return React.createElement('div', {
                          key: i,
                          className: 'bg-white rounded-lg shadow-md overflow-hidden animate-pulse'
                        },
                          React.createElement('div', { className: 'h-40 bg-gray-200' }),
                          React.createElement('div', { className: 'p-2 space-y-2' },
                            React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' }),
                            React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-full' })
                          )
                        );
                      })
                    ),

                  otherLocationsHook.hasMoreOtherLocations && !otherLocationsHook.loadingOtherLocations &&
                    React.createElement('button', {
                      onClick: otherLocationsHook.loadMoreOtherLocations,
                      className: 'mt-4 w-full text-center text-green-950 text-sm py-2 hover:underline'
                    }, 'Load more from other locations →')
                ),

              // ===== RECOMMENDATIONS SECTION =====
              showRecommendations &&
                React.createElement('div', { className: isDesktop ? 'mt-8 pt-6 border-t-2 border-blue-200 px-6' : 'mt-8 pt-6 border-t-2 border-blue-200' },
                  
                  React.createElement('div', { className: 'mb-4 flex items-center gap-2' },
                    React.createElement('div', { className: 'w-1 h-6 bg-blue-600 rounded-full' }),
                    React.createElement('h2', { className: 'text-lg font-bold text-gray-900' },
                      filtersHook.activeFilterCount > 0
                        ? '✨ No matches? Try these recommendations'
                        : '✨ Recommended for you'
                    )
                  ),

                  React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3' },
                    recommendedListings.map(function(listing) {
                      const isOwner = user && user.uid === listing.userId;
                      const isFav = favoritesHook.favorites[listing.id] || false;
                      const isChecking = favoritesHook.checkingFavorites[listing.id] || false;

                      return React.createElement('div', {
                        key: listing.id,
                        'data-listing-card': '1',
                        className: isDesktop ? 'desktop-card' : 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition',
                        onClick: function() { handleListingClick(listing); }
                      },
                        React.createElement('div', { className: isDesktop ? 'desktop-card-image' : 'relative ' + cardSizes.image + ' bg-gray-200' },
                          React.createElement('img', {
                            src: listing.images?.[0] ? window.CloudinaryHelpers.getCardUrl(listing.images[0]) : '/vault/img/no-image.jpg',
                            alt: listing.title,
                            className: 'w-full h-full object-cover',
                            loading: 'lazy',
                            onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
                          }),
                          React.createElement('div', { className: 'absolute bottom-2 left-2 bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20' },
                            '₦' + (listing.price ? listing.price.toLocaleString() : '0')
                          )
                        ),
                        React.createElement('div', { className: isDesktop ? 'desktop-card-content' : 'p-2 ' + spacing },
                          React.createElement('h3', { className: isDesktop ? 'desktop-card-title' : 'font-bold text-gray-900 mb-0.5 line-clamp-1 ' + cardSizes.title }, listing.title),
                          React.createElement('p', { className: isDesktop ? 'desktop-card-location' : 'text-gray-600 mb-1 line-clamp-1 ' + cardSizes.address }, 
                            isDesktop 
                              ? [listing.lga, listing.state].filter(Boolean).join(', ')
                              : listing.address
                          ),
                          
                          // ===== UPDATED: Role badge in recommendations section =====
                          React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                            listing.userType && listing.userType !== 'user' &&
                              React.createElement(RoleBadge, { 
                                user: { userType: listing.userType }, 
                                size: 'xs' 
                              }),
                            React.createElement('span', { className: 'bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[10px]' },
                              'Based on your interests'
                            )
                          ),
                          
                          React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100' },
                            React.createElement('div', { className: 'flex gap-1' },
                              user && !isOwner && React.createElement('button', {
                                onClick: function(e) { handleStartChat(listing.userId, listing.id, e); },
                                className: 'text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition text-xs',
                                title: 'Send message'
                              },
                                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                                )
                              ),
                              React.createElement('button', {
                                onClick: function(e) { handleShare(listing, e); },
                                className: 'text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition text-xs',
                                title: 'Share'
                              },
                                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                                )
                              )
                            ),
                            React.createElement('button', {
                              onClick: function(e) { handleToggleFavorite(listing.id, e); },
                              disabled: isChecking,
                              className: `p-1 rounded hover:bg-gray-100 transition text-xs ${
                                isFav ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-red-500'
                              } ${isChecking ? ' opacity-50 cursor-wait' : ''}`,
                              title: isFav ? 'Remove from favorites' : 'Save to favorites'
                            },
                              isFav
                                ? React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                                    React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                                  )
                                : React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                                  )
                            )
                          )
                        )
                      );
                    })
                  ),

                  recommendationsLoading && 
                    React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3 mt-3' },
                      Array.from({ length: 4 }).map(function(_, i) {
                        return React.createElement('div', {
                          key: i,
                          className: 'bg-white rounded-lg shadow-md overflow-hidden animate-pulse'
                        },
                          React.createElement('div', { className: 'h-40 bg-gray-200' }),
                          React.createElement('div', { className: 'p-2 space-y-2' },
                            React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' }),
                            React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-full' })
                          )
                        );
                      })
                    )
                ),

              // Loading more indicator
              listingsHook.loadingMore && 
                React.createElement('div', { className: isDesktop ? desktopGridCols : 'grid ' + layout.getGridCols(settings.fontSize, 'listings') + ' gap-3 mt-3' },
                  Array.from({ length: 4 }).map(function(_, i) {
                    return React.createElement('div', { 
                      key: i, 
                      className: 'bg-white rounded-lg shadow-md overflow-hidden animate-pulse' 
                    },
                      React.createElement('div', { className: 'h-40 bg-gray-200' }),
                      React.createElement('div', { className: 'p-2 space-y-2' },
                        React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' }),
                        React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-full' })
                      )
                    );
                  })
                ),

              // End of results
              !listingsHook.hasMore && listingsHook.listings.length > 0 && 
                React.createElement('div', { className: 'text-center py-4 text-gray-400 text-sm' }, 
                  "You've reached the end"
                ),
              
              // No results at all
              !listingsHook.loading && listingsHook.listings.length === 0 && 
              otherLocationsHook.otherLocationListings.length === 0 && 
              recommendedListings.length === 0 && 
                React.createElement('div', { className: isDesktop ? 'desktop-empty-state' : 'text-center py-12' },
                  React.createElement('div', { className: isDesktop ? 'desktop-empty-state-icon' : 'text-5xl mb-4' }, '🏠'),
                  React.createElement('p', { className: isDesktop ? 'desktop-empty-state-title' : 'text-gray-500' }, 
                    searchHook.searchTerm || filtersHook.activeFilterCount > 0
                      ? 'No listings match your criteria'
                      : 'No listings found'
                  ),
                  isDesktop && React.createElement('p', { className: 'desktop-empty-state-description' },
                    'Try adjusting your filters or search term, or post a new listing.'
                  ),
                  React.createElement('button', { 
                    onClick: function() { 
                      if (user) {
                        window.__openAuthModal('post', {});
                      } else {
                        window.__openAuthModal('signup', '/post');
                      }
                    }, 
                    className: isDesktop ? 'desktop-empty-state-btn' : 'mt-4 bg-green-950 text-white px-6 py-2 rounded-lg hover:bg-green-800 transition ' + bodyTextSize 
                  }, 'Post a Listing')
                )
            )
          )
        : // MAP VIEW
          React.createElement('div', { className: 'relative bg-transparent w-full h-full' },
            React.createElement(MapViewEmbed, {
              key: 'map-view-embed',
              listings: sortedListings,
              onListingSelect: (id) => {
                const listing = sortedListings.find(l => l.id === id);
                if (listing) handleListingClick(listing);
              },
              height: isDesktop ? 'calc(100vh - 80px)' : 'calc(100vh)',
              user,
              favorites: favoritesHook.favorites,
              onToggleFavorite: handleToggleFavorite,
              onStartChat: handleStartChat,
              onShare: handleShare,
              center: mapCenter,
              zoom: mapZoom,
              onMapReady: (map) => setMapInstance(map),
              onOpenFilterModal: filtersHook.openFilterModal
            }),

            // Recent views
            React.createElement('div', { className: 'absolute top-20 right-3 flex flex-col gap-2 z-10' },
              React.createElement(window.RecentViews || RecentViews, {
                onListingSelect: (id) => {
                  const listing = sortedListings.find(l => l.id === id);
                  if (listing) handleListingClick(listing);
                }
              })
            )
          ),

      // Scroll to top button
      React.createElement(window.ScrollToTopButton || ScrollToTopButton, { 
        containerRef: feedContainerRef,
        scrollable: true 
      })
    ),
    
    // ===== DELETE CONFIRMATION MODAL =====
    showDeleteModal && window.DeleteConfirmationModal && 
      React.createElement(window.DeleteConfirmationModal, {
        isOpen: showDeleteModal,
        onClose: handleCloseDeleteModal,
        onConfirm: handleConfirmDelete,
        listingTitle: listingToDelete?.title,
        isDeleting: isDeleting
      })
  );
}

window.HomePage = HomePage;