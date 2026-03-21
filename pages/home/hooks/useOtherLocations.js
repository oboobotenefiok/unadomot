// pages/home/hooks/useOtherLocations.js
function useOtherLocations(currentListings = [], currentSearchTerm = '', currentFilters = {}) {
  const [otherLocationListings, setOtherLocationListings] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [lastVisible, setLastVisible] = React.useState(null);

  const getOtherLocations = React.useCallback(async function(reset = false) {
    // Don't fetch if no search term
    if (!currentSearchTerm || currentSearchTerm.length < 2) {
      setOtherLocationListings([]);
      return;
    }

    setLoading(true);

    try {
      // Get current location context from search
      // If user searched for "Ikeja", exclude Ikeja listings
      const searchLower = currentSearchTerm.toLowerCase();
      
      // Find which locations are already shown
      const shownLocations = new Set();
      currentListings.forEach(l => {
        if (l.lga) shownLocations.add(l.lga.toLowerCase());
        if (l.state) shownLocations.add(l.state.toLowerCase());
      });

      // Build query to get listings from OTHER locations
      let query = db.collection('listings')
        .where('status', '==', 'available')
        .orderBy('createdAt', 'desc')
        .limit(12);

      // Apply existing filters (price, property type, etc.) but NOT location
      if (currentFilters.minPrice) {
        query = query.where('price', '>=', Number(currentFilters.minPrice));
      }
      if (currentFilters.maxPrice) {
        query = query.where('price', '<=', Number(currentFilters.maxPrice));
      }
      if (currentFilters.propertyType) {
        query = query.where('propertyType', '==', currentFilters.propertyType);
      }
      if (currentFilters.bedrooms) {
        if (currentFilters.bedrooms === '5+') {
          query = query.where('bedrooms', '>=', '5');
        } else {
          query = query.where('bedrooms', '==', currentFilters.bedrooms);
        }
      }
      if (currentFilters.furnishing) {
        query = query.where('furnishing', '==', currentFilters.furnishing);
      }

      // Apply pagination
      if (!reset && lastVisible) {
        query = query.startAfter(lastVisible);
      }

      const snapshot = await query.get();
      
      // Filter out listings from locations already shown
      const otherListings = [];
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        
        // Check if this listing is from a different location
        const listingLga = data.lga?.toLowerCase() || '';
        const listingState = data.state?.toLowerCase() || '';
        
        // Skip if from any shown location
        if (shownLocations.has(listingLga) || shownLocations.has(listingState)) {
          return;
        }
        
        // Also skip if it matches the search term directly
        if (data.title?.toLowerCase().includes(searchLower) ||
            data.description?.toLowerCase().includes(searchLower) ||
            data.address?.toLowerCase().includes(searchLower)) {
          return;
        }
        
        otherListings.push(data);
      });

      setOtherLocationListings(prev => 
        reset ? otherListings : [...prev, ...otherListings]
      );
      
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 12);
      
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  }, [currentSearchTerm, currentListings, currentFilters, lastVisible]);

  // Reset when search term changes
  React.useEffect(() => {
    setOtherLocationListings([]);
    setLastVisible(null);
    setHasMore(true);
    if (currentSearchTerm) {
      getOtherLocations(true);
    }
  }, [currentSearchTerm, currentFilters.minPrice, currentFilters.maxPrice, 
      currentFilters.propertyType, currentFilters.bedrooms, currentFilters.furnishing]);

  return {
    otherLocationListings,
    loadingOtherLocations: loading,
    hasMoreOtherLocations: hasMore,
    loadMoreOtherLocations: () => getOtherLocations(false)
  };
}

window.useOtherLocations = useOtherLocations;