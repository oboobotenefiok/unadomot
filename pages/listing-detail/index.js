// pages/listing-detail/index.js - With Pending/Rejected status handling
function ListingDetailPage({ user, navigate, locationState }) {
  const listingId = window.location.pathname.split('/')[2];
  const { openModal } = window.useAuthModal();

  // ===== DELETE MODAL STATE =====
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // ===== TAB STATE (like profile page) =====
  const [activeTab, setActiveTab] = React.useState('similar'); // 'similar' or 'comments'
  const [showAllComments, setShowAllComments] = React.useState(false);

  // Hooks
  const listingHook = window.useListing(listingId, user);
  const galleryHook = window.useImageGallery(listingHook.listing?.images);
  const commentsHook = window.useComments(listingId, user);
  
  // ===== Similar listings hook =====
  const [allListings, setAllListings] = React.useState([]);
  const similarHook = window.useSimilarListings?.(listingHook.listing, allListings) || {
    similarListings: [],
    loading: false,
    hasMore: false,
    loadMore: () => {}
  };

  // Destructure
  const {
    listing,
    listingUser,
    loading,
    isFavorite,
    checkingFavorite,
    deleteListing
  } = listingHook;

  const {
    selectedImage,
    showLightbox,
    nextImage,
    prevImage,
    openLightbox,
    closeLightbox,
    touchHandlers
  } = galleryHook;

  const {
    comments,
    commentsLoading,
    newComment,
    submittingComment,
    handleSubmitComment,
    setNewComment,
    loadMoreComments,
    hasMoreComments
  } = commentsHook;

  // ===== LOAD ALL LISTINGS FOR SIMILAR ALGORITHM =====
  React.useEffect(() => {
    const fetchAllListings = async () => {
      try {
        const result = await FirestoreQueries.query({
          collection: 'listings',
          where: [['status', '==', 'available']],
          limit: 100
        });
        setAllListings(result.data);
      } catch (err) {
        
      }
    };
    fetchAllListings();
  }, []);

  // ===== HANDLE BACK NAVIGATION =====
  const handleBack = React.useCallback(() => {
    if (locationState?.from === 'home') {
      navigate('/', {
        ...locationState,
        returning: true
      });
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('/');
      }
    }
  }, [navigate, locationState]);

  // Handlers
  const handleEditClick = React.useCallback(() => {
    openModal('post', { listingId: listing.id });
  }, [listing, openModal]);

  // ===== DELETE CLICK OPENS MODAL =====
  const handleDeleteClick = React.useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  // ===== CONFIRM DELETE HANDLER =====
  const handleConfirmDelete = React.useCallback(async () => {
    setIsDeleting(true);
    const success = await deleteListing();
    setIsDeleting(false);
    setShowDeleteModal(false);
    
    if (success) {
      if (locationState?.from === 'home') {
        navigate('/', locationState);
      } else {
        navigate('/listings');
      }
    }
  }, [deleteListing, navigate, locationState]);

// pages/listing-detail/index.js - FIND THE handleMessageClick FUNCTION

const handleMessageClick = React.useCallback(async () => {
  if (!user) {
    openModal('login', window.location.pathname);
    return;
  }
  
  // ===== ADD EMAIL VERIFICATION CHECK =====
  const verificationCheck = window.checkEmailVerification(user, 'send messages');
  if (!verificationCheck.allowed) {
    // Show toast
    const toastEvent = new CustomEvent('show-toast', {
      detail: { message: verificationCheck.message, type: 'warning' }
    });
    window.dispatchEvent(toastEvent);
    
    // Also show verification reminder
    const reminderEvent = new CustomEvent('show-verification-warning', {
      detail: { message: verificationCheck.message }
    });
    window.dispatchEvent(reminderEvent);
    
    return;
  }
  
  if (!listingUser) return;
  
  try {
    const chatId = await ChatHelpers.getOrCreateListingChat(
      user.uid, listingUser.id, listing.id, 'Is this still available?'
    );
    navigate('/chat?chat=' + chatId);
  } catch (err) {
    
    alert('Failed to start chat. Please try again.');
  }
}, [user, listingUser, listing, navigate, openModal]);
  const handleShareClick = React.useCallback(async () => {
    await ShareHelpers.shareListing(listing, { style: 'naija' });
  }, [listing]);

  const handleProfileClick = React.useCallback((userId) => {
    navigate('/profile/' + userId, {
      from: 'listing-detail',
      returnTo: locationState,
      listingId: listing.id
    });
  }, [navigate, locationState, listing]);

  const handleReportClick = React.useCallback(() => {
    setShowReport(true);
  }, []);

  // ===== SIMILAR LISTING CLICK HANDLER =====
  const handleSimilarListingClick = React.useCallback((similarListing) => {
    window.AffinityHelpers?.saveAffinity(similarListing);
    navigate('/listing/' + similarListing.id, {
      from: 'listing-detail',
      previousListingId: listing?.id
    });
  }, [navigate, listing]);

  const [showReport, setShowReport] = React.useState(false);

  // Display comments (first 20 or all)
  const displayComments = showAllComments ? comments : comments.slice(0, 20);
  const hasMoreToShow = comments.length > 20 && !showAllComments;

  // ===== Helper to get status badge =====
  const getStatusBadge = () => {
    if (!listing) return null;
    
    switch(listing.status) {
      case 'pending_review':
        return React.createElement('div', {
          className: 'inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium ml-2'
        },
          React.createElement('span', { className: 'w-2 h-2 bg-yellow-500 rounded-full animate-pulse' }),
          'Pending Review'
        );
      case 'rejected':
        return React.createElement('div', {
          className: 'inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium ml-2',
          title: listing.rejectionReason || 'Listing was not approved'
        },
          React.createElement('span', null, '✕'),
          'Rejected'
        );
      case 'deleted':
        return React.createElement('div', {
          className: 'inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium ml-2'
        },
          React.createElement('span', null, '🗑️'),
          'Deleted'
        );
      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-white animate-pulse' },
      React.createElement('div', { className: 'w-full aspect-[4/3] bg-gray-200 mx-4 mt-4 rounded-xl' }),
      React.createElement('div', { className: 'p-5 space-y-4' },
        React.createElement('div', { className: 'h-7 bg-gray-200 rounded w-3/4' }),
        React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-1/2' }),
        React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-1/3' })
      )
    );
  }

  // Not found / deleted state
  if (!listing || listing.status === 'deleted') {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center p-4' },
      React.createElement('div', { className: 'text-center max-w-md' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '🏠'),
        React.createElement('h2', { className: 'text-2xl font-bold mb-2' }, 'Listing Not Available'),
        React.createElement('p', { className: 'text-gray-600 mb-6' },
          listing?.status === 'deleted'
            ? 'This listing has been removed.'
            : 'The listing you\'re looking for doesn\'t exist.'
        ),
        React.createElement('button', {
          onClick: handleBack,
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800'
        }, 'Go Back')
      )
    );
  }

  const isOwner = user && user.uid === listing.userId;
  const isPending = listing.status === 'pending_review';
  const isRejected = listing.status === 'rejected';

  // Render
  return React.createElement('div', { className: 'min-h-screen bg-white' },

    // ===== BACK BUTTON ONLY =====
    React.createElement('div', {
      className: 'fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm'
    },
      React.createElement('div', {
        className: 'container mx-auto px-4 py-3'
      },
        React.createElement('div', {
          className: 'flex items-center gap-3'
        },
          React.createElement('button', {
            onClick: handleBack,
            className: 'p-1 text-gray-700 hover:text-green-950 transition group',
            'aria-label': 'Go back'
          },
            React.createElement('svg', {
              className: 'w-5 h-5 group-hover:-translate-x-1 transition-transform',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M15 19l-7-7 7-7'
              })
            )
          ),
          React.createElement('span', {
            className: 'text-gray-300 select-none'
          }, '|'),
          React.createElement('span', {
            className: 'font-medium text-gray-900 truncate'
          }, 'Property Details')
        )
      )
    ),

    // ===== DELETE CONFIRMATION MODAL =====
    showDeleteModal && window.DeleteConfirmationModal && 
      React.createElement(window.DeleteConfirmationModal, {
        isOpen: showDeleteModal,
        onClose: function() { setShowDeleteModal(false); },
        onConfirm: handleConfirmDelete,
        listingTitle: listing?.title,
        isDeleting: isDeleting
      }),

    // Image Gallery
    React.createElement(ImageGallery, {
      images: listing.images,
      selectedImage: selectedImage,
      onImageSelect: galleryHook.setSelectedImage,
      onNext: nextImage,
      onPrev: prevImage,
      onLightboxOpen: openLightbox,
      touchHandlers: touchHandlers,
      isOwner: isOwner,
      onEdit: handleEditClick,
      onDelete: handleDeleteClick,
      isDeleting: isDeleting,
      isFavorite: isFavorite,
      checkingFavorite: checkingFavorite,
      onFavoriteClick: listingHook.toggleFavorite,
      onMessageClick: handleMessageClick,
      onShareClick: handleShareClick
    }),

    // Lightbox
    React.createElement(Lightbox, {
      show: showLightbox,
      image: listing.images?.[selectedImage],
      onClose: closeLightbox,
      onPrev: prevImage,
      onNext: nextImage,
      hasMultiple: listing.images?.length > 1,
      title: listing.title
    }),

    // Main content
    React.createElement('div', { className: 'p-5 pt-20' },

      // Listing Info with Status Badge
      React.createElement('div', { className: 'mb-4' },
        React.createElement('div', { className: 'flex items-center flex-wrap gap-2 mb-1' },
          React.createElement('h1', { className: 'text-2xl font-bold text-gray-900' }, listing.title),
          isOwner && getStatusBadge()
        ),
        
        // ===== PENDING/REJECTED MESSAGES FOR OWNER =====
        isOwner && isPending && React.createElement('div', {
          className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-sm'
        },
          React.createElement('p', { className: 'text-yellow-800 flex items-center gap-2' },
            React.createElement('span', { className: 'w-2 h-2 bg-yellow-500 rounded-full animate-pulse' }),
            'This listing is pending admin review. It will be visible to others once approved.'
          )
        ),
        
        isOwner && isRejected && React.createElement('div', {
          className: 'bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm'
        },
          React.createElement('p', { className: 'text-red-800 font-medium mb-1' },
            'Listing was not approved'
          ),
          React.createElement('p', { className: 'text-red-700 text-xs' },
            listing.rejectionReason || 'No reason provided. Please edit and resubmit.'
          ),
          React.createElement('button', {
            onClick: handleEditClick,
            className: 'mt-2 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200 transition'
          }, 'Edit and Resubmit')
        ),
        
        // Address (always show)
        React.createElement('p', { className: 'text-sm text-gray-500 flex items-center gap-1 mb-2' },
          React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' })
          ),
          [listing.address, listing.lga, listing.state].filter(Boolean).join(', ')
        ),
        
        // Price (always show)
        React.createElement('p', { className: 'text-2xl font-bold text-green-950' },
          '₦' + (listing.price ? listing.price.toLocaleString() : '0') + '/month'
        )
      ),

      // Profile Card (always show)
      React.createElement(ProfileCard, {
        user: listingUser,
        onProfileClick: handleProfileClick
      }),

      // Property Details Grid
      React.createElement('div', { className: 'flex flex-row justify-between gap-3 mb-6' },
        [
          { icon: '🛏️', label: 'Bedrooms', value: listing.bedrooms || '—' },
          { icon: '🚿', label: 'Bathrooms', value: listing.bathrooms || '—' },
          { icon: '📐', label: 'Size', value: listing.size ? listing.size + ' sqm' : '—' },
          { icon: '🪑', label: 'Furnishing', value: listing.furnishing || '—' }
        ].map(function(detail) {
          return React.createElement('div', { key: detail.label, className: 'bg-gray-50 p-3 rounded-lg text-center' },
            React.createElement('span', { className: 'text-2xl mb-1 block' }, detail.icon),
            React.createElement('p', { className: 'text-xs text-gray-500' }, detail.label),
            React.createElement('p', { className: 'font-bold text-sm' }, detail.value)
          );
        })
      ),

      // Badges
      React.createElement('div', { className: 'flex flex-wrap gap-2 mb-6' },
        listing.propertyType &&
        React.createElement('span', { className: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm' },
          listing.propertyType
        )
      ),

      // Description
      React.createElement('div', { className: 'mb-6' },
        React.createElement('h2', { className: 'font-bold text-lg mb-2' }, 'Description'),
        React.createElement('p', { className: 'text-gray-700 whitespace-pre-line leading-relaxed' },
          listing.description || 'No description provided.'
        )
      ),

      // ===== REPORT BUTTON - Only for non-owners of available listings =====
      !isOwner && user && !isPending && !isRejected && listing.status === 'available' && 
        React.createElement('div', { className: 'mb-6 text-center' },
          React.createElement('button', {
            onClick: handleReportClick,
            className: 'text-red-400 hover:text-red-500 text-sm transition flex items-center justify-center gap-1 mx-auto'
          },
            React.createElement('span', null, '🚩'),
            'Report this listing'
          )
        ),

      // Amenities
      listing.amenities && listing.amenities.length > 0 &&
      React.createElement('div', { className: 'mb-6' },
        React.createElement('h2', { className: 'font-bold text-lg mb-3' }, 'Amenities'),
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          listing.amenities.map(function(a, i) {
            return React.createElement('div', { key: i, className: 'flex items-center gap-2 text-sm' },
              React.createElement('span', { className: 'text-green-600' }, '✓'),
              React.createElement('span', null, a)
            );
          })
        )
      ),

      // ===== TABS - Only show for available listings =====
      listing.status === 'available' && React.createElement('div', { className: 'mt-8 pt-6 border-t border-gray-200' },
        
        // Tab headers
        React.createElement('div', { className: 'flex border-b border-gray-200 mb-4' },
          React.createElement('button', {
            onClick: () => setActiveTab('similar'),
            className: `flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'similar'
                ? 'text-green-950 border-b-2 border-green-950'
                : 'text-gray-500 hover:text-gray-700'
            }`
          }, `Similar Listings (${similarHook.similarListings.length})`),
          
          React.createElement('button', {
            onClick: () => setActiveTab('comments'),
            className: `flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'comments'
                ? 'text-green-950 border-b-2 border-green-950'
                : 'text-gray-500 hover:text-gray-700'
            }`
          }, `Comments (${comments.length})`)
        ),

        // Tab content
        activeTab === 'similar' 
          ? // SIMILAR LISTINGS TAB
            React.createElement(SimilarListings, {
              listings: similarHook.similarListings,
              loading: similarHook.loading,
              hasMore: similarHook.hasMore,
              onLoadMore: similarHook.loadMore,
              onListingClick: handleSimilarListingClick,
              gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              cardSizes: { image: 'h-32', title: 'text-xs', price: 'text-xs', address: 'text-[10px]' }
            })
          
          : // COMMENTS TAB
            React.createElement('div', null,
              // Comment form
              React.createElement(CommentForm, {
                user: user,
                value: newComment,
                onChange: (e) => setNewComment(e.target.value),
                onSubmit: handleSubmitComment,
                isSubmitting: submittingComment
              }),

              // Comments list
              displayComments.length > 0
                ? React.createElement('div', { className: 'space-y-4 mt-4 mb-4' },
                    displayComments.map(comment =>
                      React.createElement(CommentItem, {
                        key: comment.id,
                        comment: comment,
                        currentUserId: user?.uid,
                        onProfileClick: handleProfileClick,
                        formatTime: CommentHelpers.formatTime
                      })
                    )
                  )
                : !commentsLoading && React.createElement('p', { className: 'text-center text-gray-500 py-8' },
                    'No comments yet. Be the first to comment!'
                  ),

              // "See More Comments" button
              hasMoreToShow && React.createElement('button', {
                onClick: () => setShowAllComments(true),
                className: 'w-full text-center text-green-950 text-sm py-2 hover:underline mb-6'
              }, `See all ${comments.length} comments →`),

              // Load more comments button (for pagination)
              hasMoreComments && showAllComments && React.createElement('button', {
                onClick: loadMoreComments,
                disabled: commentsLoading,
                className: 'w-full text-center text-green-950 text-sm py-2 hover:underline mb-6'
              }, commentsLoading ? 'Loading...' : 'Load more comments'),

              // Recommendations after comments
              React.createElement('div', { className: 'mt-8 pt-6 border-t border-gray-200' },
                React.createElement('h3', { className: 'font-bold text-md mb-4 flex items-center gap-2' },
                  React.createElement('span', { className: 'w-1 h-5 bg-blue-500 rounded-full' }),
                  'Recommended for you'
                ),
                React.createElement(SimilarListings, {
                  listings: similarHook.similarListings,
                  loading: similarHook.loading,
                  hasMore: similarHook.hasMore,
                  onLoadMore: similarHook.loadMore,
                  onListingClick: handleSimilarListingClick,
                  gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
                  cardSizes: { image: 'h-32', title: 'text-xs', price: 'text-xs', address: 'text-[10px]' }
                })
              )
            )
      )
    ),

    // Report Modal
    showReport && window.ReportModal && React.createElement(window.ReportModal, {
      targetId: listing.id,
      targetType: 'listing',
      reportedBy: user ? user.uid : null,
      onClose: () => setShowReport(false)
    })
  );
}

window.ListingDetailPage = ListingDetailPage;