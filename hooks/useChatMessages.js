// hooks/useChatMessages.js - COMPLETE FIXED VERSION
function useChatMessages(chatId, currentUserId) {
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState('');
  
  // ===== ONLINE STATUS STATE =====
  const [otherUserOnline, setOtherUserOnline] = React.useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = React.useState(null);
  const [otherUserId, setOtherUserId] = React.useState(null);
  
  const lastMessageRef = React.useRef(null);
  const unsubscribeRef = React.useRef(null);
  const messageIds = React.useRef(new Set());
  const heartbeatUnsubscribeRef = React.useRef(null);
  
  // Store temp messages with their client timestamps for matching
  const pendingTempMessages = React.useRef(new Map()); // clientTimestamp -> tempId
  
  React.useEffect(() => {
    if (!chatId || !currentUserId) return;
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    messageIds.current.clear();
    pendingTempMessages.current.clear();
    lastMessageRef.current = null;
    
    const chatRef = db.collection('chats').doc(chatId);
    
    // ===== GET OTHER USER ID FROM CHAT =====
    const getOtherUserId = async () => {
      try {
        const chatDoc = await chatRef.get();
        if (chatDoc.exists) {
          const participants = chatDoc.data().participants || [];
          const otherId = participants.find(id => id !== currentUserId);
          setOtherUserId(otherId);
          return otherId;
        }
      } catch (err) {
        console.error('Error getting other user ID:', err);
      }
      return null;
    };
    
    // ===== LISTEN TO OTHER USER'S ONLINE STATUS =====
    const setupUserStatusListener = async () => {
      const otherId = await getOtherUserId();
      if (!otherId) return;
      
      const userStatusRef = db.collection('users').doc(otherId);
      
      const unsubscribe = userStatusRef.onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          const lastActive = data.lastActive;
          const isOnline = data.isOnline || false;
          
          setOtherUserOnline(isOnline);
          setOtherUserLastSeen(lastActive);
        }
      });
      
      return unsubscribe;
    };
    
    const statusUnsubscribe = setupUserStatusListener();
    
    // ===== MESSAGE LISTENER =====
    unsubscribeRef.current = chatRef.collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(30)
      .onSnapshot(
        (snapshot) => {
          // Process each change
          snapshot.docChanges().forEach((change) => {
            const messageId = change.doc.id;
            const data = change.doc.data();
            
            if (change.type === 'added' || change.type === 'modified') {
              // Check if this real message matches a pending temp message
              const clientTimestamp = data.clientTimestamp;
              
              setMessages(prev => {
                // Case 1: Look for a matching temp message by clientTimestamp
                if (clientTimestamp && pendingTempMessages.current.has(clientTimestamp)) {
                  const tempId = pendingTempMessages.current.get(clientTimestamp);
                  
                  // Find the temp message in the current list
                  const existingTempIndex = prev.findIndex(m => m.id === tempId);
                  
                  if (existingTempIndex !== -1) {
                    // Found matching temp message - replace it with real one
                    const updated = [...prev];
                    
                    // Preserve the sortTime from temp message to maintain position
                    const sortTime = prev[existingTempIndex].sortTime || clientTimestamp;
                    
                    updated[existingTempIndex] = {
                      id: messageId,
                      senderId: data.senderId,
                      text: data.text || '',
                      createdAt: data.createdAt,
                      clientTimestamp: data.clientTimestamp,
                      serverTimestamp: data.createdAt?.seconds || 0,
                      sortTime: sortTime,
                      read: data.read || false,
                      isTemp: false,
                      receivedAt: Date.now()
                    };
                    
                    // Update message tracking
                    messageIds.current.delete(tempId);
                    messageIds.current.add(messageId);
                    pendingTempMessages.current.delete(clientTimestamp);
                    
                    return updated;
                  }
                }
                
                // Case 2: No matching temp message, add as new (but check for duplicates)
                if (!messageIds.current.has(messageId)) {
                  messageIds.current.add(messageId);
                  
                  const serverTime = data.createdAt?.seconds || 0;
                  const clientTime = data.clientTimestamp || 0;
                  const sortTime = serverTime > 0 ? serverTime : clientTime;
                  
                  // Create new message object
                  const newMessage = {
                    id: messageId,
                    senderId: data.senderId,
                    text: data.text || '',
                    createdAt: data.createdAt,
                    clientTimestamp: data.clientTimestamp,
                    serverTimestamp: serverTime,
                    sortTime: sortTime,
                    read: data.read || false,
                    isTemp: false,
                    receivedAt: Date.now()
                  };
                  
                  // Add to list and sort
                  const updated = [...prev, newMessage].sort((a, b) => {
                    return (a.sortTime || 0) - (b.sortTime || 0);
                  });
                  
                  // Update last message ref
                  if (updated.length > 0) {
                    lastMessageRef.current = updated[0];
                  }
                  
                  return updated;
                }
                
                return prev;
              });
            }
          });
          
          setLoading(false);
        },
        (err) => {
          console.error('Message listener error:', err);
          setError('Failed to load messages');
          setLoading(false);
        }
      );
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (statusUnsubscribe) {
        statusUnsubscribe.then(unsub => unsub?.());
      }
    };
  }, [chatId, currentUserId]);
  
  // ===== LOAD MORE MESSAGES =====
  const loadMore = React.useCallback(async () => {
    if (!chatId || !hasMore || loadingMore || loading || !lastMessageRef.current) return;
    
    setLoadingMore(true);
    
    try {
      const chatRef = db.collection('chats').doc(chatId);
      const oldestMessage = lastMessageRef.current;
      
      const snapshot = await chatRef.collection('messages')
        .orderBy('createdAt', 'desc')
        .startAfter(oldestMessage.createdAt)
        .limit(20)
        .get();
      
      if (snapshot.empty) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      
      const olderMessages = [];
      snapshot.docs.forEach(doc => {
        const messageId = doc.id;
        if (!messageIds.current.has(messageId)) {
          messageIds.current.add(messageId);
          const data = doc.data();
          
          const serverTime = data.createdAt?.seconds || 0;
          const clientTime = data.clientTimestamp || 0;
          const sortTime = serverTime > 0 ? serverTime : clientTime;
          
          olderMessages.push({
            id: messageId,
            senderId: data.senderId,
            text: data.text || '',
            createdAt: data.createdAt,
            clientTimestamp: data.clientTimestamp,
            serverTimestamp: serverTime,
            sortTime: sortTime,
            read: data.read || false,
            isTemp: false,
            receivedAt: Date.now()
          });
        }
      });
      
      if (olderMessages.length > 0) {
        setMessages(prev => {
          const combined = [...prev, ...olderMessages].sort((a, b) => {
            return (a.sortTime || 0) - (b.sortTime || 0);
          });
          
          if (combined.length > 0) {
            lastMessageRef.current = combined[0];
          }
          
          setHasMore(snapshot.docs.length === 20);
          return combined;
        });
      } else {
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, hasMore, loadingMore, loading]);
  
  // ===== SEND MESSAGE =====
  const sendMessage = React.useCallback(async (text) => {
    if (!chatId || !currentUserId || !text.trim()) return null;
    
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const nowSeconds = Date.now() / 1000;
    
    // Store mapping of clientTimestamp to tempId for later matching
    pendingTempMessages.current.set(nowSeconds, tempId);
    
    // Create temp message
    const tempMessage = {
      id: tempId,
      senderId: currentUserId,
      text: text.trim(),
      createdAt: { seconds: nowSeconds },
      clientTimestamp: nowSeconds,
      serverTimestamp: 0,
      sortTime: nowSeconds,
      read: false,
      isTemp: true,
      receivedAt: Date.now()
    };
    
    // Add temp message to UI immediately
    setMessages(prev => {
      const updated = [...prev, tempMessage].sort((a, b) => {
        return (a.sortTime || 0) - (b.sortTime || 0);
      });
      messageIds.current.add(tempId);
      return updated;
    });
    
    try {
      // Send actual message to server
      const realMessageId = await ChatHelpers.sendMessage(chatId, currentUserId, text.trim(), {
        clientTimestamp: nowSeconds
      });
      
      return realMessageId;
      
    } catch (err) {
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      messageIds.current.delete(tempId);
      pendingTempMessages.current.delete(nowSeconds);
      throw err;
    }
  }, [chatId, currentUserId]);
  
  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    sendMessage,
    otherUserOnline,
    otherUserLastSeen,
    otherUserId
  };
}

window.useChatMessages = useChatMessages;