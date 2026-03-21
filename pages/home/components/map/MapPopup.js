// pages/home/components/map/MapPopup.js - DIRECT DATABASE DELETE

window.createPopupContent = function(
  listings,
  initialIndex,
  user,
  favorites,
  onStartChat,
  onShare,
  onListingSelect,
  onToggleFavorite,
  onEdit,
  onDelete, // Keep for backward compatibility but won't use
  onClose,
  onPrevListing,
  onNextListing
) {
  const popupDiv = document.createElement('div');
  popupDiv.className = 'relative p-0 min-w-[200px] max-w-[230px] bg-white rounded-lg overflow-hidden shadow-lg';
  
  const currentListing = listings[initialIndex];
  const isOwner = user && user.uid === currentListing.userId;
  const isFav = favorites?.[currentListing.id] || false;
  const listingImages = currentListing.images || [];
  const hasMultipleImages = listingImages.length > 1;
  
  // Image container
  const imageContainer = document.createElement('div');
  imageContainer.className = 'relative h-40 bg-gray-200 overflow-hidden';
  imageContainer.style.height = '160px';
  
  let currentImageIndex = 0;
  
  if (listingImages.length > 0) {
    const img = document.createElement('img');
    img.className = 'w-full h-full object-cover';
    img.src = window.getListingImageUrl(currentListing, currentImageIndex);
    img.alt = currentListing.title || 'Property';
    img.loading = 'lazy';
    
    img.onerror = function() {
      this.src = '/vault/img/no-image.jpg';
    };
    
    imageContainer.appendChild(img);
    
    // ===== IMAGE NAVIGATION CONTROLS =====
    if (hasMultipleImages) {
      const imageCounter = document.createElement('div');
      imageCounter.className = 'absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full z-20';
      imageCounter.innerText = `📸 ${currentImageIndex + 1}/${listingImages.length}`;
      imageContainer.appendChild(imageCounter);
      
      const prevImageBtn = document.createElement('button');
      prevImageBtn.className = 'absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md transition hover:scale-110';
      prevImageBtn.innerHTML = '<svg class="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>';
      
      const nextImageBtn = document.createElement('button');
      nextImageBtn.className = 'absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md transition hover:scale-110';
      nextImageBtn.innerHTML = '<svg class="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>';
      
      imageContainer.appendChild(prevImageBtn);
      imageContainer.appendChild(nextImageBtn);
      
      prevImageBtn.onclick = (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + listingImages.length) % listingImages.length;
        img.src = window.getListingImageUrl(currentListing, currentImageIndex);
        imageCounter.innerText = `📸 ${currentImageIndex + 1}/${listingImages.length}`;
      };
      
      nextImageBtn.onclick = (e) => {
        e.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % listingImages.length;
        img.src = window.getListingImageUrl(currentListing, currentImageIndex);
        imageCounter.innerText = `📸 ${currentImageIndex + 1}/${listingImages.length}`;
      };
    }
    
    // Price tag
    const priceTag = document.createElement('div');
    priceTag.className = 'absolute bottom-2 left-2 bg-green-950 text-white px-2 py-1 rounded-md font-bold text-sm shadow-lg z-20';
    priceTag.innerText = '₦' + (currentListing.price ? currentListing.price.toLocaleString() : '0');
    imageContainer.appendChild(priceTag);
    
  } else {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'w-full h-full flex items-center justify-center text-gray-400';
    fallbackDiv.innerHTML = 'No image';
    imageContainer.appendChild(fallbackDiv);
  }
  
  // Build popup HTML structure
  popupDiv.innerHTML = `
    <div class="relative">
      <!-- Close button -->
      <button class="popup-close absolute top-1 right-1 z-30 bg-white/90 hover:bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transition hover:scale-110" title="Close">
        <svg class="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <!-- Region counter -->
      <div class="absolute top-1 left-1/2 -translate-x-1/2 z-30 bg-green-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
        ${initialIndex + 1}/${listings.length}
      </div>
    </div>
  `;
  
  const mainContainer = popupDiv.querySelector('.relative');
  mainContainer.insertBefore(imageContainer, mainContainer.firstChild);
  
  // ===== OWNER CONTROLS - AT BOTTOM RIGHT OF IMAGE =====
  if (isOwner) {
    const ownerControls = document.createElement('div');
    ownerControls.className = 'absolute bottom-1 right-1 flex gap-1 z-30';
    ownerControls.innerHTML = `
      <button class="edit-btn bg-blue-600 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-700 transition" title="Edit listing">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button class="delete-btn bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition" title="Delete listing">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;
    imageContainer.appendChild(ownerControls);
  }
  
  // Format location: LGA, State
  const locationParts = [];
  if (currentListing.lga) locationParts.push(currentListing.lga);
  if (currentListing.state) locationParts.push(currentListing.state);
  const locationText = locationParts.join(', ') || '';
  
  // ===== ROLE BADGE HTML (will be conditionally added) =====
  const userType = currentListing.userType || 'user';
  const roleBadgeHtml = (userType && userType !== 'user') 
    ? `<div class="mb-1">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
          userType === 'landlord' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-gray-700 text-white border border-gray-800'
        }">
          ${userType === 'landlord' ? 'Landlord' : 'Agent'}
        </span>
      </div>`
    : '';
  
  // Content section
  const contentDiv = document.createElement('div');
  contentDiv.className = 'p-2';
  contentDiv.innerHTML = `
    <h3 class="font-bold text-gray-900 text-sm mb-0.5 line-clamp-1">${currentListing.title || 'Property'}</h3>
    <p class="text-gray-600 text-xs mb-1 line-clamp-1">${locationText}</p>
    
    ${roleBadgeHtml}
    
    <div class="flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
      <div class="flex gap-1">
        ${user && user.uid !== currentListing.userId ? `
          <button class="chat-btn text-gray-500 hover:text-green-950 p-1 rounded hover:bg-gray-100 transition" 
                  data-id="${currentListing.id}" data-user="${currentListing.userId}" title="Send message">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        ` : ''}
        
        <button class="share-btn text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-100 transition" 
                data-id="${currentListing.id}" title="Share">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
      
      <div class="flex items-center gap-1">
        <button class="fav-btn p-1 rounded hover:bg-gray-100 transition ${isFav ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}" 
                data-id="${currentListing.id}" title="${isFav ? 'Remove from favorites' : 'Save to favorites'}">
          <svg class="w-4 h-4" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        <button class="view-details-btn bg-green-950 text-white text-xs px-2 py-1 rounded hover:bg-green-800 transition font-medium" 
                data-id="${currentListing.id}">
          View
        </button>
      </div>
    </div>
    
    <!-- Property navigation controls -->
    <div class="flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
      <button class="popup-prev-listing flex items-center gap-1 text-[10px] text-gray-600 hover:text-green-950 transition ${listings.length === 1 ? 'opacity-30 pointer-events-none' : ''}">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Prev</span>
      </button>
      
      <span class="text-[9px] text-gray-400">${initialIndex + 1} of ${listings.length}</span>
      
      <button class="popup-next-listing flex items-center gap-1 text-[10px] text-gray-600 hover:text-green-950 transition ${listings.length === 1 ? 'opacity-30 pointer-events-none' : ''}">
        <span>Next</span>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `;
  
  mainContainer.appendChild(contentDiv);
  
  // ===== FUNCTION TO SHOW DELETE MODAL =====
  const showDeleteModal = () => {
    // Close the popup first
    if (onClose) onClose();
    
    // Check if DeleteConfirmationModal exists
    if (!window.DeleteConfirmationModal) {
      console.error('DeleteConfirmationModal not available');
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Delete system unavailable', type: 'error' }
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    // Create container for modal
    const deleteModalContainer = document.createElement('div');
    deleteModalContainer.id = 'map-delete-modal-container';
    document.body.appendChild(deleteModalContainer);
    
    // Render DeleteConfirmationModal
    if (window.ReactDOM) {
      window.ReactDOM.render(
        window.React.createElement(window.DeleteConfirmationModal, {
          isOpen: true,
          onClose: () => {
            window.ReactDOM.unmountComponentAtNode(deleteModalContainer);
            document.body.removeChild(deleteModalContainer);
          },
          onConfirm: async () => {
            try {
              // DIRECT DATABASE DELETE - No prop drilling!
              await db.collection('listings').doc(currentListing.id).update({
                status: 'deleted',
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              
              // Show success toast
              const toastEvent = new CustomEvent('show-toast', {
                detail: { message: 'Listing deleted successfully', type: 'success' }
              });
              window.dispatchEvent(toastEvent);
              
              // Close modal
              window.ReactDOM.unmountComponentAtNode(deleteModalContainer);
              document.body.removeChild(deleteModalContainer);
              
              // Refresh listings if needed
              if (window.__homePageState?.refreshListings) {
                window.__homePageState.refreshListings();
              }
              
            } catch (error) {
              console.error('Delete error:', error);
              const toastEvent = new CustomEvent('show-toast', {
                detail: { message: 'Failed to delete listing', type: 'error' }
              });
              window.dispatchEvent(toastEvent);
            }
          },
          listingTitle: currentListing.title,
          isDeleting: false
        }),
        deleteModalContainer
      );
    }
  };
  
  // ===== EVENT LISTENERS =====
  let reportModalContainer = null;
  
  const openReportModal = () => {
    if (onClose) onClose();
    
    if (!window.ReportModal) {
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Reporting system unavailable', type: 'error' }
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    if (!reportModalContainer) {
      reportModalContainer = document.createElement('div');
      reportModalContainer.id = 'map-report-modal-container';
      document.body.appendChild(reportModalContainer);
    }
    
    if (window.ReactDOM) {
      window.ReactDOM.render(
        window.React.createElement(window.ReportModal, {
          targetId: currentListing.id,
          targetType: 'listing',
          reportedBy: user ? user.uid : null,
          onClose: () => {
            if (reportModalContainer) {
              window.ReactDOM.unmountComponentAtNode(reportModalContainer);
              document.body.removeChild(reportModalContainer);
              reportModalContainer = null;
            }
            const toastEvent = new CustomEvent('show-toast', {
              detail: { message: 'Report submitted. Thank you!', type: 'success' }
            });
            window.dispatchEvent(toastEvent);
          }
        }),
        reportModalContainer
      );
    }
  };
  
  const unsubscribe = window.FavoritesHelpers?.subscribeToFavorites((newFavorites) => {
    const newIsFav = newFavorites[currentListing.id] || false;
    const favBtn = popupDiv.querySelector('.fav-btn');
    const currentIsFav = favBtn?.classList.contains('text-red-500') || false;
    
    if (favBtn && newIsFav !== currentIsFav) {
      const svg = favBtn.querySelector('svg');
      
      if (newIsFav) {
        favBtn.classList.add('text-red-500');
        favBtn.classList.remove('text-gray-500');
        if (svg) svg.setAttribute('fill', 'currentColor');
        favBtn.title = 'Remove from favorites';
      } else {
        favBtn.classList.remove('text-red-500');
        favBtn.classList.add('text-gray-500');
        if (svg) svg.setAttribute('fill', 'none');
        favBtn.title = 'Save to favorites';
      }
    }
  });
  
  // Close button
  popupDiv.querySelector('.popup-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (unsubscribe) unsubscribe();
    if (onClose) onClose();
  });
  
  // Navigation between different listings
  popupDiv.querySelector('.popup-prev-listing')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onPrevListing) onPrevListing();
  });
  
  popupDiv.querySelector('.popup-next-listing')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onNextListing) onNextListing();
  });
  
  // Chat button - ONLY FOR NON-OWNERS
  popupDiv.querySelector('.chat-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      window.__openAuthModal?.('login', window.location.pathname);
      return;
    }
    
    const verificationCheck = window.VerificationHelpers?.checkEmailVerification(currentUser, 'send messages');
    if (!verificationCheck?.allowed) {
      const message = verificationCheck?.message || 'Please verify your email';
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message, type: 'warning' }
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    onStartChat?.(currentListing.userId, currentListing.id, { stopPropagation: () => {} });
  });
  
  // Share button
  popupDiv.querySelector('.share-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onShare?.(currentListing, { stopPropagation: () => {} });
  });
  
  // View details button
  popupDiv.querySelector('.view-details-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onListingSelect(currentListing.id);
    if (onClose) onClose();
  });
  
  // Favorite button
  popupDiv.querySelector('.fav-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const btn = e.currentTarget;
    const listingId = btn.dataset.id;
    
    if (!listingId) return;
    
    if (window.FavoritesHelpers?.toggleFavoriteFromPopup) {
      await window.FavoritesHelpers.toggleFavoriteFromPopup(listingId, btn);
    }
  });
  
  // Edit button - ONLY FOR OWNERS
  popupDiv.querySelector('.edit-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.__openAuthModal) {
      window.__openAuthModal('post', { listingId: currentListing.id });
    }
    if (onClose) onClose();
  });
  
  // Delete button - DIRECT DATABASE DELETE
  popupDiv.querySelector('.delete-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showDeleteModal();
  });
  
  popupDiv.addEventListener('click', (e) => e.stopPropagation());
  
  return popupDiv;
};