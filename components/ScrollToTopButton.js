// components/ScrollToTopButton.js
function ScrollToTopButton({ containerRef, scrollable = false }) {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const checkScroll = () => {
      let scrollPos = 0;
      if (scrollable && containerRef?.current) {
        scrollPos = containerRef.current.scrollTop;
      } else {
        scrollPos = window.scrollY;
      }
      
      const shouldShow = scrollPos > 200;
      setIsVisible(shouldShow);
    };
    
    const element = scrollable ? containerRef?.current : window;
    if (!element) return;
    
    element.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    
    return () => element.removeEventListener('scroll', checkScroll);
  }, [scrollable, containerRef]);
  
  if (!isVisible) return null;
  
  return React.createElement('button', {
      onClick: () => {
        if (scrollable && containerRef?.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      className: 'fixed bottom-24 right-4 bg-green-950 text-white rounded-full p-3 shadow-lg hover:bg-green-800 transition-all duration-300 transform hover:scale-110',
      style: {
        zIndex: 40, // Lower than modals (which are z-50)
        display: 'block',
        opacity: 1
      },
      'aria-label': 'Scroll to top'
    },
    React.createElement('svg', {
        className: 'w-6 h-6',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M5 15l7-7 7 7'
      })
    )
  );
}

window.ScrollToTopButton = ScrollToTopButton;