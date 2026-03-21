// hooks/useReactions.js
function useReactions(contentType, contentId) {
  const [reactions, setReactions] = React.useState({
    counts: {},
    userReaction: null,
    loading: true
  });
  
  const [toggling, setToggling] = React.useState(false);
  const user = auth?.currentUser;
  
  React.useEffect(() => {
    if (!contentType || !contentId) return;
    
    setReactions(prev => ({ ...prev, loading: true }));
    
    const unsubscribe = ReactionHelpers.listenToReactions(
      contentType,
      contentId,
      user?.uid,
      (data) => {
        setReactions(prev => ({
          ...prev,
          ...data,
          loading: false
        }));
      }
    );
    
    return unsubscribe;
  }, [contentType, contentId, user?.uid]);
  
  const toggleReaction = React.useCallback(async (reactionType) => {
    if (!user) {
      window.__openAuthModal?.('login', window.location.pathname);
      return;
    }
    
    setToggling(true);
    
    // Optimistic update
    const newActive = reactions.userReaction === reactionType ? null : reactionType;
    const newCounts = { ...reactions.counts };
    
    if (reactions.userReaction === reactionType) {
      // Removing
      newCounts[reactionType] = Math.max(0, (newCounts[reactionType] || 0) - 1);
    } else {
      // Adding (and removing previous if exists)
      if (reactions.userReaction) {
        newCounts[reactions.userReaction] = Math.max(0, (newCounts[reactions.userReaction] || 0) - 1);
      }
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
    }
    
    setReactions(prev => ({
      ...prev,
      userReaction: newActive,
      counts: newCounts
    }));
    
    try {
      const result = await ReactionHelpers.toggleReaction({
        contentType,
        contentId,
        userId: user.uid,
        reactionType
      });
      
      // Update with actual server data
      setReactions(prev => ({
        ...prev,
        userReaction: result.active ? result.type : null,
        counts: result.counts
      }));
      
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revert optimistic update on error
      setReactions(prev => ({
        ...prev,
        userReaction: reactions.userReaction,
        counts: reactions.counts
      }));
    } finally {
      setToggling(false);
    }
  }, [contentType, contentId, user, reactions.userReaction, reactions.counts]);
  
  const getUserReaction = React.useCallback(() => {
    return reactions.userReaction;
  }, [reactions.userReaction]);
  
  const getCount = React.useCallback((reactionType) => {
    return reactions.counts[reactionType] || 0;
  }, [reactions.counts]);
  
  const getTotalCount = React.useCallback(() => {
    return Object.values(reactions.counts).reduce((sum, count) => sum + count, 0);
  }, [reactions.counts]);
  
  return {
    ...reactions,
    toggling,
    toggleReaction,
    getUserReaction,
    getCount,
    getTotalCount
  };
}

window.useReactions = useReactions;