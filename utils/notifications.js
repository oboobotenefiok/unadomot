// utils/notifications.js - With Email Verification Support
const NotificationHelpers = {
  unreadCounts: {},
  listeners: {},
  messageListeners: {}, // Separate listeners for chat badge
  
  init: async function(userId) {
    if (!userId) return;
    
    if (window.MessagingHelpers && MessagingHelpers.isSupported()) {
      const status = MessagingHelpers.getPermissionStatus();
      
      if (status === 'granted') {
        try {
          await MessagingHelpers.requestPermission(userId);
        } catch (err) {
          console.error('Error requesting notification permission:', err);
        }
      }
    }
  },
  
  requestPushPermission: async function(userId) {
    if (!window.MessagingHelpers) return false;
    
    try {
      await MessagingHelpers.requestPermission(userId);
      return true;
    } catch (err) {
      console.error('Error requesting push permission:', err);
      return false;
    }
  },
  
  // ===== NEW: Check verification status and send reminder =====
  checkVerificationStatus: function(user) {
    if (!user) return null;
    
    // Only check email/password users
    const isEmailUser = user.providerData?.some(p => p.providerId === 'password');
    if (!isEmailUser) return null;
    
    if (!user.emailVerified) {
      return {
        needsVerification: true,
        message: 'Please verify your email to comment, message, and post listings.'
      };
    }
    
    return null;
  },
  
  // ===== NEW: Show verification reminder banner =====
  showVerificationReminder: function(user) {
    const status = this.checkVerificationStatus(user);
    if (!status) return null;
    
    // Create and show a persistent but dismissible banner
    const bannerId = 'verification-reminder';
    
    // Check if already shown and dismissed
    if (localStorage.getItem('verification-reminder-dismissed')) {
      const dismissedTime = parseInt(localStorage.getItem('verification-reminder-dismissed'));
      // Show again after 24 hours if still not verified
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return null;
      }
    }
    
    // Dispatch event to show banner
    const event = new CustomEvent('show-verification-reminder', {
      detail: { message: status.message }
    });
    window.dispatchEvent(event);
    
    return bannerId;
  },
  
  // ===== FOR CHAT ICON (Message counts only) =====
  listenToMessageCount: function(userId, callback) {
    if (!userId) return () => {};
    
    if (!this.messageListeners[userId]) {
      this.messageListeners[userId] = [];
    }
    this.messageListeners[userId].push(callback);
    
    callback(this.unreadCounts[userId] || 0);
    
    const processUnreadMessages = async () => {
      try {
        // Get all user's chats and check unread
        const chatsResult = await FirestoreQueries.query({
          collection: 'chats',
          where: [['participants', 'array-contains', userId]],
          limit: 100
        });
        
        let totalUnread = 0;
        
        // For each chat, check unread messages
        for (const chat of chatsResult.data) {
          const chatRef = db.collection('chats').doc(chat.id);
          const messagesResult = await FirestoreQueries.query({
            collection: 'messages',
            ref: chatRef,
            where: [
              ['read', '==', false],
              ['senderId', '!=', userId]
            ],
            limit: 1
          });
          
          if (messagesResult.data.length > 0) {
            totalUnread++;
          }
        }
        
        const displayCount = totalUnread > 99 ? '99+' : totalUnread;
        
        this.unreadCounts[userId] = displayCount;
        
        if (this.messageListeners[userId]) {
          this.messageListeners[userId].forEach(cb => cb(displayCount));
        }
        
        this.updateTabTitle(userId, displayCount);
        
      } catch (error) {
        console.error('Error processing unread messages:', error);
      }
    };
    
    // Try real-time listener first
    try {
      const messagesRef = db.collectionGroup('messages')
        .where('read', '==', false)
        .where('senderId', '!=', userId);
      
      const unsubscribe = messagesRef.onSnapshot(
        async () => {
          await processUnreadMessages();
        },
        (error) => {
          console.error('Error in messages snapshot, falling back to polling:', error);
          // Fallback to polling
          const interval = setInterval(processUnreadMessages, 30000);
          return () => clearInterval(interval);
        }
      );
      
      return () => {
        unsubscribe();
        if (this.messageListeners[userId]) {
          this.messageListeners[userId] = this.messageListeners[userId].filter(cb => cb !== callback);
        }
      };
    } catch (error) {
      console.error('Error setting up message listener, using polling:', error);
      // Fallback to polling
      const interval = setInterval(processUnreadMessages, 30000);
      
      return () => {
        clearInterval(interval);
        if (this.messageListeners[userId]) {
          this.messageListeners[userId] = this.messageListeners[userId].filter(cb => cb !== callback);
        }
      };
    }
  },
  
  // ===== BACKWARD COMPATIBILITY =====
  listenToUnreadCount: function(userId, callback) {
    return this.listenToMessageCount(userId, callback);
  },
  
  // ===== FOR BELL ICON (System notifications only) =====
  listenToSystemNotifications: function(userId, callback) {
    if (!userId) return () => {};
    
    if (!this.listeners[userId]) {
      this.listeners[userId] = [];
    }
    this.listeners[userId].push(callback);
    
    // Initial callback with empty array
    callback([]);
    
    // Set up listener for user's notifications subcollection
    const userNotificationsRef = db.collection('users').doc(userId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50);
    
    const unsubscribe = userNotificationsRef.onSnapshot((snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update unread count for bell badge
      const unreadCount = notifications.filter(n => !n.read).length;
      
      if (this.listeners[userId]) {
        this.listeners[userId].forEach(cb => cb(notifications));
      }
      
      // Also update tab title for unread system notifications
      if (unreadCount > 0) {
        this.updateTabTitle(userId, unreadCount);
      }
    });
    
    return () => {
      unsubscribe();
      if (this.listeners[userId]) {
        this.listeners[userId] = this.listeners[userId].filter(cb => cb !== callback);
      }
    };
  },
  
  updateTabTitle: function(userId, count) {
    const baseTitle = 'UnaDomot';
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  },
  
  markChatAsRead: async function(chatId, userId) {
    if (!chatId || !userId) return;
    
    try {
      await db.collection('chats').doc(chatId).update({
        [`lastRead.${userId}`]: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      const chatRef = db.collection('chats').doc(chatId);
      const messagesRef = chatRef.collection('messages');
      
      const result = await FirestoreQueries.query({
        collection: 'messages',
        ref: chatRef,
        where: [
          ['read', '==', false],
          ['senderId', '!=', userId]
        ],
        limit: 50
      });
      
      if (result.data.length > 0) {
        const batch = db.batch();
        result.data.forEach(message => {
          batch.update(messagesRef.doc(message.id), { read: true });
        });
        await batch.commit();
      }
      
      this.unreadCounts[userId] = 0;
      
      if (this.messageListeners[userId]) {
        this.messageListeners[userId].forEach(cb => cb(0));
      }
      
      this.updateTabTitle(userId, 0);
      
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  },
  
  // ===== Mark a system notification as read =====
  markNotificationAsRead: async function(userId, notificationId) {
    if (!userId || !notificationId) return;
    
    try {
      await db.collection('users').doc(userId)
        .collection('notifications').doc(notificationId)
        .update({
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },
  
  // ===== Mark all notifications as read =====
  markAllNotificationsAsRead: async function(userId) {
    if (!userId) return;
    
    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('notifications')
        .where('read', '==', false)
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
  
  // ===== Add a system notification (legacy method) =====
  addSystemNotification: function(userId, notification) {
    const systemNotification = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      read: false,
      timestamp: Date.now(),
      ...notification
    };
    
    if (this.listeners[userId]) {
      this.listeners[userId].forEach(cb => cb([systemNotification]));
    }
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/vault/img/unadomot.jpg',
        badge: '/vault/img/unadomot.jpg',
        data: notification
      });
    }
  },
  
  // ===== Get unread count for bell icon =====
  getUnreadCount: async function(userId) {
    if (!userId) return 0;
    
    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('notifications')
        .where('read', '==', false)
        .count()
        .get();
      
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },
  
  // ===== NEW: Add verification reminder notification =====
  addVerificationReminder: function(userId) {
    const notification = {
      type: 'verification_reminder',
      title: '🔔 Verify Your Email',
      body: 'Please verify your email to comment, message, and post listings.',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      persistent: true
    };
    
    // Add to Firestore notifications
    db.collection('users').doc(userId)
      .collection('notifications')
      .add(notification)
      .catch(err => console.error('Error adding verification reminder:', err));
    
    return notification;
  }
};

window.NotificationHelpers = NotificationHelpers;