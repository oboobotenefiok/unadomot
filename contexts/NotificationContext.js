// contexts/NotificationContext.js - UNIFIED NOTIFICATION STATE
// Same notification state for all views

const NotificationContext = React.createContext({
  notifications: [],
  unreadCount: 0,
  preferences: {
    enabled: false,
    lastPrompted: null,
    promptCount: 0,
    messageNotifications: true,
    listingNotifications: true,
    reminderNotifications: true,
    soundEnabled: true
  },
  showBellPopover: false,
  setShowBellPopover: () => {},
  toggleNotifications: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
  updatePreferences: () => {},
  addNotification: () => {}
});

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = React.useState([]);
  const [preferences, setPreferences] = React.useState(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      lastPrompted: null,
      promptCount: 0,
      messageNotifications: true,
      listingNotifications: true,
      reminderNotifications: true,
      soundEnabled: true
    };
  });
  const [showBellPopover, setShowBellPopover] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  
  const user = auth?.currentUser;
  const promptIntervalRef = React.useRef(null);
  const notificationSound = React.useRef(null);
  
  React.useEffect(() => {
    notificationSound.current = new Audio('/sounds/notification.mp3');
  }, []);
  
  React.useEffect(() => {
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
  }, [preferences]);
  
  React.useEffect(() => {
    if (!user || preferences.enabled) return;
    
    const checkShouldPrompt = () => {
      const now = Date.now();
      const lastPrompted = preferences.lastPrompted;
      const promptCount = preferences.promptCount;
      
      if (promptCount >= 3) return false;
      
      if (!lastPrompted) return true;
      
      const daysSinceLastPrompt = (now - lastPrompted) / (1000 * 60 * 60 * 24);
      return daysSinceLastPrompt >= 1;
    };
    
    promptIntervalRef.current = setInterval(() => {
      if (checkShouldPrompt() && !showBellPopover) {
        const lastActive = localStorage.getItem('last_active');
        if (lastActive && (Date.now() - parseInt(lastActive)) < 30 * 60 * 1000) {
          setShowBellPopover(true);
          setPreferences(prev => ({
            ...prev,
            lastPrompted: Date.now(),
            promptCount: prev.promptCount + 1
          }));
        }
      }
    }, 60 * 60 * 1000);
    
    return () => {
      if (promptIntervalRef.current) {
        clearInterval(promptIntervalRef.current);
      }
    };
  }, [user, preferences.enabled, preferences.lastPrompted, preferences.promptCount, showBellPopover]);
  
  React.useEffect(() => {
    const updateLastActive = () => {
      localStorage.setItem('last_active', Date.now().toString());
    };
    
    window.addEventListener('click', updateLastActive);
    window.addEventListener('keydown', updateLastActive);
    window.addEventListener('scroll', updateLastActive);
    
    return () => {
      window.removeEventListener('click', updateLastActive);
      window.removeEventListener('keydown', updateLastActive);
      window.removeEventListener('scroll', updateLastActive);
    };
  }, []);
  
  // Listen for system notifications (non-message)
  React.useEffect(() => {
    if (!user || !preferences.enabled) return;
    
    // Listen for user's notifications subcollection
    const unsubscribe = db.collection('users').doc(user.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot((snapshot) => {
        const newNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.seconds ? doc.data().createdAt.seconds * 1000 : Date.now()
        }));
        
        setNotifications(newNotifications);
        
        const unread = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        // Play sound for new notifications if enabled
        if (preferences.soundEnabled && newNotifications.length > notifications.length) {
          notificationSound.current?.play().catch(() => {});
        }
      }, (error) => {
        console.error('Error listening to notifications:', error);
      });
    
    return () => unsubscribe();
  }, [user, preferences.enabled, preferences.soundEnabled]);
  
  const addNotification = (notification) => {
    // Don't add message notifications to bell
    if (notification.type === 'message') {
      return;
    }
    
    // Add to Firestore
    if (user) {
      db.collection('users').doc(user.uid)
        .collection('notifications')
        .add({
          ...notification,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(err => console.error('Error adding notification:', err));
    }
  };
  
  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Update in Firestore
    if (user) {
      db.collection('users').doc(user.uid)
        .collection('notifications').doc(notificationId)
        .update({ read: true })
        .catch(err => console.error('Error marking notification as read:', err));
    }
  };
  
  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Update in Firestore
    if (user && unreadIds.length > 0) {
      const batch = db.batch();
      unreadIds.forEach(id => {
        const ref = db.collection('users').doc(user.uid)
          .collection('notifications').doc(id);
        batch.update(ref, { read: true });
      });
      batch.commit().catch(err => console.error('Error marking all as read:', err));
    }
  };
  
  const clearAll = () => {
    const notificationIds = notifications.map(n => n.id);
    
    setNotifications([]);
    setUnreadCount(0);
    
    // Delete from Firestore
    if (user && notificationIds.length > 0) {
      const batch = db.batch();
      notificationIds.forEach(id => {
        const ref = db.collection('users').doc(user.uid)
          .collection('notifications').doc(id);
        batch.delete(ref);
      });
      batch.commit().catch(err => console.error('Error clearing notifications:', err));
    }
  };
  
  const toggleNotifications = async () => {
    const newState = !preferences.enabled;
    
    if (newState) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Please allow notifications in your browser settings to enable this feature.');
          return;
        }
      }
      
      if (window.MessagingHelpers && user) {
        try {
          await MessagingHelpers.requestPermission(user.uid);
        } catch (err) {
          console.error('Error requesting messaging permission:', err);
        }
      }
    }
    
    setPreferences(prev => ({ ...prev, enabled: newState }));
  };
  
  const updatePreferences = (newPrefs) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  };
  
  // Filter out any message notifications
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter(n => n.type !== 'message');
  }, [notifications]);
  
  const filteredUnreadCount = React.useMemo(() => {
    return filteredNotifications.filter(n => !n.read).length;
  }, [filteredNotifications]);
  
  const value = {
    notifications: filteredNotifications,
    unreadCount: filteredUnreadCount,
    preferences,
    showBellPopover,
    setShowBellPopover,
    toggleNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    updatePreferences,
    addNotification
  };
  
  return React.createElement(NotificationContext.Provider, { value }, children);
}

window.NotificationContext = NotificationContext;
window.NotificationProvider = NotificationProvider;
window.useNotifications = () => React.useContext(NotificationContext);