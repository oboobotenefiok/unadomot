// components/SimilarListings.js - Reusable grid with infinite scroll

function SimilarListings({ 
  listings, 
  loading, 
  hasMore, 
  onLoadMore,
  onListingClick,
  gridCols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  cardSizes = { image: 'h-32', title: 'text-xs', price: 'text-xs', address: 'text-[10px]' }
}) {
  const observerRef = React.useRef(null);
  const loadMoreRef = React.useRef(null);

  // Infinite scroll observer
  React.useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    }, { threshold: 0.5 });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!listings.length && !loading) return null;

  return React.createElement('div', { className: 'mt-6' },
    // Grid
    React.createElement('div', { className: `grid ${gridCols} gap-2` },
      listings.map(listing => 
        React.createElement('div', {
          key: listing.id,
          onClick: () => onListingClick(listing),
          className: 'bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition'
        },
          React.createElement('div', { className: `relative ${cardSizes.image} bg-gray-200` },
            React.createElement('img', {
              src: listing.images?.[0] ? window.CloudinaryHelpers?.getCardUrl(listing.images[0]) : '/vault/img/no-image.jpg',
              alt: listing.title,
              className: 'w-full h-full object-cover',
              loading: 'lazy',
              onError: (e) => e.target.src = '/vault/img/no-image.jpg'
            }),
            React.createElement('div', { className: 'absolute bottom-1 left-1 bg-green-950 text-white px-1 py-0.5 rounded text-[10px] font-bold' },
              `₦${listing.price?.toLocaleString()}`
            )
          ),
          React.createElement('div', { className: 'p-1.5' },
            React.createElement('h4', { className: `font-bold text-gray-900 truncate ${cardSizes.title}` }, listing.title),
            React.createElement('p', { className: `text-gray-500 truncate ${cardSizes.address}` }, 
              [listing.lga, listing.state].filter(Boolean).join(', ')
            )
          )
        )
      )
    ),
    
    // Loading indicator
    loading && React.createElement('div', { className: 'text-center py-4' },
      React.createElement('div', { className: 'w-6 h-6 border-2 border-green-950 border-t-transparent rounded-full animate-spin mx-auto' })
    ),
    
    // Load more trigger
    hasMore && !loading && React.createElement('div', { ref: loadMoreRef, className: 'h-4' })
  );
}

window.SimilarListings = SimilarListings;