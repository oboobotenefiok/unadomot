
function withRouteCache(Component, pageName) {
  return function WrappedComponent(props) {
    const { cachePage, getCachedPage } = window.useRouteCache();
    const { currentPath, ...restProps } = props;
    const [cachedData, setCachedData] = React.useState(null);
    const containerRef = React.useRef(null);
    
    
    React.useEffect(() => {
      const cached = getCachedPage(currentPath);
      if (cached) {
        setCachedData(cached.data);
        
        
        setTimeout(() => {
          if (containerRef.current && cached.scrollPosition) {
            containerRef.current.scrollTop = cached.scrollPosition;
          }
        }, 50);
      }
    }, [currentPath, getCachedPage]);
    
    
    React.useEffect(() => {
      return () => {
        if (containerRef.current) {
          cachePage(
            currentPath,
            Component,
            cachedData || props.data,
            containerRef.current.scrollTop
          );
        }
      };
    }, [currentPath, cachePage, cachedData, props.data]);
    
    
    const componentProps = cachedData ?
      { ...props, data: cachedData, cached: true } :
      props;
    
    return React.createElement('div', {
        ref: containerRef,
        className: 'route-cache-container h-full overflow-auto'
      },
      React.createElement(Component, componentProps)
    );
  };
}

window.withRouteCache = withRouteCache;