// pages/home/components/map/MapCore.js - FULL WORKING VERSION (No Hooks)



window.useMapCore = function(mapRef, mapInstanceRef, onMapReady) {
  
  
  // Track state manually (not using React hooks)
  let mapReady = false;
  let lastLoadBounds = null;
  
  // Check if Leaflet is loaded
  const checkLeaflet = function() {
    if (window.L) {
      
      mapReady = true;
      
      // If mapRef already has a current value, we could auto-init here
      // But we'll let the component call initMap explicitly
      return true;
    } else {
      console.error('❌ Leaflet not found');
      return false;
    }
  };
  
  // Run check immediately
  checkLeaflet();
  
  // If Leaflet not loaded, try again after delay
  if (!window.L) {
    setTimeout(() => {
      if (window.L) {
        
        mapReady = true;
      }
    }, 500);
  }
  
  // Initialize map
  const initMap = function(center = [9.0820, 8.6753], zoom = 6) {
    
    
    // Check prerequisites
    if (!window.L) {
      console.error('❌ Leaflet not available');
      return null;
    }
    
    if (!mapReady) {
      console.error('❌ Map not ready');
      return null;
    }
    
    if (!mapRef || !mapRef.current) {
      console.error('❌ Map ref not available');
      return null;
    }
    
    if (mapInstanceRef && mapInstanceRef.current) {
      
      return mapInstanceRef.current;
    }
    
    try {
      
      
      // Create map instance
      const map = window.L.map(mapRef.current, {
        fadeAnimation: false,
        zoomAnimation: false,
        zoomControl: false
      }).setView(center, zoom);
      
      // Add tile layer (OpenStreetMap)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap Contributors',
        maxZoom: 19
      }).addTo(map);
      
      // Add zoom control
      window.L.control.zoom({
        position: 'bottomright'
      }).addTo(map);
      
      // Store map instance
      if (mapInstanceRef) {
        mapInstanceRef.current = map;
      }
      
      
      
      // Call onMapReady callback if provided
      if (onMapReady && typeof onMapReady === 'function') {
        onMapReady(map);
      }
      
      return map;
    } catch (error) {
      console.error('❌ Map initialization error:', error);
      return null;
    }
  };
  
  // Set lastLoadBounds
  const setLastLoadBounds = function(bounds) {
    lastLoadBounds = bounds;
  };
  
  // Return the core functions and state
  return {
    mapReady: mapReady,
    initMap: initMap,
    lastLoadBounds: lastLoadBounds,
    setLastLoadBounds: setLastLoadBounds
  };
};

