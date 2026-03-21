// pages/home/components/map/useNavigation.js
// NEW FILE - Create this

window.useNavigation = function(items, initialIndex = 0) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  
  // Ensure index is within bounds when items change
  React.useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);
  
  const goToNext = React.useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % items.length);
  }, [items.length]);
  
  const goToPrev = React.useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  }, [items.length]);
  
  const goToIndex = React.useCallback((index) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  }, [items.length]);
  
  return {
    currentIndex,
    currentItem: items[currentIndex],
    totalItems: items.length,
    goToNext,
    goToPrev,
    goToIndex,
    hasMultiple: items.length > 1,
    isFirst: currentIndex === 0,
    isLast: currentIndex === items.length - 1
  };
};