// components/DetailRightPanel.js - Tabbed panel with comments + similar

function DetailRightPanel({ 
  listingId,
  comments,
  commentsLoading,
  hasMoreComments,
  onLoadMoreComments,
  similarListings,
  similarLoading,
  similarHasMore,
  onLoadMoreSimilar,
  onListingClick,
  currentUserId,
  formatTime,
  onProfileClick,
  onToggleHelpful
}) {
  const [activeTab, setActiveTab] = React.useState('comments'); // 'comments' or 'similar'
  const [showAllComments, setShowAllComments] = React.useState(false);
  
  // Show first 20 comments or all if "see more" clicked
  const displayComments = showAllComments ? comments : comments.slice(0, 20);
  const hasMoreToShow = comments.length > 20 && !showAllComments;

  return React.createElement('div', { className: 'bg-white rounded-lg shadow-md overflow-hidden' },
    
    // Tabs (like profile page)
    React.createElement('div', { className: 'flex border-b border-gray-200' },
      React.createElement('button', {
        onClick: () => setActiveTab('comments'),
        className: `flex-1 py-3 text-sm font-medium transition ${
          activeTab === 'comments'
            ? 'text-green-950 border-b-2 border-green-950'
            : 'text-gray-500 hover:text-gray-700'
        }`
      }, `Comments (${comments.length})`),
      
      React.createElement('button', {
        onClick: () => setActiveTab('similar'),
        className: `flex-1 py-3 text-sm font-medium transition ${
          activeTab === 'similar'
            ? 'text-green-950 border-b-2 border-green-950'
            : 'text-gray-500 hover:text-gray-700'
        }`
      }, 'Similar Listings')
    ),

    // Tab content
    React.createElement('div', { className: 'p-4 max-h-[600px] overflow-y-auto' },
      
      // COMMENTS TAB
      activeTab === 'comments' && React.createElement('div', null,
        
        // Comments list
        displayComments.length > 0
          ? React.createElement('div', { className: 'space-y-4 mb-4' },
              displayComments.map(comment =>
                React.createElement(CommentItem, {
                  key: comment.id,
                  comment: comment,
                  currentUserId: currentUserId,
                  onProfileClick: onProfileClick,
                  formatTime: formatTime,
                  onToggleHelpful: onToggleHelpful
                })
              )
            )
          : !commentsLoading && React.createElement('p', { className: 'text-center text-gray-500 py-8' },
              'No comments yet'
            ),

        // "See More Comments" button
        hasMoreToShow && React.createElement('button', {
          onClick: () => setShowAllComments(true),
          className: 'w-full text-center text-green-950 text-sm py-2 hover:underline mb-6'
        }, `See all ${comments.length} comments →`),

        // Load more comments button (for pagination)
        hasMoreComments && !showAllComments && React.createElement('button', {
          onClick: onLoadMoreComments,
          disabled: commentsLoading,
          className: 'w-full text-center text-green-950 text-sm py-2 hover:underline mb-6'
        }, commentsLoading ? 'Loading...' : 'Load more comments'),

        // Separator before similar listings
        React.createElement('div', { className: 'relative my-6' },
          React.createElement('div', { className: 'absolute inset-0 flex items-center' },
            React.createElement('div', { className: 'w-full border-t border-gray-200' })
          ),
          React.createElement('div', { className: 'relative flex justify-center text-xs' },
            React.createElement('span', { className: 'px-2 bg-white text-gray-400' }, 'Similar Listings')
          )
        ),

        // Similar listings (always show in comments tab after comments)
        React.createElement(SimilarListings, {
          listings: similarListings,
          loading: similarLoading,
          hasMore: similarHasMore,
          onLoadMore: onLoadMoreSimilar,
          onListingClick: onListingClick,
          gridCols: 'grid-cols-2',
          cardSizes: { image: 'h-28', title: 'text-xs', price: 'text-xs', address: 'text-[10px]' }
        })
      ),

      // SIMILAR TAB (only similar listings)
      activeTab === 'similar' && React.createElement(SimilarListings, {
        listings: similarListings,
        loading: similarLoading,
        hasMore: similarHasMore,
        onLoadMore: onLoadMoreSimilar,
        onListingClick: onListingClick,
        gridCols: 'grid-cols-2',
        cardSizes: { image: 'h-28', title: 'text-xs', price: 'text-xs', address: 'text-[10px]' }
      })
    )
  );
}

window.DetailRightPanel = DetailRightPanel;