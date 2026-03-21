// hooks/useScrollDirection.js
function useScrollDirection(options = {}) {
  const { container = null, threshold = 10 } = options;
  const [scrollDirection, setScrollDirection] = React.useState('up');
  const [scrollY, setScrollY] = React.useState(0);
  const [atTop, setAtTop] = React.useState(true);
  const lastScrollY = React.useRef(0);
  
  React.useEffect(() => {
    let element = null;
    
    try {
      element = container?.current || window;
    } catch (e) {
      console.warn('Cannot access scroll container:', e);
      return;
    }
    
    if (!element) return;
    
    const updateScrollDirection = () => {
      try {
        let currentScrollY = 0;
        
        if (container?.current) {
          currentScrollY = container.current.scrollTop;
        } else {
          currentScrollY = window.scrollY || window.pageYOffset;
        }
        
        const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
        
        setScrollY(currentScrollY);
        setAtTop(currentScrollY < 50);
        
        if (direction !== scrollDirection &&
          Math.abs(currentScrollY - lastScrollY.current) > threshold) {
          setScrollDirection(direction);
        }
        
        lastScrollY.current = currentScrollY;
      } catch (e) {
        // Silently fail if cross-origin error
      }
    };
    
    try {
      updateScrollDirection();
      element.addEventListener('scroll', updateScrollDirection, { passive: true });
    } catch (e) {
      console.warn('Cannot add scroll listener:', e);
    }
    
    return () => {
      try {
        element.removeEventListener('scroll', updateScrollDirection);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [scrollDirection, container, threshold]);
  
  return {
    scrollDirection,
    scrollY,
    atTop
  };
}

window.useScrollDirection = useScrollDirection;