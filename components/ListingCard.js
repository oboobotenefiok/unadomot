// components/ListingCard.js - Fixed price tag always visible + email verification for chat
function ListingCard({ listing, onClick, currentUserId, onFavoriteToggle, onDelete, onEdit, onMessageClick }) {
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [checkingFavorite, setCheckingFavorite] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  
  const { openModal } = window.useAuthModal();
  
  // ===== USE VERIFICATION =====
  const { checkVerification } = window.useVerification?.() || {
    checkVerification: () => true
  };
  
  const isOwner = currentUserId === listing.userId;
  const isDeleted = listing.status === 'deleted';
  
  const imagePublicId = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  
  // ===== GET USERNAME FOR PROFILE LINK =====
  const profileUrl = listing.userUsername 
    ? '/' + listing.userUsername 
    : (listing.userId ? '/profile/' + listing.userId : '#');
  
  React.useEffect(function() {
    if (!currentUserId || isDeleted) return;
    
    let isMounted = true;
    setCheckingFavorite(true);
    
    if (window.AppCache) {
      const cached = AppCache.get('favorites', `${currentUserId}_${listing.id}`);
      if (cached !== null) {
        setIsFavorite(cached);
        setCheckingFavorite(false);
        return;
      }
    }
    
    FavoritesHelpers.checkIsFavorite(currentUserId, listing.id)
      .then(function(favStatus) {
        if (isMounted) {
          setIsFavorite(favStatus);
        }
      })
      .catch(console.error)
      .finally(function() {
        if (isMounted) {
          setCheckingFavorite(false);
        }
      });
    
    return () => { isMounted = false; };
  }, [currentUserId, listing.id, isDeleted]);
  
  const showToastMessage = (message, isError = false) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  const handleFavoriteClick = async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) {
      openModal('login', window.location.pathname);
      return;
    }
    
    if (isDeleted) {
      showToastMessage('This listing is no longer available', true);
      return;
    }
    
    const previousState = isFavorite;
    setIsFavorite(!previousState);
    setCheckingFavorite(true);
    
    try {
      const newStatus = await FavoritesHelpers.toggleFavorite(
        currentUserId,
        listing.id,
        (success) => {
          if (!success) {
            setIsFavorite(previousState);
          }
        }
      );
      
      setIsFavorite(newStatus);
      
      if (window.AppCache) {
        AppCache.set('favorites', `${currentUserId}_${listing.id}`, newStatus);
      }
      
      if (onFavoriteToggle) {
        onFavoriteToggle(listing.id, newStatus);
      }
      
      showToastMessage(
        newStatus ? '✓ Saved to favorites' : '✓ Removed from favorites'
      );
      
    } catch (error) {
      setIsFavorite(previousState);
      showToastMessage('Failed to save. Please try again.', true);
    } finally {
      setCheckingFavorite(false);
    }
  };
  
  const handleEditClick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) {
      openModal('login', window.location.pathname);
      return;
    }
    
    openModal('post', { listingId: listing.id });
  };
  
  // Handle delete click - opens modal instead of confirm
  const handleDeleteClick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isOwner || isDeleted) return;
    
    setShowDeleteModal(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async function() {
    setIsDeleting(true);
    try {
      await onDelete(listing.id);
      setShowDeleteModal(false);
      showToastMessage('Listing deleted successfully');
    } catch (error) {
      showToastMessage('Failed to delete listing', true);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // ===== UPDATED: Use centralized verification check =====
  const handleMessageClick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) {
      openModal('login', window.location.pathname);
      return;
    }
    
    // Use centralized verification check
    if (!checkVerification(auth.currentUser, 'send messages')) {
      return;
    }
    
    if (currentUserId === listing.userId) {
      showToastMessage('You cannot message yourself', 'error');
      return;
    }
    
    if (onMessageClick) {
      onMessageClick(listing.userId, listing.id, e);
    }
  };
  
  const cardClasses = `bg-white rounded-lg shadow-md overflow-hidden transition relative flex flex-col h-full ${
    isDeleted 
      ? 'opacity-60 grayscale cursor-not-allowed' 
      : 'hover:shadow-lg cursor-pointer'
  }`;
  
  const handleCardClick = isDeleted ? undefined : onClick;
  
  return React.createElement(React.Fragment, null,
    
    showToast && React.createElement('div', {
      className: 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up'
    }, toastMessage),
    
    // Delete confirmation modal
    showDeleteModal && window.DeleteConfirmationModal &&
    React.createElement(window.DeleteConfirmationModal, {
      isOpen: showDeleteModal,
      onClose: function() { setShowDeleteModal(false); },
      onConfirm: handleConfirmDelete,
      listingTitle: listing.title,
      isDeleting: isDeleting
    }),
    
    React.createElement('div', {
        onClick: handleCardClick,
        className: cardClasses
      },
      
      React.createElement('div', { className: 'h-40 bg-gray-200 flex items-center justify-center flex-shrink-0 relative overflow-hidden' },
        imagePublicId ?
        React.createElement('img', {
          src: window.CloudinaryHelpers.getCardUrl(imagePublicId),
          alt: '',
          'aria-hidden': !imgLoaded,
          loading: 'lazy',
          decoding: 'async',
          className: 'w-full h-full object-cover transition-opacity duration-200 ' + (imgLoaded ? 'opacity-100' : 'opacity-0'),
          onLoad: () => setImgLoaded(true),
          onError: (e) => {
            e.target.src = '/vault/img/no-image.jpg';
            setImgLoaded(true);
          }
        }) :
        React.createElement('span', { className: 'text-gray-400', 'aria-hidden': 'true' }, 'No image'),
        
        // ===== FIXED: Price tag always visible, not on hover =====
        React.createElement('div', {
            className: 'absolute bottom-2 left-2 bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20'
          },
          '₦' + (listing.price ? listing.price.toLocaleString() : '0')
        ),
        
        isDeleted && React.createElement('div', {
            className: 'absolute inset-0 bg-black/50 flex items-center justify-center'
          },
          React.createElement('span', {
            className: 'bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold'
          }, 'Removed')
        )
      ),
      
      React.createElement('div', { className: 'p-3 flex-1' },
        React.createElement('h3', {
          className: `font-bold text-base mb-1 line-clamp-1 ${isDeleted ? 'line-through text-gray-500' : ''}`
        }, listing.title),
        
        React.createElement('p', { className: 'text-gray-600 text-xs mb-2 line-clamp-1' },
          isDeleted ? 'Listing removed by owner' : listing.address
        ),
        
        // ===== UPDATED: Role badge using listingRole =====
        !isDeleted && React.createElement('div', { className: 'flex items-center gap-1 mb-2' },
          listing.listingRole && listing.listingRole !== 'user' &&
          React.createElement(RoleBadge, {
            user: { userType: listing.listingRole },
            size: 'xs'
          })
        ),
        
        React.createElement('div', { className: 'flex flex-wrap gap-1 mb-2' },
          listing.propertyType && React.createElement('span', {
            className: 'text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'
          }, listing.propertyType),
          isDeleted && React.createElement('span', {
            className: 'text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded'
          }, 'Removed')
        ),
        
        React.createElement('div', { className: 'flex items-center justify-between mt-2 pt-2 border-t border-gray-100' },
          React.createElement('div', { className: 'flex items-center gap-2' },
            (isOwner && !isDeleted) && React.createElement('div', { className: 'flex items-center gap-1' },
              React.createElement('button', {
                  onClick: handleEditClick,
                  className: 'flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-medium py-1 px-2 rounded hover:bg-blue-50 transition'
                },
                React.createElement('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })
                )
              ),
              React.createElement('button', {
                  onClick: handleDeleteClick,
                  disabled: isDeleting,
                  className: 'flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium py-1 px-2 rounded hover:bg-red-50 transition disabled:opacity-50'
                },
                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                ),
                isDeleting ? '...' : ''
              )
            ),
            
            // ===== UPDATED: Message button with centralized verification =====
            !isOwner && !isDeleted && currentUserId && React.createElement('button', {
                onClick: handleMessageClick,
                className: 'flex items-center gap-1 text-gray-500 hover:text-green-950 text-xs font-medium py-1 px-2 rounded hover:bg-gray-100 transition',
                title: 'Send message'
              },
              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' })
              )
            )
          ),
          
          React.createElement('button', {
              onClick: handleFavoriteClick,
              disabled: checkingFavorite || (isDeleted && !isFavorite),
              className: `flex items-center gap-1 text-xs font-medium py-1 px-2 rounded transition transform active:scale-95 ${
                isFavorite 
                  ? 'text-red-500 hover:text-red-700' 
                  : isDeleted 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:text-gray-700'
              } ${checkingFavorite ? 'opacity-50 cursor-wait' : ''}`
            },
            isFavorite ?
            React.createElement('svg', {
                className: `w-4 h-4 transition-transform ${checkingFavorite ? 'animate-pulse' : ''}`,
                fill: 'currentColor',
                viewBox: '0 0 20 20'
              },
              React.createElement('path', { fillRule: 'evenodd', d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z', clipRule: 'evenodd' })
            ) :
            React.createElement('svg', {
                className: `w-4 h-4 transition-transform ${checkingFavorite ? 'animate-pulse' : ''}`,
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
            ),
            checkingFavorite ? '...' : (isFavorite ? '' : '')
          )
        )
      )
    )
  );
}

window.ListingCard = ListingCard;