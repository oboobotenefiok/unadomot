// pages/home/hooks/useFavorites.js
function useFavorites(user) {
  const [favorites, setFavorites] = React.useState({});
  const [checkingFavorites, setCheckingFavorites] = React.useState({});
  const { openModal } = window.useAuthModal();
  const showToast = window.useToast?.() || function() {};

  const toggleFavorite = React.useCallback(async function(listingId, e) {
    e.stopPropagation();
    
    if (!user) { 
      openModal('login', window.location.pathname); 
      return; 
    }
    
    const prev = favorites[listingId] || false;
    
    setFavorites(function(f) { return { ...f, [listingId]: !prev }; });
    setCheckingFavorites(function(c) { return { ...c, [listingId]: true }; });
    
    try {
      const next = await FavoritesHelpers.toggleFavorite(user.uid, listingId);
      setFavorites(function(f) { return { ...f, [listingId]: next }; });
      showToast(next ? '✓ Saved to favorites' : '✓ Removed from favorites');
    } catch(err) {
      setFavorites(function(f) { return { ...f, [listingId]: prev }; });
      showToast('Failed to update favorites', 'error');
    } finally {
      setCheckingFavorites(function(c) { return { ...c, [listingId]: false }; });
    }
  }, [user, favorites, openModal, showToast]);

  const loadFavorites = React.useCallback(async function(listingsArray) {
    if (!user || !listingsArray?.length) return;
    
    const map = {};
    
    for (let i = 0; i < listingsArray.length; i += 10) {
      await Promise.all(listingsArray.slice(i, i + 10).map(async function(l) {
        try { 
          map[l.id] = await FavoritesHelpers.checkIsFavorite(user.uid, l.id); 
        } catch(e) {}
      }));
    }
    
    setFavorites(map);
  }, [user]);

  return {
    favorites,
    setFavorites,
    checkingFavorites,
    setCheckingFavorites,
    toggleFavorite,
    loadFavorites
  };
}

window.useFavorites = useFavorites;