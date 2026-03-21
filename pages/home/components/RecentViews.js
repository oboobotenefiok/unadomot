// pages/home/components/RecentViews.js
function RecentViews({ onListingSelect, maxItems = 5 }) {
  const [recentViews, setRecentViews] = React.useState([]);
  const [showRecent, setShowRecent] = React.useState(false);
  
  // Load recently viewed from localStorage
  React.useEffect(() => {
    try {
      const views = localStorage.getItem('recent_views');
      if (views) {
        setRecentViews(JSON.parse(views).slice(0, maxItems));
      }
    } catch (e) {
      console.error('Error loading recent views:', e);
    }
    
    // Listen for new views
    const handleNewView = (e) => {
      if (e.detail?.listing) {
        setRecentViews(prev => {
          const filtered = prev.filter(v => v.id !== e.detail.listing.id);
          const updated = [e.detail.listing, ...filtered].slice(0, maxItems);
          try {
            localStorage.setItem('recent_views', JSON.stringify(updated));
          } catch (err) {}
          return updated;
        });
      }
    };
    
    window.addEventListener('listing-viewed', handleNewView);
    return () => window.removeEventListener('listing-viewed', handleNewView);
  }, [maxItems]);
  
  const clearRecent = () => {
    setRecentViews([]);
    localStorage.removeItem('recent_views');
  };
  
  if (recentViews.length === 0) return null;
  
  return React.createElement(React.Fragment, null,
    // Recent views button
    React.createElement('button', {
        onClick: () => setShowRecent(!showRecent),
        className: 'bg-white rounded-full shadow-lg p-3 transition-all hover:scale-110 relative'
      },
      React.createElement('svg', {
          className: 'w-5 h-5',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '2',
          d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        })
      ),
      React.createElement('span', {
        className: 'absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center'
      }, recentViews.length)
    ),
    
    // Recent views panel
    showRecent && React.createElement('div', {
        className: 'absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto'
      },
      React.createElement('div', { className: 'p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white' },
        React.createElement('h3', { className: 'font-bold text-gray-900' }, 'Recently Viewed'),
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', {
            onClick: clearRecent,
            className: 'text-xs text-red-500 hover:text-red-700'
          }, 'Clear'),
          React.createElement('button', {
            onClick: () => setShowRecent(false),
            className: 'text-gray-400 hover:text-gray-600'
          }, '✕')
        )
      ),
      
      React.createElement('div', { className: 'p-2' },
        recentViews.map(listing =>
          React.createElement('div', {
              key: listing.id,
              onClick: () => {
                onListingSelect(listing.id);
                setShowRecent(false);
              },
              className: 'flex gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition'
            },
            React.createElement('img', {
              src: listing.images?.[0] ?
                window.CloudinaryHelpers?.getThumbnailUrl(listing.images[0]) :
                '/vault/img/no-image.jpg',
              className: 'w-16 h-16 rounded-lg object-cover',
              onError: (e) => { e.target.src = '/vault/img/no-image.jpg'; }
            }),
            React.createElement('div', { className: 'flex-1' },
              React.createElement('h4', { className: 'font-medium text-sm' }, listing.title),
              React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                `${listing.lga || ''}, ${listing.state || ''}`
              ),
              React.createElement('p', { className: 'text-sm font-bold text-green-950 mt-1' },
                `₦${listing.price?.toLocaleString()}/month`
              )
            )
          )
        )
      )
    )
  );
}

window.RecentViews = RecentViews;