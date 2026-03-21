// pages/home/hooks/useListings.js
function useListings(initialState) {
  const [listings, setListings] = React.useState(initialState?.listings || []);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [lastVisible, setLastVisible] = React.useState(null);
  const [usingIndex, setUsingIndex] = React.useState(true);

  const loadListings = React.useCallback(async function(reset = false) {
    if (reset) { 
      setListings([]); 
      setLastVisible(null); 
      setHasMore(true); 
    }
    
    setLoading(true);
    
    try {
      // ===== CHANGED: Only fetch 'available' listings (not pending_review or rejected) =====
      const result = await FirestoreQueries.query({
        collection: 'listings',
        where: [['status', '==', 'available']], // Only show approved listings
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: HOME_CONSTANTS.PAGINATION.PAGE_SIZE,
        startAfter: !reset ? lastVisible : null
      });
      
      setUsingIndex(result.usingIndex);
      
      if (result.data.length > 0) {
        setListings(function(prev) { 
          return reset ? result.data : [...prev, ...result.data]; 
        });
        
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch(err) {
      
    } finally {
      setLoading(false);
    }
  }, [lastVisible]);

  return {
    listings,
    setListings,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    hasMore,
    setHasMore,
    lastVisible,
    setLastVisible,
    usingIndex,
    loadListings
  };
}

window.useListings = useListings;