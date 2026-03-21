// pages/home/hooks/useSearch.js - COMPLETE WITH ALL FILTER OPTIONS

function useSearch(initialTerm = '') {
  const [searchTerm, setSearchTerm] = React.useState(initialTerm);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState(function() {
    try {
      return JSON.parse(localStorage.getItem('ud_search_history') || '[]');
    } catch (e) {
      return [];
    }
  });
  
  const searchInputRef = React.useRef(null);
  const searchDropdownRef = React.useRef(null);
  
  const saveSearchHistory = React.useCallback(function(term) {
    if (!term || term.trim().length < HOME_CONSTANTS.SEARCH.MIN_CHARS) return;
    
    const cleaned = term.trim();
    setSearchHistory(function(prev) {
      const filtered = prev.filter(function(h) {
        return h.toLowerCase() !== cleaned.toLowerCase();
      });
      const updated = [cleaned, ...filtered].slice(0, HOME_CONSTANTS.SEARCH.MAX_HISTORY);
      
      try {
        localStorage.setItem('ud_search_history', JSON.stringify(updated));
      } catch (e) {}
      
      return updated;
    });
  }, []);
  
  const clearSearchHistory = React.useCallback(function() {
    setSearchHistory([]);
    try { localStorage.removeItem('ud_search_history'); } catch (e) {}
  }, []);
  
  // ===== ENHANCED: Include all filter options from actual listings =====
  const getSearchSuggestions = React.useCallback(function(listings) {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const q = searchTerm.toLowerCase();
    const seen = new Set();
    const results = {
      locations: [],
      propertyTypes: [],
      bedrooms: [],
      furnishing: [],
      titles: []
    };
    
    listings.forEach(function(l) {
      // 1. LOCATIONS (State & LGA)
      if (l.state && l.state.toLowerCase().includes(q) && !seen.has('state_' + l.state)) {
        seen.add('state_' + l.state);
        results.locations.push({
          text: l.state,
          type: 'state',
          icon: '🗺️',
          category: 'State'
        });
      }
      
      if (l.lga && l.lga.toLowerCase().includes(q) && !seen.has('lga_' + l.lga)) {
        seen.add('lga_' + l.lga);
        results.locations.push({
          text: l.lga,
          type: 'lga',
          icon: '📍',
          category: 'LGA'
        });
      }
      
      // 2. PROPERTY TYPES
      if (l.propertyType && l.propertyType.toLowerCase().includes(q) && !seen.has('type_' + l.propertyType)) {
        seen.add('type_' + l.propertyType);
        results.propertyTypes.push({
          text: l.propertyType,
          type: 'propertyType',
          icon: '🏠',
          category: 'Property Type'
        });
      }
      
      // 3. BEDROOMS
      if (l.bedrooms && l.bedrooms.toLowerCase().includes(q) && !seen.has('bed_' + l.bedrooms)) {
        seen.add('bed_' + l.bedrooms);
        results.bedrooms.push({
          text: l.bedrooms + (l.bedrooms === 'Self-contain' ? '' : ' Bedroom' + (l.bedrooms === '1' ? '' : 's')),
          type: 'bedrooms',
          icon: '🛏️',
          category: 'Bedrooms',
          rawValue: l.bedrooms
        });
      }
      
      // 4. FURNISHING
      if (l.furnishing && l.furnishing.toLowerCase().includes(q) && !seen.has('furn_' + l.furnishing)) {
        seen.add('furn_' + l.furnishing);
        results.furnishing.push({
          text: l.furnishing,
          type: 'furnishing',
          icon: '🪑',
          category: 'Furnishing'
        });
      }
      
      // 5. TITLES (for specific property searches)
      if (l.title && l.title.toLowerCase().includes(q) && !seen.has('title_' + l.title)) {
        seen.add('title_' + l.title);
        results.titles.push({
          text: l.title,
          type: 'title',
          icon: '📋',
          category: 'Property'
        });
      }
    });
    
    // Combine all results with category headers
    const allResults = [];
    
    // Add locations first
    if (results.locations.length > 0) {
      allResults.push({ type: 'header', text: '📍 Locations' });
      results.locations.forEach(r => allResults.push(r));
    }
    
    // Add property types
    if (results.propertyTypes.length > 0) {
      allResults.push({ type: 'header', text: '🏠 Property Types' });
      results.propertyTypes.forEach(r => allResults.push(r));
    }
    
    // Add bedrooms
    if (results.bedrooms.length > 0) {
      allResults.push({ type: 'header', text: '🛏️ Bedrooms' });
      results.bedrooms.forEach(r => allResults.push(r));
    }
    
    // Add furnishing
    if (results.furnishing.length > 0) {
      allResults.push({ type: 'header', text: '🪑 Furnishing' });
      results.furnishing.forEach(r => allResults.push(r));
    }
    
    // Add titles last
    if (results.titles.length > 0) {
      allResults.push({ type: 'header', text: '📋 Specific Properties' });
      results.titles.forEach(r => allResults.push(r));
    }
    
    return allResults.slice(0, 15); // Limit total results
  }, [searchTerm]);
  
  // Click outside handler
  React.useEffect(function() {
    function handleClickOutside(e) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
        if (searchTerm.trim().length > 1) saveSearchHistory(searchTerm);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return function() { document.removeEventListener('mousedown', handleClickOutside); };
  }, [searchTerm, saveSearchHistory]);
  
  return {
    searchTerm,
    setSearchTerm,
    showSearchDropdown,
    setShowSearchDropdown,
    searchHistory,
    searchInputRef,
    searchDropdownRef,
    saveSearchHistory,
    clearSearchHistory,
    getSearchSuggestions
  };
}

window.useSearch = useSearch;