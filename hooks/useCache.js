
function useCache(type, key, fetchFn, options = {}) {
  const {
    ttl = 5 * 60 * 1000,
      staleWhileRevalidate = true,
      onError = null
  } = options;
  
  const [data, setData] = React.useState(() => {
    return AppCache.get(type, key) || null;
  });
  
  const [loading, setLoading] = React.useState(!data);
  const [error, setError] = React.useState(null);
  const controllerRef = React.useRef(null);
  
  const fetchData = React.useCallback(async (force = false) => {
    
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    const controller = new AbortController();
    controllerRef.current = controller;
    
    
    if (!force) {
      const cached = AppCache.get(type, key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }
    }
    
    setLoading(true);
    
    try {
      const result = await fetchFn();
      
      
      if (!controller.signal.aborted) {
        AppCache.set(type, key, result);
        setData(result);
        setError(null);
      }
      
      return result;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message);
        if (onError) onError(err);
        
        
        if (staleWhileRevalidate && data) {
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [type, key, fetchFn, staleWhileRevalidate, data, onError]);
  
  
  React.useEffect(() => {
    fetchData();
    
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [fetchData]);
  
  const invalidate = React.useCallback(() => {
    AppCache.clear(type, key);
    return fetchData(true);
  }, [type, key, fetchData]);
  
  return { data, loading, error, refetch: fetchData, invalidate };
}

window.useCache = useCache;