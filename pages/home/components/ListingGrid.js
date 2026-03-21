// pages/home/components/ListingGrid.js - ENHANCED VERSION

function ListingGrid({ 
  listings,
  filteredCount,
  searchTerm,
  loading,
  loadingMore,
  hasMore,
  user,
  favorites,
  checkingFavorites,
  onToggleFavorite,
  onStartChat,
  onShare,
  onEdit,
  onDelete,
  onListingClick,
  gridCols,
  cardSizes,
  spacing,
  bodyTextSize,
  
  // NEW PROPS for location-based recommendations
  allListings = [], // All available listings (not just filtered)
  currentFilters = {}, // Current filters applied
  onLocationFilter // Function to filter by location
}) {
  
  // ===== STATE FOR EXPANDED LOCATIONS =====
  const [expandedLocations, setExpandedLocations] = React.useState({});
  const [locationListings, setLocationListings] = React.useState({});
  
  // ===== ANALYZE SEARCH CONTEXT =====
  const searchContext = React.useMemo(function() {
    if (!searchTerm || listings.length > 0) return null;
    
    const context = {
      originalSearch: searchTerm,
      suggestedState: null,
      suggestedLGA: null,
      otherStates: [],
      nearbyLGAs: []
    };
    
    // Try to extract location from search term
    const lowerSearch = searchTerm.toLowerCase();
    
    // Check if search matches any state or LGA
    if (window.nigeriaStates) {
      // Find matching state
      const matchingState = window.nigeriaStates.find(s => 
        s.name.toLowerCase().includes(lowerSearch)
      );
      
      if (matchingState) {
        context.suggestedState = matchingState.name;
        
        // Get listings from this state (all LGAs)
        const stateListings = allListings.filter(l => 
          l.state === matchingState.name && 
          l.status === 'available'
        );
        
        if (stateListings.length > 0) {
          context.stateListings = stateListings;
        }
      }
      
      // Find matching LGA across states
      const matchingLGAs = [];
      window.nigeriaStates.forEach(state => {
        state.lgas.forEach(lga => {
          if (lga.name.toLowerCase().includes(lowerSearch)) {
            matchingLGAs.push({
              state: state.name,
              lga: lga.name,
              lat: lga.lat,
              lng: lga.lng
            });
          }
        });
      });
      
      if (matchingLGAs.length > 0) {
        context.matchingLGAs = matchingLGAs;
        
        // Get listings from these LGAs
        const lgaListings = {};
        matchingLGAs.forEach(match => {
          const listingsInLGA = allListings.filter(l => 
            l.state === match.state && 
            l.lga === match.lga &&
            l.status === 'available'
          );
          if (listingsInLGA.length > 0) {
            lgaListings[`${match.state}|${match.lga}`] = listingsInLGA;
          }
        });
        context.lgaListings = lgaListings;
      }
      
      // Get other states with available listings (excluding the matched one)
      const statesWithListings = new Set();
      allListings.forEach(l => {
        if (l.state && l.status === 'available') {
          statesWithListings.add(l.state);
        }
      });
      
      context.otherStates = Array.from(statesWithListings)
        .filter(state => state !== context.suggestedState)
        .slice(0, 5); // Limit to 5 other states
    }
    
    return context;
  }, [searchTerm, allListings, listings.length]);
  
  // ===== TOGGLE LOCATION EXPANSION =====
  const toggleLocation = function(locationKey) {
    setExpandedLocations(prev => ({
      ...prev,
      [locationKey]: !prev[locationKey]
    }));
  };
  
  // ===== LOAD LISTINGS FOR A LOCATION =====
  const loadLocationListings = React.useCallback(function(locationType, state, lga = null) {
    const key = lga ? `${state}|${lga}` : state;
    
    // Check if already loaded
    if (locationListings[key]) return;
    
    let filtered = allListings.filter(l => l.status === 'available');
    
    if (lga) {
      filtered = filtered.filter(l => l.state === state && l.lga === lga);
    } else {
      filtered = filtered.filter(l => l.state === state);
    }
    
    // Apply existing filters (except location filters)
    if (currentFilters) {
      if (currentFilters.minPrice) {
        filtered = filtered.filter(l => l.price >= Number(currentFilters.minPrice));
      }
      if (currentFilters.maxPrice) {
        filtered = filtered.filter(l => l.price <= Number(currentFilters.maxPrice));
      }
      if (currentFilters.bedrooms) {
        filtered = filtered.filter(l => 
          currentFilters.bedrooms === '5+' 
            ? Number(l.bedrooms) >= 5 
            : l.bedrooms === currentFilters.bedrooms
        );
      }
      if (currentFilters.propertyType) {
        filtered = filtered.filter(l => l.propertyType === currentFilters.propertyType);
      }
      if (currentFilters.furnishing) {
        filtered = filtered.filter(l => l.furnishing === currentFilters.furnishing);
      }
    }
    
    setLocationListings(prev => ({
      ...prev,
      [key]: filtered.slice(0, 8) // Limit to 8 listings per location
    }));
  }, [allListings, currentFilters, locationListings]);
  
  // ===== HANDLE "SHOW IN THIS LOCATION" CLICK =====
  const handleShowInLocation = function(state, lga = null) {
    if (onLocationFilter) {
      onLocationFilter({
        state: state,
        lga: lga || ''
      });
    }
  };
  
  // ===== RENDER LOCATION SECTION =====
  const renderLocationSection = function(title, locationKey, listings, state, lga = null) {
    if (!listings || listings.length === 0) return null;
    
    const isExpanded = expandedLocations[locationKey];
    const displayListings = isExpanded ? listings : listings.slice(0, 4);
    
    return React.createElement('div', { 
      key: locationKey,
      className: 'mt-8 pt-6 border-t border-gray-200' 
    },
      React.createElement('div', { className: 'flex items-center justify-between mb-4' },
        React.createElement('h3', { className: 'font-bold text-gray-800' }, title),
        React.createElement('button', {
          onClick: function() { handleShowInLocation(state, lga); },
          className: 'text-xs text-green-950 hover:underline flex items-center gap-1'
        },
          React.createElement('span', null, 'Show all in this location'),
          React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 5l7 7-7 7' })
          )
        )
      ),
      
      React.createElement('div', { className: 'grid ' + gridCols + ' gap-3 mb-2' },
        displayListings.map(function(listing) {
          const isOwner = user && user.uid === listing.userId;
          const isFav = favorites[listing.id] || false;
          const isChecking = checkingFavorites[listing.id] || false;

          return React.createElement('div', {
            key: listing.id,
            'data-listing-card': '1',
            className: 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition',
            onClick: function() { onListingClick(listing); }
          },
            React.createElement('div', { className: 'relative ' + cardSizes.image + ' bg-gray-200' },
              React.createElement('img', {
                src: listing.images?.[0]
                  ? window.CloudinaryHelpers.getCardUrl(listing.images[0])
                  : '/vault/img/no-image.jpg',
                alt: listing.title,
                className: 'w-full h-full object-cover',
                loading: 'lazy',
                onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
              }),
              React.createElement('div', { className: 'absolute bottom-1 left-1 bg-green-950 text-white px-1.5 py-0.5 rounded font-bold ' + cardSizes.price },
                '₦' + (listing.price ? listing.price.toLocaleString() : '0')
              ),
              
              // Location badge
              React.createElement('div', { className: 'absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-full backdrop-blur-sm' },
                listing.lga || listing.state
              )
            ),
            
            React.createElement('div', { className: 'p-2 ' + spacing },
              React.createElement('h3', { className: 'font-bold text-gray-900 mb-0.5 line-clamp-1 ' + cardSizes.title }, 
                listing.title
              ),
              React.createElement('p', { className: 'text-gray-600 mb-1 line-clamp-1 text-[10px]' }, 
                [listing.address, listing.lga, listing.state].filter(Boolean).join(', ')
              ),
              
              React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100 mt-1' },
                React.createElement('div', { className: 'flex gap-1' },
                  user && user.uid !== listing.userId && React.createElement('button', { 
                    onClick: function(e) { e.stopPropagation(); onStartChat(listing.userId, listing.id, e); }, 
                    className: 'text-gray-500 hover:text-green-950 p-0.5 rounded hover:bg-gray-100 transition' 
                  },
                    React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                    )
                  ),
                  
                  React.createElement('button', { 
                    onClick: function(e) { e.stopPropagation(); onShare(listing, e); }, 
                    className: 'text-gray-500 hover:text-blue-600 p-0.5 rounded hover:bg-gray-100 transition' 
                  },
                    React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                    )
                  )
                ),
                
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); onToggleFavorite(listing.id, e); },
                  disabled: isChecking,
                  className: 'p-0.5 rounded hover:bg-gray-100 transition ' + 
                            (isFav ? 'text-red-500' : 'text-gray-500')
                },
                  isFav
                    ? React.createElement('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' }, 
                        React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                      )
                    : React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                      )
                )
              )
            )
          );
        })
      ),
      
      // Show more/less toggle
      listings.length > 4 && React.createElement('button', {
        onClick: function() { toggleLocation(locationKey); },
        className: 'w-full text-center text-xs text-green-950 py-2 hover:underline flex items-center justify-center gap-1'
      },
        React.createElement('span', null, isExpanded ? 'Show less' : `Show ${listings.length - 4} more`),
        React.createElement('svg', {
          className: 'w-3 h-3 transition-transform ' + (isExpanded ? 'rotate-180' : ''),
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' })
        )
      )
    );
  };
  
  // ===== MAIN RENDER =====
  
  // Loading state
  if (loading && listings.length === 0) {
    return React.createElement('div', { className: 'grid ' + gridCols + ' gap-3' },
      Array.from({ length: 8 }).map(function(_, i) {
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
    );
  }

  return React.createElement('div', { className: 'px-4 pb-20' },
    
    // Search result count
    searchTerm && React.createElement('div', { className: 'mb-3 text-sm text-gray-600' },
      filteredCount + ' result' + (filteredCount === 1 ? '' : 's') + ' found for "' + searchTerm + '"'
    ),

    // MAIN RESULTS SECTION (always shown if any)
    listings.length > 0 && React.createElement('div', { className: 'mb-8' },
      React.createElement('div', { className: 'grid ' + gridCols + ' gap-3' },
        listings.map(function(listing) {
          const isOwner = user && user.uid === listing.userId;
          const isFav = favorites[listing.id] || false;
          const isChecking = checkingFavorites[listing.id] || false;

          return React.createElement('div', {
            key: listing.id,
            'data-listing-card': '1',
            className: 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition page-transition',
            onClick: function() { onListingClick(listing); }
          },
            // ... (existing listing card code - same as above)
            // Use the same card structure as in the location sections
            React.createElement('div', { className: 'relative ' + cardSizes.image + ' bg-gray-200' },
              React.createElement('img', {
                src: listing.images?.[0]
                  ? window.CloudinaryHelpers.getCardUrl(listing.images[0])
                  : '/vault/img/no-image.jpg',
                alt: listing.title,
                className: 'w-full h-full object-cover',
                loading: 'lazy',
                onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
              }),
              React.createElement('div', { className: 'absolute bottom-1 left-1 bg-green-950 text-white px-1.5 py-0.5 rounded font-bold ' + cardSizes.price },
                '₦' + (listing.price ? listing.price.toLocaleString() : '0')
              )
            ),
            
            React.createElement('div', { className: 'p-2 ' + spacing },
              React.createElement('h3', { className: 'font-bold text-gray-900 mb-0.5 line-clamp-1 ' + cardSizes.title }, 
                listing.title
              ),
              React.createElement('p', { className: 'text-gray-600 mb-1 line-clamp-1 ' + cardSizes.address }, 
                listing.address
              ),
              
              React.createElement('div', { className: 'flex flex-wrap gap-0.5 mb-1' },
                !listing.agentToggle && React.createElement('span', { 
                  className: 'bg-green-100 text-green-700 px-1 py-0.5 rounded ' + cardSizes.badge 
                }, 'Agent-Free'),
                listing.propertyType && React.createElement('span', { 
                  className: 'bg-gray-100 text-gray-700 px-1 py-0.5 rounded ' + cardSizes.badge 
                }, listing.propertyType)
              ),
              
              React.createElement('div', { className: 'flex items-center justify-between pt-1 border-t border-gray-100' },
                React.createElement('div', { className: 'flex gap-1' },
                  user && !isOwner && React.createElement('button', { 
                    onClick: function(e) { onStartChat(listing.userId, listing.id, e); }, 
                    className: 'text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition ' + cardSizes.button 
                  },
                    React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
                    )
                  ),
                  
                  React.createElement('button', { 
                    onClick: function(e) { onShare(listing, e); }, 
                    className: 'text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition ' + cardSizes.button 
                  },
                    React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
                    )
                  )
                ),
                
                React.createElement('button', {
                  onClick: function(e) { onToggleFavorite(listing.id, e); },
                  disabled: isChecking,
                  className: 'p-1 rounded hover:bg-gray-100 transition ' + cardSizes.button + ' ' + 
                            (isFav ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-red-500') + 
                            (isChecking ? ' opacity-50 cursor-wait' : '')
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
      )
    ),

    // NO RESULTS FOUND SECTION
    listings.length === 0 && !loading && React.createElement('div', { className: 'text-center py-12 mb-8 bg-white rounded-xl shadow-sm' },
      React.createElement('div', { className: 'text-5xl mb-3' }, '🏠'),
      React.createElement('p', { className: 'text-gray-500 text-lg mb-2' }, 
        'No listings match "' + searchTerm + '"'
      ),
      React.createElement('p', { className: 'text-gray-400 text-sm mb-6' },
        'Try adjusting your search or filters'
      ),
      
      // Quick suggestions
      React.createElement('div', { className: 'max-w-md mx-auto' },
        React.createElement('p', { className: 'text-xs text-gray-500 mb-3' }, 'Try searching for:'),
        React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center' },
          ['Lagos', 'Abuja', 'Port Harcourt', '2 bedroom', 'Self contain'].map(function(suggestion) {
            return React.createElement('button', {
              key: suggestion,
              onClick: function() {
                onSearchChange(suggestion);
                onSearchSubmit(suggestion);
              },
              className: 'bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm transition'
            }, suggestion);
          })
        )
      ),
      
      // Post listing button
      React.createElement('button', { 
        onClick: function() { 
          if (user) {
            window.__openAuthModal('post', {});
          } else {
            window.__openAuthModal('signup', '/post');
          }
        }, 
        className: 'mt-6 bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition ' + bodyTextSize 
      }, 'Post a Listing')
    ),

    // LOCATION-BASED SECTIONS (only shown when main results are present OR when no results)
    React.createElement('div', { className: 'space-y-6' },
      
      // If we have a suggested state and there are listings there
      searchContext?.suggestedState && searchContext.stateListings?.length > 0 &&
      renderLocationSection(
        `Also available in ${searchContext.suggestedState} State`,
        `state-${searchContext.suggestedState}`,
        searchContext.stateListings,
        searchContext.suggestedState
      ),
      
      // If we have matching LGAs
      searchContext?.matchingLGAs && Object.entries(searchContext.lgaListings || {}).map(function([key, listings]) {
        const [state, lga] = key.split('|');
        return renderLocationSection(
          `Properties in ${lga}, ${state}`,
          key,
          listings,
          state,
          lga
        );
      }),
      
      // Other states with available listings
      searchContext?.otherStates && searchContext.otherStates.map(function(state) {
        const key = `other-${state}`;
        
        // Load listings for this state if not already loaded
        if (!locationListings[key] && !loading) {
          setTimeout(function() {
            loadLocationListings('state', state);
          }, 100);
        }
        
        const listings = locationListings[key];
        if (!listings || listings.length === 0) return null;
        
        return renderLocationSection(
          `More properties in ${state}`,
          key,
          listings,
          state
        );
      })
    ),

    // Loading more indicator
    loadingMore && React.createElement('div', { className: 'grid ' + gridCols + ' gap-3 mt-3' },
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
    !hasMore && listings.length > 0 && 
    React.createElement('div', { className: 'text-center py-4 text-gray-400 text-sm' }, 
      "You've reached the end"
    )
  );
}

window.ListingGrid = ListingGrid;