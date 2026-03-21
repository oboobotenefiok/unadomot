// components/DeleteConfirmationModal.js
// Custom delete confirmation modal - replaces browser confirm()

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, listingTitle, isDeleting }) {
  if (!isOpen) return null;
  
  const handleBackdropClick = function(e) {
    if (e.target === e.currentTarget) onClose();
  };
  
  return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: handleBackdropClick
    },
    React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden',
        onClick: function(e) { e.stopPropagation(); }
      },

      // Content
      React.createElement('div', { className: 'p-4' },
        React.createElement('p', { className: 'text-gray-700 mb-2' },
          'Are you sure you want to delete ',
          React.createElement('span', { className: 'font-bold' }, listingTitle || 'this listing'),
          '?'
        ),
        React.createElement('p', { className: 'text-sm text-gray-500 bg-gray-50 p-3 rounded-lg' },
          'The listing will be removed but will remain in your history.'
        )
      ),
      
      // Footer buttons
      React.createElement('div', { className: 'flex gap-2 p-4 border-t border-gray-200 bg-gray-50' },
        React.createElement('button', {
          onClick: onClose,
          disabled: isDeleting,
          className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-medium'
        }, 'Cancel'),
        
        React.createElement('button', {
            onClick: onConfirm,
            disabled: isDeleting,
            className: 'flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1'
          },
          isDeleting ?
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' }),
            React.createElement('span', null, 'Deleting...')
          ) :
          React.createElement('span', null, 'Delete')
        )
      )
    )
  );
}

// Make globally available
window.DeleteConfirmationModal = DeleteConfirmationModal;