// hooks/usePageState.js
function usePageState(pageName, initialState = {}) {
  const [state, setState] = React.useState(() => {
    // Try to load from cache first
    const cached = window.RouteCache?.get(window.location.pathname);
    if (cached && cached.pageName === pageName) {
      return cached.state || initialState;
    }
    return initialState;
  });
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Save state to cache whenever it changes
  React.useEffect(() => {
    if (Object.keys(state).length > 0) {
      window.RouteCache?.set(window.location.pathname, {
        pageName,
        state,
        timestamp: Date.now()
      });
    }
  }, [state, pageName]);
  
  // Save scroll position
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      window.RouteCache?.set(window.location.pathname, {
        pageName,
        state,
        scrollPosition: scrollY,
        timestamp: Date.now()
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [state, pageName]);
  
  // Load data with caching
  const loadData = React.useCallback(async (fetchFn, options = {}) => {
    const { forceRefresh = false, cacheKey = null } = options;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      if (!forceRefresh && !cacheKey) {
        const cached = window.RouteCache?.get(window.location.pathname);
        if (cached && cached.data) {
          setState(prev => ({ ...prev, data: cached.data }));
          setLoading(false);
          return cached.data;
        }
      }
      
      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the data
      window.RouteCache?.set(window.location.pathname, {
        pageName,
        state,
        data,
        timestamp: Date.now()
      });
      
      setState(prev => ({ ...prev, data }));
      setLoading(false);
      return data;
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [pageName, state]);
  
  // Clear page state
  const clearState = React.useCallback(() => {
    setState(initialState);
    window.RouteCache?.remove(window.location.pathname);
  }, [initialState]);
  
  // Update specific field
  const updateField = React.useCallback((field, value) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // Batch update multiple fields
  const updateFields = React.useCallback((newState) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);
  
  return {
    state,
    setState,
    loading,
    error,
    loadData,
    clearState,
    updateField,
    updateFields
  };
}

window.usePageState = usePageState;
console.log('✅ usePageState hook loaded');