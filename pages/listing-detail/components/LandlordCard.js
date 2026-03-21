// pages/listing-detail/components/LandlordCard.js
function LandlordCard({ landlord, onProfileClick }) {
  if (!landlord) return null;
  
  const getInitials = function(name) {
    return (name || 'U').charAt(0).toUpperCase();
  };
  
  const handleImageError = function(e) {
    e.target.onerror = null;
    e.target.style.display = 'none';
    e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-green-800">${getInitials(landlord.name)}</div>`;
  };
  
  return React.createElement('div', {
      onClick: function() { onProfileClick(landlord.id); },
      className: 'flex items-center gap-3 mb-6 cursor-pointer hover:bg-gray-50 p-3 -mx-3 rounded-lg transition group'
    },
    React.createElement('div', { className: 'w-14 h-14 rounded-lg overflow-hidden bg-green-200 flex-shrink-0' },
      landlord.photoURL ?
      React.createElement('img', {
        src: landlord.photoURL,
        alt: landlord.name,
        className: 'w-full h-full object-cover',
        onError: handleImageError
      }) :
      React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-2xl font-bold text-green-800' },
        getInitials(landlord.name)
      )
    ),
    
    React.createElement('div', { className: 'flex-1' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('p', { className: 'font-bold text-gray-900' },
          landlord.name || 'Property Owner'
        ),
        // Role badge next to name
        React.createElement(RoleBadge, { user: landlord, size: 'sm' })
      ),
      
      React.createElement('div', { className: 'flex items-center gap-2 mt-1' },
        React.createElement('div', { className: 'flex items-center' },
          React.createElement('span', { className: 'text-yellow-400 text-sm' }, '★'),
          React.createElement('span', { className: 'text-sm font-medium ml-1' },
            (landlord.rating || LISTING_DETAIL_CONSTANTS.LANDLORD.DEFAULT_RATING).toFixed(1)
          ),
          React.createElement('span', { className: 'text-xs text-gray-400 ml-1' },
            '(' + (landlord.reviewCount || LISTING_DETAIL_CONSTANTS.LANDLORD.DEFAULT_REVIEW_COUNT) + ')'
          )
        )
      )
    ),
    
    React.createElement('svg', {
        className: 'w-5 h-5 text-gray-400 group-hover:text-green-950 transition',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M9 5l7 7-7 7'
      })
    )
  );
}

window.LandlordCard = LandlordCard;