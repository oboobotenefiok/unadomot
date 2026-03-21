// pages/listing-detail/components/CommentsSection.js - SIMPLIFIED (no replies)
function CommentsSection({
  comments,
  commentsLoading,
  commentsExpanded,
  onToggleExpand,
  currentUserId,
  formatTime,
  onProfileClick
}) {
  const displayComments = commentsExpanded ? comments : comments.slice(0, 5);
  const hasMoreComments = comments.length > 5 && !commentsExpanded;
  
  if (commentsLoading && comments.length === 0) {
    return React.createElement('div', { className: 'space-y-4 py-4' },
      Array.from({ length: 3 }).map(function(_, i) {
        return React.createElement('div', {
            key: i,
            className: 'animate-pulse flex gap-3'
          },
          React.createElement('div', {
            className: 'w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0'
          }),
          React.createElement('div', { className: 'flex-1 space-y-2' },
            React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-1/3' }),
            React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-full' }),
            React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-2/3' })
          )
        );
      })
    );
  }
  
  if (comments.length === 0) {
    return React.createElement('p', { className: 'text-center text-gray-500 py-8' },
      'No comments yet. Be the first to share your thoughts!'
    );
  }
  
  return React.createElement('div', { className: 'space-y-4' },
    displayComments.map(function(comment) {
      return React.createElement(CommentItem, {
        key: comment.id,
        comment: comment,
        currentUserId: currentUserId,
        onProfileClick: onProfileClick,
        formatTime: formatTime
      });
    }),
    
    // "Show more comments" button
    hasMoreComments &&
    React.createElement('button', {
        onClick: onToggleExpand,
        className: 'w-full text-center text-green-950 text-sm py-3 hover:underline flex items-center justify-center gap-1'
      },
      React.createElement('span', null, 'Show ' + (comments.length - 5) + ' more comments'),
      React.createElement('svg', {
          className: 'w-4 h-4',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '2',
          d: 'M19 9l-7 7-7-7'
        })
      )
    )
  );
}

window.CommentsSection = CommentsSection;