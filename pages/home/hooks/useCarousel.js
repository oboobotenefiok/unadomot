// pages/home/hooks/useCarousel.js
function useCarousel(initialListings = []) {
  const [carouselListings, setCarouselListings] = React.useState(initialListings);
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState(0);
  const [carouselLoading, setCarouselLoading] = React.useState(true);
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);
  
  const carouselTimerRef = React.useRef(null);

  const fetchCarouselListings = React.useCallback(async function() {
    setCarouselLoading(true);
    
    try {
      const result = await FirestoreQueries.query({
        collection: 'listings',
        where: [['status', '==', 'available']],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: HOME_CONSTANTS.CAROUSEL.LIMIT
      });
      
      if (result.data.length > 0) {
        setCarouselListings(result.data);
      }
    } catch(err) {
      
    } finally {
      setCarouselLoading(false);
    }
  }, []);

  const goToNextSlide = React.useCallback(function() {
    setCurrentCarouselIndex(function(p) { 
      return p === carouselListings.length - 1 ? 0 : p + 1; 
    });
  }, [carouselListings.length]);

  const goToPrevSlide = React.useCallback(function() {
    setCurrentCarouselIndex(function(p) { 
      return p === 0 ? carouselListings.length - 1 : p - 1; 
    });
  }, [carouselListings.length]);

  const resetCarouselTimer = React.useCallback(function() {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current);
      carouselTimerRef.current = setInterval(goToNextSlide, HOME_CONSTANTS.CAROUSEL.INTERVAL);
    }
  }, [goToNextSlide]);

  const handleTouchStart = React.useCallback(function(e) {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = React.useCallback(function(e) {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = React.useCallback(function() {
    if (!touchStart || !touchEnd) return;
    
    const d = touchStart - touchEnd;
    
    if (d > HOME_CONSTANTS.CAROUSEL.TOUCH_THRESHOLD) { 
      goToNextSlide(); 
      resetCarouselTimer(); 
    } else if (d < -HOME_CONSTANTS.CAROUSEL.TOUCH_THRESHOLD) { 
      goToPrevSlide(); 
      resetCarouselTimer(); 
    }
    
    setTouchStart(null); 
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNextSlide, goToPrevSlide, resetCarouselTimer]);

  // Auto-play timer
  React.useEffect(function() {
    if (carouselListings.length === 0) return;
    
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = setInterval(goToNextSlide, HOME_CONSTANTS.CAROUSEL.INTERVAL);
    
    return function() { 
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); 
    };
  }, [carouselListings.length, goToNextSlide]);

  return {
    carouselListings,
    setCarouselListings,
    currentCarouselIndex,
    setCurrentCarouselIndex,
    carouselLoading,
    carouselFavorites: {},
    checkingCarouselFavorites: {},
    fetchCarouselListings,
    goToNextSlide,
    goToPrevSlide,
    resetCarouselTimer,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

window.useCarousel = useCarousel;