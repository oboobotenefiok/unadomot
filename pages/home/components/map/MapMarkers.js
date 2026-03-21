// pages/home/components/map/MapMarkers.js

window.useMapMarkers = function(
  mapInstance,
  visibleListings,
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
) {
  const markersRef = React.useRef(new Map());
  
  React.useEffect(() => {
    if (!mapInstance || !window.L) return;
    
    const markers = markersRef.current;
    
    // Clear existing markers
    markers.forEach(marker => mapInstance.removeLayer(marker));
    markers.clear();
    
    // Create new markers for visible listings
    visibleListings.forEach(listing => {
      if (!listing.lat || !listing.lng) return;
      
      const marker = window.L.marker([listing.lat, listing.lng], {
        title: listing.title,
        riseOnHover: true,
        icon: window.L.divIcon({
          className: 'custom-listing-pin',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
          html: '<div class="custom-listing-pin"></div>'
        })
      });
      
      // Store the current nearby listings for this marker
      const nearbyListings = visibleListings.filter(l => {
        const distance = window.calculateDistance(
          listing.lat, listing.lng,
          l.lat, l.lng
        );
        return distance < 5;
      });
      
      const index = nearbyListings.findIndex(l => l.id === listing.id);
      
      // Create navigation callbacks
      const goToPrevListing = () => {
        const newIndex = index > 0 ? index - 1 : nearbyListings.length - 1;
        const newListing = nearbyListings[newIndex];
        
        const newMarker = markers.get(newListing.id);
        if (newMarker) {
          if (forceClosePopup) forceClosePopup();
          setTimeout(() => {
            newMarker.openPopup();
            activePopupRef.current = newMarker;
            setCurrentPopupIndex(newIndex);
            setCurrentPopupListing(newListing);
            setPopupListings(nearbyListings);
          }, 10);
        }
      };
      
      const goToNextListing = () => {
        const newIndex = index < nearbyListings.length - 1 ? index + 1 : 0;
        const newListing = nearbyListings[newIndex];
        
        const newMarker = markers.get(newListing.id);
        if (newMarker) {
          if (forceClosePopup) forceClosePopup();
          setTimeout(() => {
            newMarker.openPopup();
            activePopupRef.current = newMarker;
            setCurrentPopupIndex(newIndex);
            setCurrentPopupListing(newListing);
            setPopupListings(nearbyListings);
          }, 10);
        }
      };
      
      marker.bindPopup(() => {
        return window.createPopupContent(
          nearbyListings,
          index,
          user,
          favorites,
          onStartChat,
          onShare,
          onListingSelect,
          onToggleFavorite,
          onEdit,
          onDelete,
          // onClose callback
          () => {
            if (mapInstance) {
              mapInstance.closePopup();
              activePopupRef.current = null;
              setCurrentPopupListing(null);
            }
          },
          // onPrevListing callback
          goToPrevListing,
          // onNextListing callback
          goToNextListing
        );
      }, {
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        maxWidth: 280 // Allow full card width
      });
      
      marker.on('click', () => {
        if (forceClosePopup) forceClosePopup();
        
        setTimeout(() => {
          marker.openPopup();
          activePopupRef.current = marker;
          setCurrentPopupIndex(index);
          setCurrentPopupListing(listing);
          setPopupListings(nearbyListings);
        }, 10);
      });
      
      marker.on('popupopen', () => {
        activePopupRef.current = marker;
      });
      
      marker.on('popupclose', () => {
        activePopupRef.current = null;
        setCurrentPopupListing(null);
      });
      
      markers.set(listing.id, marker);
      marker.addTo(mapInstance);
    });
    
  }, [visibleListings, mapInstance, user, favorites]);
  
  return markersRef;
};