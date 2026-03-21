// pages/profile/components/ListingsTab.js
function ListingsTab({ listings, user, navigate, onDelete, onEdit, loading, usingIndex }) {
  const activeListings = listings.filter(l => l.status !== 'deleted');
  const deletedListings = listings.filter(l => l.status === 'deleted');
  
  if (loading) {
    return React.createElement('div', { className: 'text-center py-16' },
      React.createElement('div', { className: 'w-8 h-8 rounded-full bg-gray-200 animate-pulse' })
    );
  }
  
  if (listings.length === 0) {
    return React.createElement('div', { className: 'text-center py-16 bg-white rounded-lg shadow-md' },
      React.createElement('p', { className: 'text-gray-500 mb-4' }, "You haven't posted any listings yet."),
      React.createElement('button', {
        onClick: () => {
          if (window.__openAuthModal) window.__openAuthModal('post', {});
        },
        className: 'inline-block bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
      }, 'Post Your First Listing')
    );
  }
  
  return React.createElement('div', null,
    
    activeListings.length > 0 &&
    React.createElement('div', { className: 'mb-8' },
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-700' }, 'Active Listings'),
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
        activeListings.map(listing =>
          React.createElement(ListingCard, {
            key: listing.id,
            listing: listing,
            currentUserId: user.uid,
            onClick: () => navigate('/listing/' + listing.id),
            onDelete: onDelete,
            onEdit: onEdit
          })
        )
      )
    ),
    
    deletedListings.length > 0 &&
    React.createElement('div', null,
      React.createElement('h3', { className: 'text-lg font-semibold mb-4 text-gray-500' }, 'Removed Listings'),
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
        deletedListings.map(listing =>
          React.createElement(ListingCard, {
            key: listing.id,
            listing: listing,
            currentUserId: user.uid,
            onDelete: onDelete
          })
        )
      )
    )
  );
}

window.ListingsTab = ListingsTab;