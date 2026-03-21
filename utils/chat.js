// utils/chat.js - COMPLETE FIXED VERSION
const MESSAGE_RATE_LIMIT = {
  MAX_MESSAGES: 20,
  TIME_WINDOW: 60000, // 1 minute
  MESSAGE_COOLDOWN: 1000, // 1 second
  MAX_MESSAGE_LENGTH: 5000
};

const rateLimitStore = {
  userMessages: {},
  lastMessageTime: {}
};

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean up old message timestamps
  Object.keys(rateLimitStore.userMessages).forEach(userId => {
    rateLimitStore.userMessages[userId] = rateLimitStore.userMessages[userId]
      .filter(timestamp => now - timestamp < MESSAGE_RATE_LIMIT.TIME_WINDOW);
    
    if (rateLimitStore.userMessages[userId].length === 0) {
      delete rateLimitStore.userMessages[userId];
    }
  });
  
  // Clean up old last message times (older than 1 hour)
  Object.keys(rateLimitStore.lastMessageTime).forEach(userId => {
    if (now - rateLimitStore.lastMessageTime[userId] > 3600000) {
      delete rateLimitStore.lastMessageTime[userId];
    }
  });
}, 300000);

const sanitizeText = (text) => {
  if (!text) return '';
  
  let sanitized = String(text).trim();
  
  // Truncate if too long
  if (sanitized.length > MESSAGE_RATE_LIMIT.MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MESSAGE_RATE_LIMIT.MAX_MESSAGE_LENGTH);
  }
  
  // Remove HTML tags and dangerous content
  sanitized = sanitized
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/data:/gi, 'data-removed:')
    .replace(/vbscript:/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/document\./gi, '')
    .replace(/window\./gi, '');
  
  return sanitized;
};

const checkRateLimit = (userId) => {
  const now = Date.now();
  
  // Initialize if needed
  if (!rateLimitStore.userMessages[userId]) {
    rateLimitStore.userMessages[userId] = [];
  }
  
  // Clean old messages for this user
  rateLimitStore.userMessages[userId] = rateLimitStore.userMessages[userId]
    .filter(timestamp => now - timestamp < MESSAGE_RATE_LIMIT.TIME_WINDOW);
  
  // Check cooldown
  if (rateLimitStore.lastMessageTime[userId]) {
    const timeSinceLastMessage = now - rateLimitStore.lastMessageTime[userId];
    if (timeSinceLastMessage < MESSAGE_RATE_LIMIT.MESSAGE_COOLDOWN) {
      const waitTime = Math.ceil((MESSAGE_RATE_LIMIT.MESSAGE_COOLDOWN - timeSinceLastMessage) / 1000);
      throw new Error(`Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message`);
    }
  }
  
  // Check rate limit
  if (rateLimitStore.userMessages[userId].length >= MESSAGE_RATE_LIMIT.MAX_MESSAGES) {
    throw new Error('Message limit reached. Please wait a moment before sending more messages.');
  }
  
  return true;
};

const updateRateLimit = (userId) => {
  const now = Date.now();
  
  if (!rateLimitStore.userMessages[userId]) {
    rateLimitStore.userMessages[userId] = [];
  }
  
  rateLimitStore.userMessages[userId].push(now);
  rateLimitStore.lastMessageTime[userId] = now;
};

const ChatHelpers = {
  
  /**
   * Generate a consistent chat ID from two user IDs and a listing ID
   */
  getChatId: function(userId1, userId2, listingId) {
    return [userId1, userId2, listingId].sort().join('_');
  },

  /**
   * Get or create a chat for a listing - FIXED VERSION with transaction
   */
  getOrCreateListingChat: async function(currentUserId, otherUserId, listingId, initialMessage = null) {
    if (!currentUserId || !otherUserId) {
      
      throw new Error('Both user IDs are required');
    }
    
    if (currentUserId === otherUserId) {
      throw new Error('Cannot create chat with yourself');
    }
    
    if (!listingId) {
      throw new Error('Listing ID is required - all chats must be about a listing');
    }
    
    try {
      const chatId = this.getChatId(currentUserId, otherUserId, listingId);
      
      
      const chatRef = db.collection('chats').doc(chatId);
      
      // Use a transaction to prevent race conditions
      return await db.runTransaction(async (transaction) => {
        const chatDoc = await transaction.get(chatRef);
        
        if (!chatDoc.exists) {
          
          
          // Fetch listing info
          let listingTitle = 'Property';
          let listingImage = null;
          try {
            const listingDoc = await db.collection('listings').doc(listingId).get();
            if (listingDoc.exists) {
              const listingData = listingDoc.data();
              listingTitle = listingData.title || 'Property';
              listingImage = listingData.images && listingData.images.length > 0 ? listingData.images[0] : null;
            }
          } catch (error) {
            
            // Continue anyway - we can still create the chat
          }
          
          // Create the chat document
          transaction.set(chatRef, {
            participants: [currentUserId, otherUserId],
            listingId: listingId,
            listingTitle: listingTitle,
            listingImage: listingImage,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: initialMessage ? (initialMessage.length > 100 ? initialMessage.slice(0, 100) + '...' : initialMessage) : null,
            lastMessageTime: initialMessage ? firebase.firestore.FieldValue.serverTimestamp() : null,
            lastSenderId: initialMessage ? currentUserId : null,
            participantInfo: {}
          });
          
          // Send initial message if provided
          if (initialMessage) {
            
            const messageRef = chatRef.collection('messages').doc();
            transaction.set(messageRef, {
              senderId: currentUserId,
              text: initialMessage,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              clientTimestamp: Date.now() / 1000,
              read: false,
              type: 'text'
            });
          }
        } else {
          
        }
        
        return chatId;
      });
    } catch (error) {
      
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  },

  /**
   * Check if a chat already exists for a listing between two users
   */
  hasExistingListingChat: async function(userId1, userId2, listingId) {
    const chatId = this.getChatId(userId1, userId2, listingId);
    const chatDoc = await db.collection('chats').doc(chatId).get();
    return chatDoc.exists;
  },

  /**
   * Send a message in a chat
   */
  sendMessage: async function(chatId, senderId, text, options = null) {
    if (!chatId || !senderId) {
      throw new Error('Chat ID and sender ID are required');
    }
    
    // Check rate limit
    try {
      checkRateLimit(senderId);
    } catch (rateLimitError) {
      throw rateLimitError;
    }
    
    // Sanitize message text
    const sanitizedText = sanitizeText(text);
    
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }
    
    // Create message reference
    const messageRef = db.collection('chats').doc(chatId)
      .collection('messages').doc();
    
    // Base message object
    const message = {
      senderId: senderId,
      text: sanitizedText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      clientTimestamp: options?.clientTimestamp || Date.now() / 1000,
      read: false,
      type: 'text'
    };
    
    try {
      // Save message to Firestore
      await messageRef.set(message);
      
      // Update chat preview
      const previewText = sanitizedText.length > 100 
        ? sanitizedText.slice(0, 100) + '...' 
        : sanitizedText;
      
      await db.collection('chats').doc(chatId).update({
        lastMessage: previewText,
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        lastSenderId: senderId
      });
      
      // Update rate limit after successful send
      updateRateLimit(senderId);
      
      return messageRef.id;
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to send messages in this chat');
      } else if (error.code === 'not-found') {
        throw new Error('Chat not found');
      } else if (error.code === 'unavailable') {
        throw new Error('Network error. Please check your connection.');
      } else {
        throw new Error('Failed to send message. Please try again.');
      }
    }
  },
  
  /**
   * Get listing info for a chat
   */
  getChatListingInfo: async function(chatId) {
    try {
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) return null;
      
      const chatData = chatDoc.data();
      if (!chatData.listingId) return null;
      
      const listingDoc = await db.collection('listings').doc(chatData.listingId).get();
      if (!listingDoc.exists) return null;
      
      const listingData = listingDoc.data();
      return {
        id: listingDoc.id,
        ...listingData,
        images: listingData.images && listingData.images.length > 0 ? listingData.images : null
      };
    } catch (error) {
      console.error('Error fetching listing info:', error);
      return null;
    }
  },
  
  /**
   * Get the other participant in a chat
   */
  getOtherParticipant: function(chat, currentUserId) {
    if (!chat || !chat.participants || !currentUserId) return null;
    return chat.participants.find(id => id !== currentUserId);
  },
  
  /**
   * Format message timestamp for display
   */
  formatMessageTime: function(timestamp) {
    if (!timestamp) return '';
    
    try {
      let date;
      if (typeof timestamp === 'number') {
        date = new Date(timestamp * 1000);
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diff = now - date;
      const diffMinutes = diff / (1000 * 60);
      const diffHours = diff / (1000 * 60 * 60);
      const diffDays = diff / (1000 * 60 * 60 * 24);
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${Math.floor(diffMinutes)} min ago`;
      } else if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 2) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  },
  
  /**
   * Format last seen for display
   */
  formatLastSeen: function(timestamp, isOnline = false) {
    if (!timestamp) return 'Offline';
    if (isOnline) return 'Online now';
    
    try {
      let date;
      if (typeof timestamp === 'number') {
        date = new Date(timestamp * 1000);
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) return 'Offline';
      
      const now = new Date();
      const diff = now - date;
      const diffMinutes = diff / (1000 * 60);
      const diffHours = diff / (1000 * 60 * 60);
      const diffDays = diff / (1000 * 60 * 60 * 24);
      
      if (diffMinutes < 1) {
        return 'Just now';
      }
      
      if (diffMinutes < 60) {
        return `Last seen ${Math.floor(diffMinutes)} min ago`;
      }
      
      if (diffHours < 24 && date.getDate() === now.getDate()) {
        return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      if (diffDays < 2) {
        return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      if (diffDays < 7) {
        return `Last seen ${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
      
    } catch (error) {
      console.error('Error formatting last seen:', error);
      return 'Offline';
    }
  },
  
  /**
   * Validate that a user has access to a chat
   */
  validateChatAccess: async function(chatId, userId) {
    try {
      const chatDoc = await db.collection('chats').doc(chatId).get();
      
      if (!chatDoc.exists) {
        return { valid: false, error: 'Chat not found' };
      }
      
      const chatData = chatDoc.data();
      
      if (!chatData.participants || !chatData.participants.includes(userId)) {
        return { valid: false, error: 'You do not have access to this chat' };
      }
      
      return { valid: true, chatData };
      
    } catch (error) {
      console.error('Error validating chat access:', error);
      return { valid: false, error: 'Failed to validate chat access' };
    }
  },
  
  /**
   * Mark a chat as read for a user
   */
  markChatAsRead: async function(chatId, userId) {
    if (!chatId || !userId) return;
    
    try {
      const chatRef = db.collection('chats').doc(chatId);
      
      await chatRef.update({
        [`lastRead.${userId}`]: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      const chatDoc = await chatRef.get();
      if (chatDoc.exists) {
        const chatData = chatDoc.data();
        if (chatData.lastSenderId && chatData.lastSenderId !== userId) {
          // Could update a counter here if needed
        }
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  },
  
  /**
   * Delete a message (soft delete or hard delete based on permissions)
   */
  deleteMessage: async function(chatId, messageId, userId) {
    if (!chatId || !messageId || !userId) {
      throw new Error('Chat ID, message ID, and user ID are required');
    }
    
    try {
      const messageRef = db.collection('chats').doc(chatId)
        .collection('messages').doc(messageId);
      
      const messageDoc = await messageRef.get();
      
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }
      
      const messageData = messageDoc.data();
      
      if (messageData.senderId !== userId) {
        throw new Error('You can only delete your own messages');
      }
      
      await messageRef.update({
        text: '[Message deleted]',
        deleted: true,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
      
    } catch (error) {
      
      throw error;
    }
  }
};

// Export for use in other files
window.ChatHelpers = ChatHelpers;