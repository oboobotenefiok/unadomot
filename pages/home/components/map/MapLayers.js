// pages/home/components/map/MapLayers.js - COMPLETE WITH REALTIME FAVORITES

window.useMapLayers = function(mapInstance, allListings, user, favorites, onListingSelect, onToggleFavorite, onStartChat, onShare, onEdit, onDelete, activePopupRef, forceClosePopup) {
  
  
  const continentLayerRef = React.useRef(null);
  const countryLayerRef = React.useRef(null);
  const stateLayerRef = React.useRef(null);
  const lgaLayerRef = React.useRef(null);
  
  const [continentCount, setContinentCount] = React.useState(0);
  const [countryCount, setCountryCount] = React.useState(0);
  const [stateCounts, setStateCounts] = React.useState({});
  const [lgaCounts, setLgaCounts] = React.useState({});
  const [currentZoom, setCurrentZoom] = React.useState(6);
  const [selectedRegion, setSelectedRegion] = React.useState(null);
  const [regionListings, setRegionListings] = React.useState([]);
  const [showRegionPanel, setShowRegionPanel] = React.useState(false);
  const [currentRegionIndex, setCurrentRegionIndex] = React.useState(0);

  // Compute counts per admin region
  React.useEffect(() => {
    if (!allListings.length || !window.nigeriaStates) {
      return;
    }

    setContinentCount(allListings.length);
    setCountryCount(allListings.length);

    const stateCountsMap = {};
    const lgaCountsMap = {};

    window.nigeriaStates.forEach(state => {
      stateCountsMap[state.name] = 0;
      
      state.lgas.forEach(lga => {
        const key = `${state.name}|${lga.name}`;
        lgaCountsMap[key] = 0;
      });
    });

    allListings.forEach(listing => {
      if (listing.state && stateCountsMap.hasOwnProperty(listing.state)) {
        stateCountsMap[listing.state]++;
        
        if (listing.lga) {
          const lgaKey = `${listing.state}|${listing.lga}`;
          if (lgaCountsMap.hasOwnProperty(lgaKey)) {
            lgaCountsMap[lgaKey]++;
          }
        }
      }
    });

    setStateCounts(stateCountsMap);
    setLgaCounts(lgaCountsMap);
  }, [allListings]);

  // Get listings for a region
  const getListingsForRegion = (regionType, regionName, stateName = null) => {
    if (regionType === 'continent') {
      return allListings;
    } else if (regionType === 'country') {
      return allListings;
    } else if (regionType === 'state') {
      return allListings.filter(l => l.state === regionName);
    } else if (regionType === 'lga') {
      return allListings.filter(l => l.lga === regionName && l.state === stateName);
    }
    return [];
  };

  // Create region popup content with navigation - MATCHES MOBILE CARD
  const createRegionPopup = (regionType, regionName, stateName, count, regionListings, marker, currentIdx = 0) => {
    
    // Get current favorites from global state
    const currentFavorites = window.FavoritesHelpers?.getCurrentFavorites() || {};
    
    // Navigation callbacks
    const goToPrevListing = () => {
      const newIndex = currentIdx > 0 ? currentIdx - 1 : regionListings.length - 1;
      setCurrentRegionIndex(newIndex);
      
      if (activePopupRef.current) {
        const newContent = window.createPopupContent(
          regionListings,
          newIndex,
          user,
          currentFavorites,
          onStartChat,
          onShare,
          onListingSelect,
          onToggleFavorite,
          onEdit,
          onDelete,
          () => {
            if (mapInstance) {
              mapInstance.closePopup();
              activePopupRef.current = null;
            }
          },
          () => {
            const prevIdx = newIndex > 0 ? newIndex - 1 : regionListings.length - 1;
            setCurrentRegionIndex(prevIdx);
            if (activePopupRef.current) {
              activePopupRef.current.setPopupContent(
                createRegionPopup(regionType, regionName, stateName, count, regionListings, marker, prevIdx)
              );
            }
          },
          () => {
            const nextIdx = newIndex < regionListings.length - 1 ? newIndex + 1 : 0;
            setCurrentRegionIndex(nextIdx);
            if (activePopupRef.current) {
              activePopupRef.current.setPopupContent(
                createRegionPopup(regionType, regionName, stateName, count, regionListings, marker, nextIdx)
              );
            }
          }
        );
        activePopupRef.current.setPopupContent(newContent);
      }
    };
    
    const goToNextListing = () => {
      const newIndex = currentIdx < regionListings.length - 1 ? currentIdx + 1 : 0;
      setCurrentRegionIndex(newIndex);
      
      if (activePopupRef.current) {
        const newContent = window.createPopupContent(
          regionListings,
          newIndex,
          user,
          currentFavorites,
          onStartChat,
          onShare,
          onListingSelect,
          onToggleFavorite,
          onEdit,
          onDelete,
          () => {
            if (mapInstance) {
              mapInstance.closePopup();
              activePopupRef.current = null;
            }
          },
          () => {
            const prevIdx = newIndex > 0 ? newIndex - 1 : regionListings.length - 1;
            setCurrentRegionIndex(prevIdx);
            if (activePopupRef.current) {
              activePopupRef.current.setPopupContent(
                createRegionPopup(regionType, regionName, stateName, count, regionListings, marker, prevIdx)
              );
            }
          },
          () => {
            const nextIdx = newIndex < regionListings.length - 1 ? newIndex + 1 : 0;
            setCurrentRegionIndex(nextIdx);
            if (activePopupRef.current) {
              activePopupRef.current.setPopupContent(
                createRegionPopup(regionType, regionName, stateName, count, regionListings, marker, nextIdx)
              );
            }
          }
        );
        activePopupRef.current.setPopupContent(newContent);
      }
    };
    
    return window.createPopupContent(
      regionListings,
      currentIdx,
      user,
      currentFavorites,
      onStartChat,
      onShare,
      onListingSelect,
      onToggleFavorite,
      onEdit,
      onDelete,
      () => {
        if (mapInstance) {
          mapInstance.closePopup();
          activePopupRef.current = null;
        }
      },
      goToPrevListing,
      goToNextListing
    );
  };
  
  // Force close any open popup
  const forceClosePopupLocal = () => {
    if (mapInstance) {
      mapInstance.closePopup();
      mapInstance.eachLayer((layer) => {
        if (layer._popup) {
          mapInstance.closePopup(layer._popup);
        }
      });
      activePopupRef.current = null;
    }
  };

  // Create admin markers
  const createAdminMarkers = function() {
    if (!mapInstance || !window.L || !window.nigeriaStates) {
      return;
    }

    if (continentLayerRef.current) mapInstance.removeLayer(continentLayerRef.current);
    if (countryLayerRef.current) mapInstance.removeLayer(countryLayerRef.current);
    if (stateLayerRef.current) mapInstance.removeLayer(stateLayerRef.current);
    if (lgaLayerRef.current) mapInstance.removeLayer(lgaLayerRef.current);

    continentLayerRef.current = window.L.layerGroup();
    countryLayerRef.current = window.L.layerGroup();
    stateLayerRef.current = window.L.layerGroup();
    lgaLayerRef.current = window.L.layerGroup();

    // CONTINENT LEVEL
    if (continentCount > 0) {
      const continentMarker = window.L.marker([9.0820, 8.6753], {
        icon: window.L.divIcon({
          html: `<div class="admin-cluster continent-cluster" style="background-color: #0a3622; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">${window.formatClusterCount(continentCount)}</div>`,
          className: 'admin-cluster',
          iconSize: [40, 40]
        }),
        title: 'Africa',
        riseOnHover: true
      });
      
      const continentListings = getListingsForRegion('continent', 'Africa');
      
      continentMarker.bindPopup(() => {
        return createRegionPopup('continent', 'Africa', null, continentCount, continentListings, continentMarker, 0);
      }, {
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        maxWidth: 280
      });

      continentMarker.on('click', () => {
        if (forceClosePopup) forceClosePopup();
        
        setTimeout(() => {
          continentMarker.openPopup();
          activePopupRef.current = continentMarker;
          setSelectedRegion({ type: 'continent', name: 'Africa', listings: continentListings });
          setCurrentRegionIndex(0);
        }, 10);
      });
      
      continentLayerRef.current.addLayer(continentMarker);
    }

    // COUNTRY LEVEL
    if (countryCount > 0) {
      const countryMarker = window.L.marker([9.0820, 8.6753], {
        icon: window.L.divIcon({
          html: `<div class="admin-cluster country-cluster" style="background-color: #052e16; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3);">${window.formatClusterCount(countryCount)}</div>`,
          className: 'admin-cluster',
          iconSize: [35, 35]
        }),
        title: 'Nigeria',
        riseOnHover: true
      });
      
      const countryListings = getListingsForRegion('country', 'Nigeria');
      
      countryMarker.bindPopup(() => {
        return createRegionPopup('country', 'Nigeria', null, countryCount, countryListings, countryMarker, 0);
      }, {
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        maxWidth: 280
      });

      countryMarker.on('click', () => {
        if (forceClosePopup) forceClosePopup();
        
        setTimeout(() => {
          countryMarker.openPopup();
          activePopupRef.current = countryMarker;
          setSelectedRegion({ type: 'country', name: 'Nigeria', listings: countryListings });
          setCurrentRegionIndex(0);
        }, 10);
      });
      
      countryLayerRef.current.addLayer(countryMarker);
    }

    // STATE LEVEL
    window.nigeriaStates.forEach(state => {
      const count = stateCounts[state.name] || 0;
      if (count === 0) return;

      const stateMarker = window.L.marker([state.lat, state.lng], {
        icon: window.L.divIcon({
          html: `<div class="admin-cluster state-cluster" style="background-color: #166534; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${window.formatClusterCount(count)}</div>`,
          className: 'admin-cluster',
          iconSize: [32, 32]
        }),
        title: `${state.name} State`,
        riseOnHover: true
      });

      const stateListings = getListingsForRegion('state', state.name);

      stateMarker.bindPopup(() => {
        return createRegionPopup('state', state.name, null, count, stateListings, stateMarker, 0);
      }, {
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        maxWidth: 280
      });

      stateMarker.on('click', () => {
        if (forceClosePopup) forceClosePopup();
        
        setTimeout(() => {
          stateMarker.openPopup();
          activePopupRef.current = stateMarker;
          setSelectedRegion({ type: 'state', name: state.name, listings: stateListings });
          setCurrentRegionIndex(0);
        }, 10);
      });

      stateLayerRef.current.addLayer(stateMarker);
    });

    // LGA LEVEL
    window.nigeriaStates.forEach(state => {
      state.lgas.forEach(lga => {
        const key = `${state.name}|${lga.name}`;
        const count = lgaCounts[key] || 0;
        if (count === 0) return;

        const lgaMarker = window.L.marker([lga.lat, lga.lng], {
          icon: window.L.divIcon({
            html: `<div class="admin-cluster lga-cluster" style="background-color: #22c55e; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${window.formatClusterCount(count)}</div>`,
            className: 'admin-cluster',
            iconSize: [28, 28]
          }),
          title: `${lga.name}, ${state.name}`,
          riseOnHover: true
        });

        const lgaListings = getListingsForRegion('lga', lga.name, state.name);

        lgaMarker.bindPopup(() => {
          return createRegionPopup('lga', lga.name, state.name, count, lgaListings, lgaMarker, 0);
        }, {
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          maxWidth: 280
        });

        lgaMarker.on('click', () => {
          if (forceClosePopup) forceClosePopup();
          
          setTimeout(() => {
            lgaMarker.openPopup();
            activePopupRef.current = lgaMarker;
            setSelectedRegion({ type: 'lga', name: lga.name, state: state.name, listings: lgaListings });
            setCurrentRegionIndex(0);
          }, 10);
        });

        lgaLayerRef.current.addLayer(lgaMarker);
      });
    });
  };

  // Update layers based on zoom
  const updateLayersForZoom = function(zoom) {
    if (!mapInstance) return;

    setCurrentZoom(zoom);

    // Close any open popup when zoom changes
    if (forceClosePopup) forceClosePopup();

    if (continentLayerRef.current) mapInstance.removeLayer(continentLayerRef.current);
    if (countryLayerRef.current) mapInstance.removeLayer(countryLayerRef.current);
    if (stateLayerRef.current) mapInstance.removeLayer(stateLayerRef.current);
    if (lgaLayerRef.current) mapInstance.removeLayer(lgaLayerRef.current);

    if (zoom <= 3) {
      if (continentLayerRef.current) mapInstance.addLayer(continentLayerRef.current);
    } else if (zoom <= 5) {
      if (countryLayerRef.current) mapInstance.addLayer(countryLayerRef.current);
    } else if (zoom <= 8) {
      if (stateLayerRef.current) mapInstance.addLayer(stateLayerRef.current);
    } else if (zoom <= 11) {
      if (lgaLayerRef.current) mapInstance.addLayer(lgaLayerRef.current);
    }
  };

  return {
    continentLayerRef,
    countryLayerRef,
    stateLayerRef,
    lgaLayerRef,
    continentCount,
    countryCount,
    stateCounts,
    lgaCounts,
    currentZoom,
    createAdminMarkers,
    updateLayersForZoom,
    regionListings,
    showRegionPanel,
    setShowRegionPanel,
    selectedRegion,
    setSelectedRegion,
    currentRegionIndex,
    setCurrentRegionIndex
  };
};