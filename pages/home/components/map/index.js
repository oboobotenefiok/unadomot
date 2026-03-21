// pages/home/components/map/index.js - WITH UNIFIED NOTIFICATION BELL

function MapViewEmbed({
  listings,
  onListingSelect,
  height = 'calc(100vh - 250px)',
  user,
  favorites,
  onToggleFavorite,
  onStartChat,
  onShare,
  onEdit,
  onDelete,
  onOpenFilterModal,
  onMapReady,
  center: initialCenter,
  zoom: initialZoom = 6
}) {
  
  
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const activePopupRef = React.useRef(null);
  
  const [allListings, setAllListings] = React.useState([]);
  const [visibleListings, setVisibleListings] = React.useState([]);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [currentPopupIndex, setCurrentPopupIndex] = React.useState(0);
  const [popupListings, setPopupListings] = React.useState([]);
  const [currentPopupListing, setCurrentPopupListing] = React.useState(null);
  const [showAccessibility, setShowAccessibility] = React.useState(false);
  
  // ===== TRACK MAP CENTER AND ZOOM FOR PARENT =====
  const [currentCenter, setCurrentCenter] = React.useState(initialCenter || [9.0820, 8.6753]);
  const [currentZoom, setCurrentZoom] = React.useState(initialZoom);
  
  // ===== FORCE CLOSE POPUP HELPER =====
  const forceClosePopup = React.useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.closePopup();
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer._popup) {
          mapInstanceRef.current.closePopup(layer._popup);
        }
      });
      activePopupRef.current = null;
      setCurrentPopupListing(null);
    }
  }, []);
  
  // ===== HANDLE GRID VIEW SWITCH =====
  const handleGridSwitch = () => {
    const event = new CustomEvent('view-mode-changed', { 
      detail: { mode: 'grid' } 
    });
    window.dispatchEvent(event);
    localStorage.setItem('home_view_mode', 'grid');
  };
  
  // Initialize map core
  const core = window.useMapCore(mapRef, mapInstanceRef);
  
  // Initialize all listings
  React.useEffect(() => {
    const withCoords = listings.filter(l => l.lat && l.lng);
    setAllListings(withCoords);
    setVisibleListings(withCoords.slice(0, 50));
  }, [listings]);
  
  // Initialize map when ready
  React.useEffect(() => {
    if (!core.mapReady || !mapRef.current || mapInstanceRef.current) return;
    
    const center = initialCenter || [9.0820, 8.6753];
    const zoom = initialZoom || 6;
    
    const map = core.initMap(center, zoom);
    if (!map) return;
    
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    
    if (onMapReady) {
      onMapReady(map);
    }
    
    map.on('moveend', () => {
      const newCenter = map.getCenter();
      const newZoom = map.getZoom();
      setCurrentCenter([newCenter.lat, newCenter.lng]);
      setCurrentZoom(newZoom);
      
      if (onMapReady) {
        onMapReady(map, { center: [newCenter.lat, newCenter.lng], zoom: newZoom });
      }
    });
    
    const handleMapClick = () => {
      forceClosePopup();
    };
    
    map.on('click', handleMapClick);
    map.__clickHandler = handleMapClick;
    
  }, [core.mapReady, forceClosePopup, onMapReady, initialCenter, initialZoom]);
  
  // Admin layers
  const layers = window.useMapLayers(
    mapInstanceRef.current,
    allListings,
    user,
    favorites,
    onListingSelect,
    onToggleFavorite,
    onStartChat,
    onShare,
    onEdit,
    onDelete,
    activePopupRef,
    forceClosePopup
  );
  
  // Create admin layers when map is ready
  React.useEffect(() => {
    if (!mapInstanceRef.current || !core.mapReady) return;
    
    layers.createAdminMarkers();
    layers.updateLayersForZoom(mapInstanceRef.current.getZoom());
    
    const onZoomEnd = () => {
      const newZoom = mapInstanceRef.current.getZoom();
      layers.updateLayersForZoom(newZoom);
    };
    
    mapInstanceRef.current.on('zoomend', onZoomEnd);
    
    return () => {
      mapInstanceRef.current?.off('zoomend', onZoomEnd);
    };
  }, [core.mapReady, layers.continentCount, layers.countryCount, layers.stateCounts, layers.lgaCounts]);
  
  // Individual markers
  window.useMapMarkers(
    mapInstanceRef.current,
    [],
    user,
    favorites,
    onStartChat,
    onShare,
    onListingSelect,
    onToggleFavorite,
    onEdit,
    onDelete,
    setCurrentPopupIndex,
    setCurrentPopupListing,
    setPopupListings,
    activePopupRef,
    forceClosePopup
  );
  
  // Geolocation
  const geolocation = window.useGeolocation(mapInstanceRef.current, (location) => {
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      loadListingsInBounds(bounds);
    }
  });
  
  // Toast helper
  const showToast = (message, type = 'info') => {
    const toastEvent = new CustomEvent('show-toast', {
      detail: { message, type }
    });
    window.dispatchEvent(toastEvent);
  };
  
  // Load listings in current bounds
  const loadListingsInBounds = (bounds) => {
    if (!allListings.length) return;
    
    setLoadingMore(true);
    
    const inBounds = allListings.filter(listing => {
      return bounds.contains([listing.lat, listing.lng]);
    });
    
    const expandedBounds = bounds.pad(0.5);
    
    const nearBounds = allListings.filter(listing => {
      return expandedBounds.contains([listing.lat, listing.lng]) &&
        !inBounds.includes(listing);
    });
    
    const newVisible = [...new Set([...visibleListings, ...inBounds, ...nearBounds])];
    
    setVisibleListings(newVisible);
    setLoadingMore(false);
  };
  
  // Map move handler
  const handleMapMove = () => {
    if (!mapInstanceRef.current) return;
    
    const bounds = mapInstanceRef.current.getBounds();
    const zoom = mapInstanceRef.current.getZoom();
    
    if (zoom < 7) return;
    
    if (core.lastLoadBounds) {
      const center = bounds.getCenter();
      const lastCenter = core.lastLoadBounds.getCenter();
      const distance = window.calculateDistance(
        center.lat, center.lng,
        lastCenter.lat, lastCenter.lng
      );
      
      if (distance < 10) return;
    }
    
    loadListingsInBounds(bounds);
    core.setLastLoadBounds(bounds);
  };
  
  // Set up moveend listener
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    mapInstanceRef.current.on('moveend', handleMapMove);
    
    return () => {
      mapInstanceRef.current?.off('moveend', handleMapMove);
    };
  }, [mapInstanceRef.current, allListings, visibleListings]);
  
  if (!core.mapReady) {
    return React.createElement('div', {
        className: 'w-full flex items-center justify-center bg-gray-100 rounded-lg',
        style: { height }
      },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-3 border-green-950 border-t-transparent mx-auto mb-2' }),
        React.createElement('p', { className: 'text-xs text-gray-600' }, 'Loading map...')
      )
    );
  }
  
  // Render map with controls
  return React.createElement('div', {
      className: 'relative w-full',
      style: { height }
    },
    
    // Floating Top Bar
    React.createElement('div', {
      className: 'absolute top-2 left-0 right-0 flex items-center justify-between px-3 z-30'
    },
      // Left side - Accessibility + Notification
      React.createElement('div', { className: 'flex gap-2' },
        // Accessibility button
        React.createElement('button', {
          onClick: () => setShowAccessibility(true),
          className: 'bg-white/90 backdrop-blur-sm hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md transition hover:scale-110',
          title: 'Accessibility options'
        },
          React.createElement('img', {
            src: '/vault/img/accessibility.png',
            alt: 'Accessibility',
            className: 'w-5 h-5'
          })
        ),
        
        // Notification bell - USING THE SAME COMPONENT AS GRID VIEW
        user && React.createElement('div', { className: 'relative' },
          React.createElement(window.NotificationBell, {})
        )
      ),
      
      // Right side - Grid toggle
      React.createElement('button', {
        onClick: handleGridSwitch,
        className: 'bg-white/90 backdrop-blur-sm hover:bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-md transition hover:scale-105 font-medium text-sm',
        title: 'Switch to grid view'
      },
        React.createElement('svg', {
          className: 'w-4 h-4',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2',
            d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
          })
        ),
        React.createElement('span', null)
      )
    ),
    
    // Accessibility Modal
    showAccessibility && window.AccessibilityModal && 
      React.createElement(window.AccessibilityModal, {
        onClose: () => {
          setShowAccessibility(false);
          document.body.style.overflow = 'unset';
        },
        settings: window.useAccessibility?.().settings || { 
          fontSize: 'normal', 
          highContrast: false, 
          reduceMotion: false, 
          dyslexicFont: false, 
          showLinks: false 
        },
        updateSetting: window.useAccessibility?.().updateSetting || function() {},
        resetSettings: window.useAccessibility?.().resetSettings || function() {}
      }),
    
    // Map container
    React.createElement('div', {
      ref: mapRef,
      className: 'absolute inset-0 rounded-lg shadow-lg',
      style: {
        height: '100%',
        width: '100%',
        zIndex: 1,
        backgroundColor: document.body.classList.contains('dark-mode') ? '#1a2634' : '#f0f0f0'
      }
    }),
    
    // UI Controls
    ...window.MapControls({
      totalProperties: allListings.length,
      loadingMore: loadingMore,
      locationStatus: geolocation.locationStatus,
      locationError: geolocation.locationError,
      onGetUserLocation: () => geolocation.getUserLocation(showToast),
      showToast: showToast,
      currentZoom: currentZoom,
      onOpenFilterModal: onOpenFilterModal
    })
  );
}

window.MapViewEmbed = MapViewEmbed;