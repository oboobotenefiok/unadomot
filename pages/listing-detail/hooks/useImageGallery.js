// pages/listing-detail/hooks/useImageGallery.js
function useImageGallery(images = []) {
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);
  
  const carouselTimerRef = React.useRef(null);

  const startCarouselTimer = React.useCallback(() => {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current);
    }
    
    if (images.length > 1) {
      carouselTimerRef.current = setInterval(() => {
        setSelectedImage(prev => (prev + 1) % images.length);
      }, LISTING_DETAIL_CONSTANTS.CAROUSEL.INTERVAL);
    }
  }, [images.length]);

  const resetCarouselTimer = React.useCallback(() => {
    startCarouselTimer();
  }, [startCarouselTimer]);

  const nextImage = React.useCallback(() => {
    if (!images.length) return;
    setSelectedImage(prev => (prev + 1) % images.length);
    resetCarouselTimer();
  }, [images.length, resetCarouselTimer]);

  const prevImage = React.useCallback(() => {
    if (!images.length) return;
    setSelectedImage(prev => (prev - 1 + images.length) % images.length);
    resetCarouselTimer();
  }, [images.length, resetCarouselTimer]);

  const handleTouchStart = React.useCallback((e) => {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = React.useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const dist = touchStart - touchEnd;
    const threshold = LISTING_DETAIL_CONSTANTS.CAROUSEL.TOUCH_THRESHOLD;
    
    if (dist > threshold) nextImage();
    if (dist < -threshold) prevImage();
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, nextImage, prevImage]);

  const openLightbox = React.useCallback((index) => {
    setSelectedImage(index);
    setShowLightbox(true);
  }, []);

  const closeLightbox = React.useCallback(() => {
    setShowLightbox(false);
  }, []);

  React.useEffect(() => {
    startCarouselTimer();
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [startCarouselTimer]);

  return {
    selectedImage,
    setSelectedImage,
    showLightbox,
    nextImage,
    prevImage,
    openLightbox,
    closeLightbox,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}

window.useImageGallery = useImageGallery;