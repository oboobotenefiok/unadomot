// pages/home/components/Carousel.js - Full width on all devices
function Carousel({ 
  listings, 
  currentIndex,
  loading,
  onSlideChange,
  onPrev,
  onNext,
  touchHandlers,
  user,
  favorites,
  checkingFavorites,
  onToggleFavorite,
  onStartChat,
  onShare,
  onEdit,
  onDelete,
  onNavigate,
  cardSizes,
  headingSize
}) {
  if (loading) {
    return React.createElement('div', { className: 'px-0 py-4' },
      React.createElement('div', { className: 'h-6 w-40 bg-gray-200 rounded animate-pulse mb-3 ml-4' }),
      React.createElement('div', { className: 'relative w-full overflow-hidden shadow-lg animate-pulse' },
        React.createElement('div', { className: 'aspect-[16/9] bg-gray-200 w-full' })
      )
    );
  }

  if (!listings.length || !listings[currentIndex]) return null;

  const currentListing = listings[currentIndex];
  const isOwner = user && user.uid === currentListing.userId;

  return React.createElement('div', { className: 'w-full px-0 py-4' },
    React.createElement('h2', { className: 'font-bold text-gray-900 mb-3 px-0 ' + headingSize }, 'Welcome Home 💚'),
    
    React.createElement('div', {
      className: 'relative w-full overflow-hidden shadow-lg touch-pan-y',
      onTouchStart: touchHandlers.onTouchStart,
      onTouchMove: touchHandlers.onTouchMove,
      onTouchEnd: touchHandlers.onTouchEnd
    },
      React.createElement('div', {
        className: 'relative aspect-[16/9] bg-gray-200 w-full cursor-pointer',
        onClick: function() { 
          AffinityHelpers.saveAffinity(currentListing); 
          onNavigate('/listing/' + currentListing.id); 
        }
      },
        React.createElement('img', {
          src: currentListing.images?.[0]
            ? window.CloudinaryHelpers.getCarouselUrl(currentListing.images[0])
            : '/vault/img/no-image.jpg',
          alt: currentListing.title,
          className: 'w-full h-full object-cover',
          loading: 'eager',
          onError: function(e) { e.target.src = '/vault/img/no-image.jpg'; }
        }),
        
        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' }),
        
        React.createElement('div', { className: 'absolute bottom-0 left-0 right-0 p-4 text-white' },
          React.createElement('h3', { className: 'font-bold mb-1 line-clamp-1 ' + cardSizes.title }, currentListing.title),
          React.createElement('p', { className: 'opacity-90 mb-1 ' + cardSizes.price }, 
            '₦' + (currentListing.price?.toLocaleString() || '0') + '/month'
          ),
          React.createElement('p', { className: 'opacity-75 line-clamp-1 ' + cardSizes.address }, currentListing.address)
        ),
        
        // Navigation arrows (visible on desktop only)
        React.createElement('button', { 
          onClick: function(e) { e.stopPropagation(); onPrev(); }, 
          className: 'absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition backdrop-blur-sm hidden md:block' 
        },
          React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M15 19l-7-7 7-7' })
          )
        ),
        React.createElement('button', { 
          onClick: function(e) { e.stopPropagation(); onNext(); }, 
          className: 'absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition backdrop-blur-sm hidden md:block' 
        },
          React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 5l7 7-7 7' })
          )
        ),
        
        // Owner controls
        isOwner && React.createElement('div', { className: 'absolute top-2 right-2 flex gap-1 z-10' },
          React.createElement('button', { 
            onClick: function(e) { e.stopPropagation(); onEdit(currentListing.id); }, 
            className: 'bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition', 
            title: 'Edit' 
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })
            )
          ),
          React.createElement('button', { 
            onClick: function(e) { e.stopPropagation(); onDelete(currentListing.id); }, 
            className: 'bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition', 
            title: 'Delete' 
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
            )
          )
        ),
        
        // Action buttons
        React.createElement('div', { className: 'absolute bottom-2 right-2 flex gap-1 z-10' },
          // Favorite
          React.createElement('button', {
            onClick: function(e) { onToggleFavorite(currentListing.id, e); },
            disabled: checkingFavorites[currentListing.id],
            className: 'p-1 ' + (favorites[currentListing.id] ? 'text-red-500' : 'text-white drop-shadow-lg') + 
                      (checkingFavorites[currentListing.id] ? ' opacity-50 cursor-wait' : '')
          },
            favorites[currentListing.id]
              ? React.createElement('svg', { className: 'w-5 h-5', fill: 'currentColor', viewBox: '0 0 20 20' }, 
                  React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
                )
              : React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
                )
          ),
          
          // Chat button - UPDATED with verification check
          user && user.uid !== currentListing.userId && React.createElement('button', {
            onClick: function(e) {
              e.stopPropagation();
              
              // ===== USE CENTRALIZED VERIFICATION CHECK =====
              if (!user) {
                window.__openAuthModal?.('login', window.location.pathname);
                return;
              }
              
              const verificationCheck = window.VerificationHelpers?.checkEmailVerification(user, 'send messages');
              if (!verificationCheck?.allowed) {
                const message = verificationCheck?.message || 'Please verify your email to send messages';
                const toastEvent = new CustomEvent('show-toast', {
                  detail: { message, type: 'warning' }
                });
                window.dispatchEvent(toastEvent);
                return;
              }
              
              onStartChat(currentListing.userId, currentListing.id, e);
            },
            className: 'p-1 text-white drop-shadow-lg hover:text-green-300',
            title: 'Send message'
          },
            React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
            )
          ),
          
          // Share
          React.createElement('button', { 
            onClick: function(e) { onShare(currentListing, e); }, 
            className: 'p-1 text-white drop-shadow-lg hover:text-blue-300' 
          },
            React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, 
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' })
            )
          )
        )
      ),
      
      // Indicators
      React.createElement('div', { className: 'absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10' },
        listings.map(function(_, i) {
          return React.createElement('button', {
            key: i,
            onClick: function() { onSlideChange(i); },
            className: 'w-2 h-2 rounded-full transition ' + (i === currentIndex ? 'bg-white scale-125' : 'bg-white/50')
          });
        })
      )
    )
  );
}

window.Carousel = Carousel;