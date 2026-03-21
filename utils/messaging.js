

if (!firebase.messaging) {
}

let messaging = null;
let currentToken = null;

try {
  if (firebase.messaging) {
    messaging = firebase.messaging();
  }
} catch (err) {
}

const MessagingHelpers = {
  
  requestPermission: async function(userId) {
    if (!messaging) {
      throw new Error('Firebase Messaging not available');
    }

    try {
      
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      
      const token = await messaging.getToken({
        vapidKey: 'BJKy1_revy36h8_HyS_nYcKDHbBHMyDAYat_Ge0_5N2e_27yP62yZdjV7GrlsVZgURlPeVKgpIgQJCCQV5K6OOY' 
      });

      
      if (userId && token) {
        await db.collection('users').doc(userId).update({
          [`fcmTokens.${token}`]: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      currentToken = token;
      return token;

    } catch (err) {
      throw err;
    }
  },

  
  deleteToken: async function(userId) {
    if (!messaging || !currentToken || !userId) return;

    try {
      
      await db.collection('users').doc(userId).update({
        [`fcmTokens.${currentToken}`]: firebase.firestore.FieldValue.delete()
      });

      
      await messaging.deleteToken(currentToken);
      currentToken = null;

    } catch (err) {
    }
  },

  
  onMessage: function(callback) {
    if (!messaging) return;

    return messaging.onMessage((payload) => {
      
      
      if (callback) {
        callback(payload);
      } else {
        
        if (payload.notification) {
          const notification = new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/vault/img/unadomot.jpg',
            badge: '/vault/img/unadomot.jpg',
            data: payload.data
          });

          notification.onclick = function() {
            if (payload.data && payload.data.chatId) {
              window.focus();
              if (window.__navigate) {
                window.__navigate('/chat?chat=' + payload.data.chatId);
              }
            }
          };
        }
      }
    });
  },

  
  isSupported: function() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           messaging !== null;
  },

  
  getPermissionStatus: function() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
};

window.MessagingHelpers = MessagingHelpers;