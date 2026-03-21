// ChatMessage.js - REPLY FEATURE REMOVED
function ChatMessage({
  message,
  isCurrentUser,
  timestamp,
  read,
  isTemp
  // REPLY FEATURE REMOVED - onReply and replyingTo props removed
}) {
  const formattedTime = ChatHelpers.formatMessageTime(timestamp);
  // REPLY FEATURE REMOVED - swipe functionality removed
  
  const messageClasses = `max-w-[75%] rounded-2xl px-4 py-2 ${
    isCurrentUser 
      ? isTemp 
        ? 'bg-green-200 text-gray-800 rounded-br-none' 
        : 'bg-green-950 text-white rounded-br-none' 
      : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-200'
  }`;
  
  return React.createElement('div', {
      className: `flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`
      // REPLY FEATURE REMOVED - touch handlers removed
    },
    React.createElement('div', { className: messageClasses },
      
      // REPLY FEATURE REMOVED - Reply indicator div completely removed
      
      // Message text with ID (keeping ID for potential future use)
      React.createElement('p', {
        id: `msg-${message.id}`,
        className: `text-sm break-words whitespace-pre-wrap ${isTemp ? 'italic' : ''}`,
      }, message),
      
      // Footer
      React.createElement('div', {
          className: `flex items-center justify-end gap-1 text-xs mt-1 ${
            isCurrentUser 
              ? isTemp ? 'text-gray-600' : 'text-green-200'
              : 'text-gray-400'
          }`
        },
        React.createElement('span', null, formattedTime),
        
        // REPLY FEATURE REMOVED - Reply hint span removed
        
        isCurrentUser && !isTemp && React.createElement('span', {
            className: 'ml-1',
            title: read ? 'Read' : 'Sent'
          },
          read ?
          React.createElement('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
          ) :
          '✓'
        ),
        
        isTemp && React.createElement('span', {
          className: 'ml-1 text-xs'
        }, '⏳')
      )
    )
  );
}

window.ChatMessage = ChatMessage;