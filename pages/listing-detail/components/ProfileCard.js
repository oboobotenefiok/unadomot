// pages/listing-detail/components/ProfileCard.js
function ProfileCard({ user, onProfileClick }) {
  if (!user) return null;
  
  // Get display name (new field) with fallback to old name field
  const displayName = user.displayName || user.name || 'User';
  const username = user.username || null;
  const photoURL = user.photoURL || null;
  const userType = user.userType || 'user';
  
  const getInitials = (name) => {
    return (name || 'U').charAt(0).toUpperCase();
  };
  
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.style.display = 'none';
    e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-green-800">${getInitials(displayName)}</div>`;
  };
  
  return React.createElement('div', {
      onClick: () => onProfileClick(user.id),
      className: 'flex items-center gap-3 mb-6 cursor-pointer hover:bg-gray-50 p-3 -mx-3 rounded-lg transition group'
    },
    // Avatar
    React.createElement('div', { className: 'w-14 h-14 rounded-lg overflow-hidden bg-green-200 flex-shrink-0' },
      photoURL ?
      React.createElement('img', {
        src: photoURL,
        alt: displayName,
        className: 'w-full h-full object-cover',
        onError: handleImageError
      }) :
      React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-2xl font-bold text-green-800' },
        getInitials(displayName)
      )
    ),
    
    // User info
    React.createElement('div', { className: 'flex-1' },
      React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
        React.createElement('p', { className: 'font-bold text-gray-900' }, displayName),
        username && React.createElement('p', { className: 'text-xs text-gray-500' }, `@${username}`),
        React.createElement(RoleBadge, { user: { userType }, size: 'sm' })
      ),
      React.createElement('div', { className: 'flex items-center gap-2 mt-1' },
        React.createElement('div', { className: 'flex items-center' },
          React.createElement('span', { className: 'text-yellow-400 text-sm' }, '★'),
          React.createElement('span', { className: 'text-sm font-medium ml-1' },
            (user.rating || 4.8).toFixed(1)
          ),
          React.createElement('span', { className: 'text-xs text-gray-400 ml-1' },
            '(' + (user.reviewCount || 23) + ')'
          )
        )
      )
    ),
    
    // Arrow icon
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

window.ProfileCard = ProfileCard;