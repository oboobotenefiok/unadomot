// hooks/useSimilarListings.js
// Algorithm: region → price range → property type, infinite scroll

function useSimilarListings(currentListing, allListings = []) {
  const [similarListings, setSimilarListings] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [lastVisible, setLastVisible] = React.useState(null);
  const ITEMS_PER_PAGE = 12;

  // Score function for similarity
  const calculateScore = React.useCallback((listing) => {
    if (!currentListing || listing.id === currentListing.id) return -1;
    if (listing.status === 'deleted') return -1;

    let score = 0;

    // 1. Same LGA (highest weight)
    if (listing.lga === currentListing.lga) score += 100;
    // 2. Same state (medium weight)
    else if (listing.state === currentListing.state) score += 50;

    // 3. Price range within ±20%
    if (currentListing.price && listing.price) {
      const priceDiff = Math.abs(listing.price - currentListing.price);
      const pricePercent = priceDiff / currentListing.price;
      if (pricePercent <= 0.2) score += 30;
      else if (pricePercent <= 0.5) score += 15;
    }

    // 4. Same property type
    if (listing.propertyType === currentListing.propertyType) score += 20;

    // 5. Same bedrooms
    if (listing.bedrooms === currentListing.bedrooms) score += 10;

    // 6. Same furnishing
    if (listing.furnishing === currentListing.furnishing) score += 5;

    return score;
  }, [currentListing]);

  // Load initial similar listings
  const loadSimilar = React.useCallback(async (reset = false) => {
    if (!currentListing) return;
    
    setLoading(true);
    
    try {
      // For now, use allListings from props (will be replaced with Firestore query)
      let scored = allListings
        .map(l => ({ ...l, score: calculateScore(l) }))
        .filter(l => l.score > 0)
        .sort((a, b) => b.score - a.score);

      // Paginate
      const start = reset ? 0 : (page - 1) * ITEMS_PER_PAGE;
      const paginated = scored.slice(start, start + ITEMS_PER_PAGE);
      
      if (reset) {
        setSimilarListings(paginated);
        setPage(2);
      } else {
        setSimilarListings(prev => [...prev, ...paginated]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(paginated.length === ITEMS_PER_PAGE);
      
    } catch (err) {
      console.error('Error loading similar listings:', err);
    } finally {
      setLoading(false);
    }
  }, [currentListing, allListings, page, calculateScore]);

  // Load more for infinite scroll
  const loadMore = React.useCallback(() => {
    if (!loading && hasMore) {
      loadSimilar();
    }
  }, [loading, hasMore, loadSimilar]);

  // Reset when listing changes
  React.useEffect(() => {
    if (currentListing) {
      setSimilarListings([]);
      setPage(1);
      setHasMore(true);
      loadSimilar(true);
    }
  }, [currentListing?.id]);

  return {
    similarListings,
    loading,
    hasMore,
    loadMore
  };
}

window.useSimilarListings = useSimilarListings;