// pages/listing-detail/components/ActionButtons.js
function ActionButtons({ 
  isOwner,
  isFavorite,
  checkingFavorite,
  onFavoriteClick,
  onMessageClick,
  onShareClick
}) {
  return React.createElement('div', { className: 'absolute bottom-3 left-3 flex gap-2 z-30' },
    
    // Favorite button
    React.createElement('button', {
      onClick: onFavoriteClick,
      disabled: checkingFavorite,
      className: `p-1.5 rounded-full shadow-lg transition ${
        isFavorite 
          ? 'bg-red-500 text-white' 
          : 'bg-white/90 text-gray-700 hover:bg-white'
      } ${checkingFavorite ? 'opacity-50 cursor-wait' : ''}`,
      title: isFavorite ? 'Remove from favorites' : 'Save to favorites'
    },
      React.createElement('svg', { 
        className: 'w-5 h-5', 
        fill: isFavorite ? 'currentColor' : 'none', 
        stroke: 'currentColor', 
        viewBox: '0 0 24 24' 
      },
        React.createElement('path', { 
          strokeLinecap: 'round', 
          strokeLinejoin: 'round', 
          strokeWidth: '2', 
          d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' 
        })
      )
    ),
    
    // Message button (only if not owner)
    !isOwner && React.createElement('button', {
      onClick: onMessageClick,
      className: 'p-1.5 bg-white/90 text-gray-700 rounded-full shadow-lg hover:bg-white transition',
      title: 'Send message'
    },
      React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { 
          strokeLinecap: 'round', 
          strokeLinejoin: 'round', 
          strokeWidth: '2', 
          d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' 
        })
      )
    ),
    
    // Share button
    React.createElement('button', {
      onClick: onShareClick,
      className: 'p-1.5 bg-white/90 text-gray-700 rounded-full shadow-lg hover:bg-white transition',
      title: 'Share listing'
    },
      React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { 
          strokeLinecap: 'round', 
          strokeLinejoin: 'round', 
          strokeWidth: '2', 
          d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' 
        })
      )
    )
  );
}

window.ActionButtons = ActionButtons;