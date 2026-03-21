// pages/listing-detail/components/ListingInfo.js
function ListingInfo({ listing }) {
  if (!listing) return null;

  const addressParts = [listing.address, listing.lga, listing.state].filter(Boolean);

  return React.createElement('div', { className: 'mb-4' },
    React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 mb-1' }, 
      listing.title
    ),
    
    React.createElement('p', { className: 'text-sm text-gray-500 flex items-center gap-1 mb-2' },
      React.createElement('svg', { 
        className: 'w-4 h-4', 
        fill: 'none', 
        stroke: 'currentColor', 
        viewBox: '0 0 24 24' 
      },
        React.createElement('path', { 
          strokeLinecap: 'round', 
          strokeLinejoin: 'round', 
          strokeWidth: '2', 
          d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' 
        })
      ),
      addressParts.join(', ')
    ),
    
    React.createElement('p', { className: 'text-2xl font-bold text-green-950' },
      '₦' + (listing.price ? listing.price.toLocaleString() : '0') + '/month'
    )
  );
}

window.ListingInfo = ListingInfo;