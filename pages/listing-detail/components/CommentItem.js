// pages/listing-detail/components/CommentItem.js - SIMPLIFIED (uses data directly)
function CommentItem({
  comment,
  currentUserId,
  onProfileClick,
  formatTime
}) {
  if (!comment) return null;
  
  // Data comes directly from the comment document
  const isTemp = comment.isTemp || false;
  const userName = comment.userName || comment.user?.name || 'User';
  const userPhoto = comment.userPhotoURL || comment.user?.photoURL || null;
  const userId = comment.userId;
  const userType = comment.userType || comment.user?.userType || 'user';
  const userUsername = comment.userUsername || null; // Username if available
  const text = comment.text || '';
  const createdAt = comment.createdAt;
  
  // Profile click handler - passes userId to parent which resolves to username URL
  const handleProfileClick = () => {
    onProfileClick(userId, userUsername);
  };
  
  return React.createElement('div', {
      className: `bg-gray-50 p-4 rounded-lg ${isTemp ? 'opacity-70' : ''}`
    },
    React.createElement('div', { className: 'flex items-start gap-3 mb-2' },
      
      // User avatar
      React.createElement('div', {
          className: 'w-10 h-10 rounded-lg overflow-hidden bg-green-200 flex-shrink-0 cursor-pointer',
          onClick: handleProfileClick
        },
        userPhoto ?
        React.createElement('img', {
          src: userPhoto,
          alt: userName,
          className: 'w-full h-full object-cover',
          onError: function(e) {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-green-800 font-bold">' +
              (userName ? userName.charAt(0).toUpperCase() : 'U') + '</div>';
          }
        }) :
        React.createElement('div', {
            className: 'w-full h-full flex items-center justify-center text-green-800 font-bold'
          },
          userName ? userName.charAt(0).toUpperCase() : 'U'
        )
      ),
      
      // Comment content
      React.createElement('div', { className: 'flex-1' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
          React.createElement('p', {
            className: 'font-medium text-sm cursor-pointer hover:underline',
            onClick: handleProfileClick
          }, userName),
          
          // Show username as @ if available
          userUsername && React.createElement('span', {
            className: 'text-xs text-gray-400'
          }, `@${userUsername}`),
          
          React.createElement(RoleBadge, { user: { userType }, size: 'sm' }),
          
          React.createElement('span', { className: 'text-xs text-gray-400' },
            isTemp ? 'Sending...' : (formatTime ? formatTime(createdAt) : '')
          )
        )
      ),
      
      // Only reaction button
      React.createElement('div', { className: 'flex items-center gap-1' },
        React.createElement(ReactionButton, {
          contentType: 'comments',
          contentId: comment.id,
          reactionType: 'helpful',
          size: 'xs',
          showCount: true
        })
      )
    ),
    
    // Comment text
    React.createElement('p', {
      className: 'text-gray-700 text-sm mb-3 pl-13',
      dangerouslySetInnerHTML: { __html: text }
    })
  );
}

window.CommentItem = CommentItem;