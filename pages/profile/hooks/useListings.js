// pages/profile/hooks/useListings.js
function useProfileListings(user) {
  const [listings, setListings] = React.useState([]);
  const [listingsLoading, setListingsLoading] = React.useState(false);
  const [usingIndex, setUsingIndex] = React.useState(true);
  
  const fetchListings = React.useCallback(async () => {
    if (!user) return;
    
    setListingsLoading(true);
    try {
      const result = await FirestoreQueries.query({
        collection: 'listings',
        where: [
          ['userId', '==', user.uid],
          ['status', '==', 'available']
        ],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50 // Get all active listings
      });
      
      setUsingIndex(result.usingIndex);
      setListings(result.data);
    } catch (err) {
      
    } finally {
      setListingsLoading(false);
    }
  }, [user]);
  
  React.useEffect(() => {
    fetchListings();
  }, [fetchListings]);
  
  const deleteListing = async (listingId) => {
    try {
      await db.collection('listings').doc(listingId).update({
        status: 'deleted',
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setListings(prev => prev.filter(l => l.id !== listingId));
      return true;
    } catch (err) {
      
      return false;
    }
  };
  
  return {
    listings,
    listingsLoading,
    usingIndex,
    deleteListing,
    refetch: fetchListings
  };
}

window.useProfileListings = useProfileListings;