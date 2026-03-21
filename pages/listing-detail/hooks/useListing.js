// pages/listing-detail/hooks/useListing.js
function useListing(listingId, user) {
  const [listing, setListing] = React.useState(null);
  const [listingUser, setListingUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [checkingFavorite, setCheckingFavorite] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const userCache = React.useRef({});
  
  const fetchUserData = React.useCallback(async (userId) => {
    if (!userId) return { name: LISTING_DETAIL_CONSTANTS.PLACEHOLDERS.UNKNOWN_USER };
    if (userCache.current[userId]) return userCache.current[userId];
    
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userCache.current[userId] = userData;
        return userData;
      }
    } catch (err) {
      
    }
    return { name: LISTING_DETAIL_CONSTANTS.PLACEHOLDERS.UNKNOWN_USER };
  }, []);
  
  const fetchListing = React.useCallback(async () => {
    setLoading(true);
    
    try {
      const doc = await db.collection('listings').doc(listingId).get();
      if (!doc.exists) {
        setLoading(false);
        return;
      }
      
      const data = { id: doc.id, ...doc.data() };
      setListing(data);
      
      if (data.userId) {
        const userData = await fetchUserData(data.userId);
        setListingUser({
          id: data.userId,
          ...userData,
          rating: LISTING_DETAIL_CONSTANTS.LANDLORD.DEFAULT_RATING,
          reviewCount: LISTING_DETAIL_CONSTANTS.LANDLORD.DEFAULT_REVIEW_COUNT
        });
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  }, [listingId, fetchUserData]);
  
  const checkFavoriteStatus = React.useCallback(async () => {
    if (!user || !listing) return;
    
    setCheckingFavorite(true);
    try {
      const status = await FavoritesHelpers.checkIsFavorite(user.uid, listing.id);
      setIsFavorite(status);
    } catch (error) {
      
    } finally {
      setCheckingFavorite(false);
    }
  }, [user, listing]);
  
  const toggleFavorite = React.useCallback(async () => {
    if (!user) {
      window.__openAuthModal?.('login', window.location.pathname);
      return;
    }
    
    setCheckingFavorite(true);
    try {
      const newStatus = await FavoritesHelpers.toggleFavorite(user.uid, listing.id);
      setIsFavorite(newStatus);
    } catch (error) {
      
    } finally {
      setCheckingFavorite(false);
    }
  }, [user, listing]);
  
  const deleteListing = React.useCallback(async () => {
    if (!user || user.uid !== listing?.userId) return;
    if (!confirm(LISTING_DETAIL_CONSTANTS.MESSAGES.DELETE_CONFIRM)) return;
    
    setIsDeleting(true);
    try {
      await db.collection('listings').doc(listing.id).update({
        status: 'deleted',
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (err) {
      
      alert(LISTING_DETAIL_CONSTANTS.MESSAGES.DELETE_ERROR);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [user, listing]);
  
  React.useEffect(() => {
    if (listingId) fetchListing();
  }, [listingId, fetchListing]);
  
  React.useEffect(() => {
    if (user && listing) checkFavoriteStatus();
  }, [user, listing, checkFavoriteStatus]);
  
  return {
    listing,
    listingUser,
    loading,
    isFavorite,
    checkingFavorite,
    isDeleting,
    toggleFavorite,
    deleteListing,
    refetch: fetchListing
  };
}

window.useListing = useListing;