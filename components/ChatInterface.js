// components/ChatInterface.js - FIXED: Use username for profile navigation

function ChatInterface({ 
  chatId, 
  currentUserId, 
  otherUserId, 
  otherUserName, 
  otherUserPhoto, 
  onClose 
}) {
  // ===== USE THE HOOK =====
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    sendMessage,
    otherUserOnline,
    otherUserLastSeen
  } = window.useChatMessages(chatId, currentUserId);
  
  const [newMessage, setNewMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [showVerificationWarning, setShowVerificationWarning] = React.useState(false);
  
  const [chatValidated, setChatValidated] = React.useState(false);
  const [chatData, setChatData] = React.useState(null);
  const [listingInfo, setListingInfo] = React.useState(null);
  const [otherUserData, setOtherUserData] = React.useState({
    name: otherUserName || 'User',
    photoURL: otherUserPhoto || null,
    username: null  // ===== ADD USERNAME FIELD =====
  });
  const [otherUserTyping, setOtherUserTyping] = React.useState(false);
  
  const messagesEndRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);
  const typingListenerRef = React.useRef(null);
  
  // ===== USE VERIFICATION HOOK =====
  const { checkVerification, resendVerification } = window.useVerification?.() || {
    checkVerification: () => true,
    resendVerification: async () => false
  };
  
  // ===== MARK CHAT AS OPEN ON MOUNT =====
  React.useEffect(() => {
    document.body.classList.add('chat-open', 'hide-bottom-nav', 'chat-interface-active');
    return () => {
      document.body.classList.remove('chat-open', 'hide-bottom-nav', 'chat-interface-active');
    };
  }, []);
  
  // ===== SCROLL TO BOTTOM =====
  const scrollToBottom = React.useCallback((force = false) => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ 
          behavior: force ? 'smooth' : 'auto',
          block: 'nearest'
        });
      }, 100);
    }
  }, []);
  
  React.useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);
  
  // ===== VALIDATE CHAT =====
  React.useEffect(function() {
    if (!chatId || !currentUserId) return;
    
    const validateAccess = async function() {
      try {
        const result = await ChatHelpers.validateChatAccess(chatId, currentUserId);
        if (!result.valid) {
          // Error handled by hook
        } else {
          setChatValidated(true);
          setChatData(result.chatData);
          
          if (result.chatData.listingId) {
            const listing = await ChatHelpers.getChatListingInfo(chatId);
            setListingInfo(listing);
          }
        }
      } catch (error) {
        console.error('Validation error:', error);
      }
    };
    
    validateAccess();
  }, [chatId, currentUserId]);
  
  // ===== FETCH OTHER USER (INCLUDING USERNAME) =====
  React.useEffect(function() {
    if (!otherUserId) return;
    
    if (otherUserName) {
      setOtherUserData({
        name: otherUserName,
        photoURL: otherUserPhoto || null,
        username: null
      });
      return;
    }
    
    const fetchOtherUser = async function() {
      try {
        const userDoc = await db.collection('users').doc(otherUserId).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setOtherUserData({
            name: data.displayName || data.name || 'User',
            photoURL: data.photoURL || null,
            username: data.username || null  // ===== GET USERNAME =====
          });
        }
      } catch (error) {
        console.error('Error fetching other user:', error);
      }
    };
    
    fetchOtherUser();
  }, [otherUserId, otherUserName, otherUserPhoto]);
  
  // ===== TYPING INDICATOR =====
  React.useEffect(function() {
    if (!chatId || !chatValidated || !currentUserId) return;
    
    const typingRef = db.collection('chats').doc(chatId)
      .collection('typing').doc('status');
    
    typingListenerRef.current = typingRef.onSnapshot(function(doc) {
      if (doc.exists) {
        const data = doc.data();
        if (data.userId && data.userId !== currentUserId && data.isTyping) {
          const isRecent = Date.now() - (data.timestamp?.toMillis?.() || 0) < 3000;
          setOtherUserTyping(isRecent);
        } else {
          setOtherUserTyping(false);
        }
      } else {
        setOtherUserTyping(false);
      }
    });
    
    return function() {
      if (typingListenerRef.current) {
        typingListenerRef.current();
      }
    };
  }, [chatId, currentUserId, chatValidated]);
  
  const broadcastTyping = React.useCallback(function(isTyping) {
    if (!chatId || !currentUserId || !chatValidated) return;
    
    const typingRef = db.collection('chats').doc(chatId)
      .collection('typing').doc('status');
    
    typingRef.set({
      userId: currentUserId,
      isTyping: isTyping,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(error) {
      console.error('Error broadcasting typing:', error);
    });
  }, [chatId, currentUserId, chatValidated]);
  
  // ===== HANDLERS =====
  const handleScroll = React.useCallback((e) => {
    const container = e.target;
    if (container.scrollTop < 50 && hasMore && !loadingMore && !loading) {
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;
      
      loadMore().then(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        });
      });
    }
  }, [hasMore, loadingMore, loading, loadMore]);
  
  const handleTyping = function() {
    broadcastTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };
  
  const handleSend = async function(e) {
    e.preventDefault();
    
    if (sending) return;
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;
    
    if (!checkVerification(auth.currentUser, 'send messages')) {
      setShowVerificationWarning(true);
      setTimeout(() => setShowVerificationWarning(false), 5000);
      return;
    }
    
    setNewMessage('');
    setSending(true);
    
    try {
      await sendMessage(trimmedMessage);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };
  
  const handleResendVerification = async function() {
    const success = await resendVerification(auth.currentUser);
    if (success) {
      ToastHelpers?.success('Verification email sent! Please check your inbox.');
    } else {
      ToastHelpers?.error('Failed to send verification email. Please try again.');
    }
  };
  
  const handleInputChange = function(e) {
    setNewMessage(e.target.value);
    handleTyping();
  };
  
  const handleKeyDown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };
  
  // ===== FIXED: Navigate to user profile using username =====
  const navigateToUserProfile = function() {
    if (!window.__navigate) return;
    
    // Use username if available, otherwise fallback to user ID
    if (otherUserData.username) {
      window.__navigate('/' + otherUserData.username);
    } else {
      // Fallback to user ID (legacy support)
      window.__navigate('/profile/' + otherUserId);
    }
  };
  
  // ===== FIXED: Navigate to listing detail =====
  const navigateToListing = function() {
    if (!window.__navigate || !listingInfo?.id) return;
    window.__navigate('/listing/' + listingInfo.id);
  };
  
  // ===== RENDER =====
  if (!chatValidated && !loading && error) {
    return React.createElement('div', { 
      className: 'fixed inset-0 bg-white z-50 flex items-center justify-center p-4' 
    },
      React.createElement('div', { className: 'text-center max-w-sm' },
        React.createElement('p', { className: 'text-red-600 font-medium' }, error)
      )
    );
  }
  
  if (loading) {
    return React.createElement('div', { 
      className: 'fixed inset-0 bg-white z-50 flex items-center justify-center' 
    },
      React.createElement(SkeletonLoader.ChatInterface)
    );
  }
  
  const lastSeenText = otherUserOnline 
    ? 'Online now' 
    : ChatHelpers.formatLastSeen(otherUserLastSeen, false);
  
  // MAIN CONTAINER
  return React.createElement('div', { 
    className: 'fixed inset-0 bg-white z-50 flex flex-col h-screen w-screen overflow-hidden' 
  },

    // ===== HEADER =====
    React.createElement('div', { 
      className: 'bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0'
    },
      React.createElement('div', { className: 'flex items-center gap-3 flex-1 min-w-0' },
        
        React.createElement('button', {
          onClick: onClose,
          className: 'flex items-center justify-center w-10 h-10 text-gray-600 hover:text-green-950 rounded-full hover:bg-gray-100 transition flex-shrink-0',
          'aria-label': 'Back to chats'
        },
          React.createElement('svg', { 
            className: 'w-5 h-5', 
            fill: 'none', 
            stroke: 'currentColor', 
            viewBox: '0 0 24 24' 
          },
            React.createElement('path', { 
              strokeLinecap: 'round', 
              strokeLinejoin: 'round', 
              strokeWidth: '2', 
              d: 'M10 19l-7-7m0 0l7-7m-7 7h18' 
            })
          )
        ),
        
        // ===== LISTING IMAGE (clickable) =====
        React.createElement('div', { 
          className: 'relative flex-shrink-0 cursor-pointer',
          onClick: navigateToListing
        },
          React.createElement('div', { 
            className: 'w-10 h-10 rounded-lg overflow-hidden bg-gray-200'
          },
            listingInfo?.images?.[0] ?
            React.createElement('img', {
              src: CloudinaryHelpers.getThumbnailUrl(listingInfo.images[0]),
              alt: listingInfo?.title || 'Property',
              className: 'w-full h-full object-cover',
              onError: function(e) {
                e.target.onerror = null;
                e.target.src = '/vault/img/no-image.jpg';
              }
            }) :
            React.createElement('div', { 
              className: 'w-full h-full flex items-center justify-center text-gray-500 text-xs' 
            }, '🏠')
          )
        ),
        
        // ===== USER INFO (clickable to profile) =====
        React.createElement('div', { 
          className: 'min-w-0 flex-1 cursor-pointer',
          onClick: navigateToUserProfile
        },
          React.createElement('div', { className: 'flex items-center gap-1' },
            React.createElement('h3', { 
              className: 'font-bold text-gray-900 truncate hover:underline text-sm'
            }, otherUserData.name)
          ),
          
          listingInfo && React.createElement('p', { 
            className: 'text-xs text-gray-500 truncate'
          }, '📋 ' + listingInfo.title),
          
          React.createElement('p', { 
            className: 'text-xs text-gray-500' 
          }, otherUserTyping ? 'Typing...' : lastSeenText)
        ),
        
        // ===== ONLINE STATUS DOT =====
        React.createElement('div', {
          className: `w-3 h-3 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-gray-400'} flex-shrink-0`,
          title: otherUserOnline ? 'Online' : lastSeenText
        })
      ),
      
      React.createElement('button', {
        onClick: onClose,
        className: 'hidden md:flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition flex-shrink-0',
        'aria-label': 'Close chat'
      },
        React.createElement('svg', { 
          className: 'w-5 h-5', 
          fill: 'none', 
          stroke: 'currentColor', 
          viewBox: '0 0 24 24' 
        },
          React.createElement('path', { 
            strokeLinecap: 'round', 
            strokeLinejoin: 'round', 
            strokeWidth: '2', 
            d: 'M6 18L18 6M6 6l12 12' 
          })
        )
      )
    ),
    
    error && React.createElement('div', { 
      className: 'mx-4 mt-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200'
    }, error),
    
    // ===== VERIFICATION WARNING BANNER =====
    showVerificationWarning && React.createElement('div', {
      className: 'mx-4 mt-2 p-3 rounded-lg text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center justify-between'
    },
      React.createElement('span', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-base' }, '⚠️'),
        'Please verify your email to send messages.'
      ),
      React.createElement('button', {
        onClick: handleResendVerification,
        className: 'text-xs bg-yellow-100 px-2 py-1 rounded hover:bg-yellow-200 transition'
      }, 'Resend')
    ),
    
    // ===== MESSAGES AREA =====
    React.createElement('div', { 
      ref: messagesContainerRef,
      className: 'flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0',
      onScroll: handleScroll
    },
      
      hasMore && !loadingMore && messages.length > 0 && 
      React.createElement('div', { 
        className: 'text-center py-2 text-xs text-gray-400'
      }, '↑ Scroll up for older messages'),
      
      loadingMore && React.createElement('div', { 
        className: 'text-center py-2'
      },
        React.createElement('div', { 
          className: 'w-8 h-8 rounded-full bg-gray-200 animate-pulse mx-auto' 
        })
      ),
      
      !loading && messages.length === 0 ?
      React.createElement('div', { 
        className: 'text-center text-gray-400 mt-12'
      },
        React.createElement('p', null, 'No messages yet. Say hello! 👋')
      ) :
      React.createElement('div', { className: 'space-y-3' },
        messages.map(function(message) {
          const isCurrentUser = message.senderId === currentUserId;
          return React.createElement(ChatMessage, {
            key: message.id,
            message: message.text || '',
            isCurrentUser: isCurrentUser,
            timestamp: message.createdAt,
            read: message.read,
            isTemp: message.isTemp,
          });
        })
      ),
      React.createElement('div', { ref: messagesEndRef })
    ),
    
    // ===== INPUT AREA =====
    React.createElement('form', { 
      onSubmit: handleSend, 
      className: 'border-t border-gray-200 bg-white p-3 flex-shrink-0'
    },
      React.createElement('div', { className: 'flex gap-2 items-end' },
        React.createElement('div', { className: 'flex-1 relative' },
          React.createElement('textarea', {
            ref: inputRef,
            value: newMessage,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            placeholder: sending ? 'Sending...' : 'Type a message...',
            disabled: sending || !chatValidated || showVerificationWarning,
            maxLength: 6000,
            rows: 1,
            className: `w-full p-3 pr-12 border rounded-2xl resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent text-sm ${
              sending || showVerificationWarning ? 'bg-gray-100' : 'bg-white'
            }`
          }),
          React.createElement('div', { 
            className: 'absolute right-3 bottom-3 text-xs text-gray-400'
          }, newMessage.length + '/6000')
        ),
        React.createElement('button', {
          type: 'submit',
          disabled: !newMessage.trim() || sending || !chatValidated || showVerificationWarning,
          className: `p-3 rounded-full transition flex-shrink-0 flex items-center justify-center ${
            !newMessage.trim() || sending || !chatValidated || showVerificationWarning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-950 text-white hover:bg-green-800'
          }`
        },
          sending 
            ? React.createElement('div', { 
                className: 'w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' 
              })
            : React.createElement('svg', { 
                className: 'w-5 h-5', 
                fill: 'none', 
                stroke: 'currentColor', 
                viewBox: '0 0 24 24' 
              },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: '2', 
                  d: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' 
                })
              )
        )
      )
    )
  );
}

window.ChatInterface = ChatInterface;