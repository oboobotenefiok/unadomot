// pages/listing-detail/components/ImageGallery.js
function ImageGallery({ 
  images = [], 
  selectedImage, 
  onImageSelect,
  onNext,
  onPrev,
  onLightboxOpen,
  touchHandlers,
  isOwner,
  onEdit,
  onDelete,
  isDeleting,
  isFavorite,
  checkingFavorite,
  onFavoriteClick,
  onMessageClick,
  onShareClick,
  className = ''
}) {
  const hasImages = images && images.length > 0;

  return React.createElement('div', { className: `relative w-full px-4 pt-4 ${className}` },
    React.createElement('div', { className: 'relative rounded-xl overflow-hidden shadow-lg bg-black' },
      
      // Main image container
      React.createElement('div', {
        className: 'relative w-full aspect-[4/3] md:aspect-[21/9] overflow-hidden',
        onTouchStart: touchHandlers.onTouchStart,
        onTouchMove: touchHandlers.onTouchMove,
        onTouchEnd: touchHandlers.onTouchEnd
      },
        // Image slider
        hasImages ? (
          React.createElement('div', {
            className: 'w-full h-full flex transition-transform duration-500 ease-out',
            style: { transform: `translateX(-${selectedImage * 100}%)` }
          },
            images.map(function(publicId, i) {
              return React.createElement('div', {
                key: i,
                className: 'w-full h-full flex-shrink-0 cursor-pointer',
                onClick: function() { onLightboxOpen(i); }
              },
                React.createElement('img', {
                  src: window.CloudinaryHelpers.getDetailUrl(publicId),
                  alt: `Property image ${i + 1}`,
                  className: 'w-full h-full object-cover',
                  loading: i === 0 ? 'eager' : 'lazy',
                  onError: function(e) { 
                    e.target.src = '/vault/img/no-image.jpg'; 
                  }
                })
              );
            })
          )
        ) : (
          React.createElement('div', { className: 'w-full h-full flex items-center justify-center bg-gray-100' },
            React.createElement('span', { className: 'text-gray-400' }, 'No images')
          )
        ),

        // Image counter
        hasImages && images.length > 1 && 
        React.createElement('div', { 
          className: 'absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-10' 
        },
          `${selectedImage + 1} / ${images.length}`
        ),

        // Navigation arrows
        hasImages && images.length > 1 && React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); onPrev(); },
            className: 'absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-green-950 rounded-full p-1.5 shadow-lg transition z-20',
            'aria-label': 'Previous image'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { 
                strokeLinecap: 'round', 
                strokeLinejoin: 'round', 
                strokeWidth: '2.5', 
                d: 'M15 19l-7-7 7-7' 
              })
            )
          ),
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); onNext(); },
            className: 'absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-green-950 rounded-full p-1.5 shadow-lg transition z-20',
            'aria-label': 'Next image'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { 
                strokeLinecap: 'round', 
                strokeLinejoin: 'round', 
                strokeWidth: '2.5', 
                d: 'M9 5l7 7-7 7' 
              })
            )
          )
        ),

        // POSTER TOOLS - ALL ON CAROUSEL
        React.createElement('div', { className: 'absolute inset-0 pointer-events-none' },
          
          // Owner tools (top right) - only for owner
          isOwner && React.createElement('div', { className: 'absolute top-2 right-2 flex gap-1 pointer-events-auto z-30' },
            React.createElement('button', {
              onClick: function(e) { e.stopPropagation(); onEdit(); },
              className: 'bg-white/90 hover:bg-white text-blue-600 p-2 rounded-full shadow-lg transition',
              title: 'Edit listing'
            },
              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: '2', 
                  d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' 
                })
              )
            ),
            React.createElement('button', {
              onClick: function(e) { e.stopPropagation(); onDelete(); },
              disabled: isDeleting,
              className: 'bg-white/90 hover:bg-white text-red-500 p-2 rounded-full shadow-lg transition disabled:opacity-50',
              title: 'Delete listing'
            },
              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: '2', 
                  d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' 
                })
              )
            )
          ),

          // Action tools (bottom left) - favorite, message, share
          React.createElement('div', { className: 'absolute bottom-3 left-3 flex gap-2 pointer-events-auto z-30' },
            
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
          ),

          // Image indicators (bottom center)
          hasImages && images.length > 1 &&
          React.createElement('div', { 
            className: 'absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-auto z-20' 
          },
            images.map(function(_, i) {
              return React.createElement('button', {
                key: i,
                onClick: function() { onImageSelect(i); },
                className: `w-1.5 h-1.5 rounded-full transition ${
                  i === selectedImage ? 'bg-white scale-125' : 'bg-white/50'
                }`
              });
            })
          )
        )
      )
    )
  );
}

window.ImageGallery = ImageGallery;