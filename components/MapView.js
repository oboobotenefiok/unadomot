// components/MapView.js
function MapView({
  listings = [],
  onListingSelect,
  height = '400px',
  center = [9.0820, 8.6753], // Default center: Nigeria
  zoom = 6
}) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef(new Map()); // listingId -> marker
  const [mapStatus, setMapStatus] = React.useState('loading'); // 'loading'|'error'|'success'
  const [retryCount, setRetryCount] = React.useState(0);
  
  // Load Leaflet dynamically
  React.useEffect(() => {
    // Check if Leaflet is already loaded
    if (window.L) {
      setMapStatus('success');
      return;
    }
    
    console.log('Loading Leaflet...');
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Leaflet script loaded, loading CSS...');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      
      link.onload = () => {
        console.log('Leaflet CSS loaded');
        setMapStatus('success');
      };
      
      link.onerror = () => {
        console.error('Failed to load Leaflet CSS');
        setMapStatus('error');
      };
      
      document.head.appendChild(link);
    };
    
    script.onerror = () => {
      console.error('Failed to load Leaflet script');
      setMapStatus('error');
    };
    
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Remove script and link if they were added by this component
      // Note: This is tricky because we don't have references to the specific elements
      // In a real app, you might want to keep them loaded anyway
      console.log('MapView unmounting');
    };
  }, [retryCount]); // Retry if retryCount changes
  
  // Initialize map when Leaflet is ready
  React.useEffect(() => {
    if (mapStatus !== 'success' || !mapRef.current || mapInstanceRef.current) return;
    
    console.log('Initializing map...');
    
    // Create map instance
    mapInstanceRef.current = window.L.map(mapRef.current).setView(center, zoom);
    
    // Add tile layer (OpenStreetMap)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);
    
    // Add scale control
    window.L.control.scale().addTo(mapInstanceRef.current);
    
    console.log('Map initialized');
    
    // Cleanup map on unmount
    return () => {
      if (mapInstanceRef.current) {
        console.log('Removing map instance');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStatus, center, zoom]);
  
  // Sync markers with listings (efficient update)
  React.useEffect(() => {
    if (mapStatus !== 'success' || !mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    const newIds = new Set(listings.map(l => l.id));
    
    console.log(`Syncing markers: ${listings.length} listings, ${markers.size} existing markers`);
    
    // Remove markers for listings no longer present
    for (const [id, marker] of markers.entries()) {
      if (!newIds.has(id)) {
        console.log(`Removing marker for listing ${id}`);
        map.removeLayer(marker);
        markers.delete(id);
      }
    }
    
    // Add or update markers for current listings
    listings.forEach(listing => {
      // Skip if no coordinates
      if (!listing.lat || !listing.lng) {
        return;
      }
      
      const existing = markers.get(listing.id);
      
      if (existing) {
        // Update popup content (in case listing details changed)
        existing.setPopupContent(getPopupContent(listing));
        
        // Optionally update position if coordinates changed (rare)
        const currentPos = existing.getLatLng();
        if (currentPos.lat !== listing.lat || currentPos.lng !== listing.lng) {
          existing.setLatLng([listing.lat, listing.lng]);
        }
      } else {
        // Create new marker
        console.log(`Adding marker for listing ${listing.id} at [${listing.lat}, ${listing.lng}]`);
        
        const marker = window.L.marker([listing.lat, listing.lng], {
            title: listing.title,
            riseOnHover: true
          })
          .addTo(map)
          .bindPopup(getPopupContent(listing));
        
        // Store marker
        markers.set(listing.id, marker);
      }
    });
    
    // Fit map bounds to show all markers (optional)
    if (markers.size > 0) {
      const group = new window.L.featureGroup(Array.from(markers.values()));
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [listings, mapStatus]);
  
  // Helper to generate popup HTML
  const getPopupContent = (listing) => {
    const imageUrl = listing.images?.[0] ?
      window.CloudinaryHelpers?.getThumbnailUrl(listing.images[0]) :
      '/vault/img/no-image.jpg';
    
    const price = listing.price ? `₦${listing.price.toLocaleString()}/month` : 'Price not specified';
    const address = [listing.address, listing.lga, listing.state].filter(Boolean).join(', ');
    
    return `
      <div class="map-popup" style="min-width: 200px; max-width: 250px;">
        <img src="${imageUrl}" 
             style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
             onerror="this.src='/vault/img/no-image.jpg'" />
        <div style="padding: 4px 0;">
          <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${listing.title || 'Property'}</strong>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">${address}</p>
          <p style="font-size: 13px; font-weight: bold; color: #052e16; margin: 8px 0 4px;">${price}</p>
          <button onclick="window.selectListing('${listing.id}')" 
                  style="width: 100%; background: #052e16; color: white; border: none; 
                         padding: 6px 12px; border-radius: 6px; font-size: 12px; 
                         cursor: pointer; margin-top: 4px;">
            View Details
          </button>
        </div>
      </div>
    `;
  };
  
  // Global callback for popup buttons
  React.useEffect(() => {
    window.selectListing = (id) => {
      console.log('Popup button clicked for listing:', id);
      onListingSelect?.(id);
    };
    
    return () => {
      delete window.selectListing;
    };
  }, [onListingSelect]);
  
  // Handle retry
  const handleRetry = () => {
    setMapStatus('loading');
    setRetryCount(prev => prev + 1);
  };
  
  // Render loading state
  if (mapStatus === 'loading') {
    return React.createElement('div', {
        className: 'w-full flex items-center justify-center bg-gray-100 rounded-lg',
        style: { height }
      },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', {
          className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-green-950 mx-auto mb-2'
        }),
        React.createElement('p', { className: 'text-sm text-gray-600' }, 'Loading map...')
      )
    );
  }
  
  // Render error state
  if (mapStatus === 'error') {
    return React.createElement('div', {
        className: 'w-full flex items-center justify-center bg-gray-100 rounded-lg',
        style: { height }
      },
      React.createElement('div', { className: 'text-center p-4' },
        React.createElement('div', { className: 'text-4xl mb-2' }, '🗺️'),
        React.createElement('p', { className: 'text-gray-600 mb-3' }, 'Failed to load map.'),
        React.createElement('button', {
          onClick: handleRetry,
          className: 'bg-green-950 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition text-sm'
        }, 'Try Again')
      )
    );
  }
  
  // Render empty state
  if (listings.length === 0) {
    return React.createElement('div', {
        className: 'w-full flex items-center justify-center bg-gray-100 rounded-lg',
        style: { height }
      },
      React.createElement('div', { className: 'text-center p-4' },
        React.createElement('div', { className: 'text-4xl mb-2' }, '📍'),
        React.createElement('p', { className: 'text-gray-600' }, 'No listings with location data')
      )
    );
  }
  
  // Render map container
  return React.createElement('div', {
    ref: mapRef,
    style: { height, width: '100%' },
    className: 'rounded-lg shadow-lg'
  });
}

// Make it globally available
window.MapView = MapView;