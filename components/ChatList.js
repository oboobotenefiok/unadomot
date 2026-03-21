// components/ChatList.js - With Last Seen Feature
function ChatList({ userId, onSelectChat }) {
  const [chats, setChats] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [userCache, setUserCache] = React.useState({});
  const [listingImages, setListingImages] = React.useState({});
  const [listingTitles, setListingTitles] = React.useState({});
  const [userStatus, setUserStatus] = React.useState({}); // NEW: Store online status for each user
  const [usingIndex, setUsingIndex] = React.useState(true);
  const abortControllerRef = React.useRef(null);
  
  React.useEffect(function() {
    if (!userId) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    loadChats();
    
    return function() { 
      abortControllerRef.current = null;
    };
  }, [userId]);

  async function loadChats() {
    setLoading(true);
    
    try {
      const result = await FirestoreQueries.query({
        collection: 'chats',
        where: [['participants', 'array-contains', userId]],
        orderBy: 'lastMessageTime',
        orderDirection: 'desc',
        limit: 30
      });
      
      setUsingIndex(result.usingIndex);
      
      // Enrich chats with user and listing data
      const chatPromises = result.data.map(async (chatData) => {
        const otherUserId = chatData.participants.find(id => id !== userId);
        
        // Get other user data
        let otherUser = userCache[otherUserId];
        if (!otherUser && otherUserId) {
          const userDoc = await db.collection('users').doc(otherUserId).get();
          otherUser = userDoc.exists ? userDoc.data() : { name: 'Unknown User' };
          setUserCache(prev => ({ ...prev, [otherUserId]: otherUser }));
        }
        
        // Get listing image if not already cached
        if (chatData.listingId && !listingImages[chatData.listingId]) {
          try {
            const listing = await ChatHelpers.getChatListingInfo(chatData.id);
            if (listing) {
              setListingImages(prev => ({ ...prev, [chatData.listingId]: listing.images?.[0] || null }));
              setListingTitles(prev => ({ ...prev, [chatData.listingId]: listing.title || 'Property' }));
            }
          } catch (error) {
            console.error('Error fetching listing:', error);
          }
        }
        
        return {
          ...chatData,
          otherUser: otherUser || { name: 'Unknown User' },
          otherUserId: otherUserId
        };
      });
      
      const chatsWithUsers = await Promise.all(chatPromises);
      
      // Calculate unread counts
      const unreadPromises = chatsWithUsers.map(async (chat) => {
        if (!chat.lastMessageTime) return { ...chat, unreadCount: 0 };
        
        const lastRead = chat.lastRead?.[userId] || null;
        
        if (chat.lastSenderId === userId) {
          return { ...chat, unreadCount: 0 };
        }
        
        try {
          const chatRef = db.collection('chats').doc(chat.id);
          const messagesRef = chatRef.collection('messages');
          
          let query = messagesRef.where('senderId', '!=', userId).limit(1);
          if (lastRead) {
            query = query.where('createdAt', '>', lastRead);
          }
          
          const unreadSnapshot = await query.get();
          return { 
            ...chat, 
            unreadCount: !unreadSnapshot.empty ? 1 : 0
          };
        } catch (error) {
          return { ...chat, unreadCount: 0 };
        }
      });
      
      const chatsWithUnread = await Promise.all(unreadPromises);
      
      // ===== NEW: Set up real-time status listeners for all unique users =====
      const uniqueUserIds = [...new Set(chatsWithUnread.map(c => c.otherUserId).filter(Boolean))];
      
      // Clean up old listeners
      if (window.__statusListeners) {
        window.__statusListeners.forEach(unsubscribe => unsubscribe());
      }
      window.__statusListeners = [];
      
      // Set up new listeners
      uniqueUserIds.forEach(uid => {
        const unsubscribe = db.collection('users').doc(uid).onSnapshot((doc) => {
          if (doc.exists) {
            const data = doc.data();
            setUserStatus(prev => ({
              ...prev,
              [uid]: {
                isOnline: data.isOnline || false,
                lastActive: data.lastActive
              }
            }));
          }
        });
        window.__statusListeners.push(unsubscribe);
      });
      
      setChats(chatsWithUnread);
      setLoading(false);
      
    } catch (error) {
      if (error.name === 'AbortError') return;
      setLoading(false);
    }
  }
  
  // Clean up status listeners on unmount
  React.useEffect(() => {
    return () => {
      if (window.__statusListeners) {
        window.__statusListeners.forEach(unsubscribe => unsubscribe());
      }
    };
  }, []);
  
  if (loading) {
    return React.createElement('div', { className: 'flex justify-center py-12' },
      React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
    );
  }
  
  if (chats.length === 0) {
    return React.createElement('div', { className: 'text-center py-12 bg-white rounded-lg shadow-md' },
      React.createElement('p', { className: 'text-gray-500 mb-4' }, 'No conversations yet'),
      React.createElement('p', { className: 'text-sm text-gray-400' },
        'When you contact a landlord about a property, your chats will appear here'
      )
    );
  }
  
  return React.createElement('div', { className: 'bg-white rounded-lg shadow-md divide-y' },
    
    chats.map(function(chat) {
      const lastMessage = chat.lastMessage || 'No messages yet';
      const time = ChatHelpers.formatMessageTime(chat.lastMessageTime);
      const hasUnread = chat.unreadCount > 0;
      const listingTitle = chat.listingId ? (listingTitles[chat.listingId] || 'Property') : null;
      const listingImage = chat.listingId ? listingImages[chat.listingId] : null;
      
      // ===== NEW: Get user status =====
      const status = userStatus[chat.otherUserId] || {};
      const isOnline = status.isOnline || false;
      const lastActive = status.lastActive;
      
      // Format last seen for display
      const lastSeenText = isOnline 
        ? 'Online now' 
        : ChatHelpers.formatLastSeen(lastActive, false);
      
      return React.createElement('div', {
          key: chat.id,
          onClick: function() { onSelectChat(chat); },
          className: `p-4 hover:bg-gray-50 cursor-pointer transition flex items-center gap-3 ${hasUnread ? 'bg-blue-50' : ''}`
        },
        
        // Image container with POP OUT avatar
        React.createElement('div', { className: 'relative flex-shrink-0' },
          // BIG CIRCLE: Product/Listing Image
          React.createElement('div', { 
            className: 'w-12 h-12 rounded-lg overflow-hidden bg-gray-200',
            title: listingTitle || 'Property'
          },
            listingImage ?
            React.createElement('img', {
              src: CloudinaryHelpers.getThumbnailUrl(listingImage),
              alt: listingTitle || 'Property',
              className: 'w-full h-full object-cover',
              onError: function(e) { 
                e.target.onerror = null;
                e.target.src = '/vault/img/no-image.jpg';
              }
            }) :
            React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-gray-500 text-xs' },
              '🏠'
            )
          ),
          
          // SMALL CIRCLE: User Avatar with online status indicator
          React.createElement('div', {
            className: `absolute -bottom-1 -right-2 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-md ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`,
            title: isOnline ? 'Online' : lastSeenText
          },
            !isOnline && chat.otherUser?.photoURL ?
            React.createElement('img', {
              src: chat.otherUser.photoURL,
              alt: chat.otherUser.name,
              className: 'w-full h-full object-cover',
              onError: function(e) {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }
            }) :
            !isOnline && React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-[8px] font-bold text-white' },
              chat.otherUser?.name ? chat.otherUser.name.charAt(0).toUpperCase() : 'U'
            )
          )
        ),
        
        // Chat Info
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('div', { className: 'flex justify-between items-start w-full' },
            React.createElement('div', { className: 'flex-1 min-w-0' },
              React.createElement('h3', {
                className: `font-bold truncate pr-2 ${hasUnread ? 'text-gray-900' : ''}`,
                title: chat.otherUser.name || 'User'
              }, chat.otherUser.name || 'User'),
              
              // ===== NEW: Show last seen under name =====
              React.createElement('p', { 
                className: `text-xs ${isOnline ? 'text-green-600' : 'text-gray-400'} truncate` 
              }, lastSeenText)
            ),
            React.createElement('span', { className: 'text-xs text-gray-500 flex-shrink-0 ml-1' }, time)
          ),
          
          listingTitle && React.createElement('p', {
              className: 'text-xs text-gray-400 truncate mb-0.5',
              title: listingTitle
            },
            '📋 ' + listingTitle
          ),
          
          React.createElement('div', { className: 'flex items-center gap-1 w-full mt-0.5' },
            chat.lastSenderId === userId &&
            React.createElement('span', {
              className: `text-sm flex-shrink-0 ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`
            }, 'You:'),
            
            React.createElement('p', {
                className: `text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`,
                style: { maxWidth: '100%' },
                title: lastMessage
              },
              lastMessage
            )
          )
        ),
        
        hasUnread && React.createElement('div', { className: 'flex-shrink-0 ml-2' },
          React.createElement('span', {
            className: 'bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center'
          }, '•')
        )
      );
    })
  );
}

window.ChatList = ChatList;