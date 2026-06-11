// services/firebase.js - COMPLETE VERSION (NO CONSOLE LOGS)
// Firebase configuration and initialization

const firebaseConfig = {
  apiKey: window.__ENV.FIREBASE_API_KEY,
  authDomain: window.__ENV.FIREBASE_AUTH_DOMAIN,
  projectId: window.__ENV.FIREBASE_PROJECT_ID,
  storageBucket: window.__ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.__ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: window.__ENV.FIREBASE_APP_ID,
  measurementId: window.__ENV.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence for Firestore (handles multi-tab gracefully)
db.enablePersistence({ synchronizeTabs: true })
  .then(() => {})
  .catch((err) => {});

// Make services globally available
window.auth = auth;
window.db = db;
window.storage = storage;

// Set auth session persistence to LOCAL (survives browser restarts)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {})
  .catch((err) => {});

// ===== ENHANCED PRESENCE SYSTEM FOR ONLINE/OFFLINE STATUS =====
let presenceInterval = null;
let currentUserId = null;
let isOfflineTimer = null;
let heartbeatRef = null;

// Function to update user status
const updateUserStatus = async (userId, isOnline) => {
  if (!userId) return;
  
  try {
    await db.collection('users').doc(userId).update({
      isOnline: isOnline,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      ...(isOnline ? {} : { lastSeen: firebase.firestore.FieldValue.serverTimestamp() })
    });
  } catch (err) {}
};

// Handle when user goes offline
const goOffline = () => {
  if (currentUserId) {
    updateUserStatus(currentUserId, false);
  }
  
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
  
  if (heartbeatRef && currentUserId) {
    heartbeatRef.delete().catch(() => {});
    heartbeatRef = null;
  }
};

// Handle when user comes online
const goOnline = (userId) => {
  currentUserId = userId;
  
  if (isOfflineTimer) {
    clearTimeout(isOfflineTimer);
    isOfflineTimer = null;
  }
  
  updateUserStatus(userId, true);
  
  const tabId = Math.random().toString(36).substr(2, 9);
  heartbeatRef = db.collection('heartbeats').doc(userId + '_' + tabId);
  heartbeatRef.set({
    userId: userId,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    tabId: tabId
  }).catch(() => {});
  
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(() => {
    if (currentUserId && navigator.onLine) {
      if (heartbeatRef) {
        heartbeatRef.update({
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
      
      db.collection('users').doc(currentUserId).update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        isOnline: true
      }).catch(() => {});
    }
  }, 30000);
};

// ===== DETECT TAB/WINDOW CLOSE =====
window.addEventListener('beforeunload', function() {
  goOffline();
});

// ===== DETECT NETWORK CHANGES =====
window.addEventListener('online', function() {
  if (currentUserId) {
    goOnline(currentUserId);
    
    const toastEvent = new CustomEvent('show-toast', {
      detail: { message: '✅ Back online!', type: 'success' }
    });
    window.dispatchEvent(toastEvent);
  }
});

window.addEventListener('offline', function() {
  goOffline();
  
  const toastEvent = new CustomEvent('show-toast', {
    detail: { message: '📡 You are offline', type: 'warning' }
  });
  window.dispatchEvent(toastEvent);
});

// ===== CLEAN UP OLD HEARTBEATS =====
setInterval(async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  try {
    const oldHeartbeats = await db.collection('heartbeats')
      .where('timestamp', '<', fiveMinutesAgo)
      .get();
    
    const batch = db.batch();
    oldHeartbeats.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (oldHeartbeats.size > 0) {
      await batch.commit();
    }
  } catch (err) {}
}, 300000);

// ===== CHECK FOR STALE ONLINE USERS =====
setInterval(async () => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
  try {
    const activeHeartbeats = await db.collection('heartbeats')
      .where('timestamp', '>', oneMinuteAgo)
      .get();
    
    const activeUserIds = new Set();
    activeHeartbeats.docs.forEach(doc => {
      activeUserIds.add(doc.data().userId);
    });
    
    const usersRef = db.collection('users');
    const onlineUsers = await usersRef.where('isOnline', '==', true).get();
    
    const batch = db.batch();
    onlineUsers.docs.forEach(doc => {
      if (!activeUserIds.has(doc.id)) {
        batch.update(doc.ref, {
          isOnline: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    if (onlineUsers.size > 0) {
      await batch.commit();
    }
  } catch (err) {}
}, 60000);

// ===== LISTEN TO AUTH STATE =====
auth.onAuthStateChanged((user) => {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
  
  if (isOfflineTimer) {
    clearTimeout(isOfflineTimer);
    isOfflineTimer = null;
  }
  
  if (heartbeatRef) {
    heartbeatRef.delete().catch(() => {});
    heartbeatRef = null;
  }
  
  currentUserId = user?.uid || null;
  
  if (user) {
    if (navigator.onLine) {
      goOnline(user.uid);
    }

    // ===== GUARANTEED FIRESTORE VERIFICATION SYNC =====
    // Firebase Auth is the source of truth. When auth state fires and the Auth
    // object reports emailVerified=true, we ensure Firestore reflects that
    // regardless of which device or browser the user clicked the link on.
    // This is the only reliable place to guarantee the sync because it fires
    // on every session — including sessions on different devices where
    // verify-email.html had no auth.currentUser available at the time
    // applyActionCode() was called.
    //
    // The write is only issued for password-provider accounts (Google sign-in
    // users are considered verified automatically and do not have this field).
    // Using set() with merge:true makes this fully idempotent — safe to run
    // on every sign-in even if the field is already correct.
    const isPasswordProvider = user.providerData.some(
      (provider) => provider.providerId === 'password'
    );

    if (isPasswordProvider && user.emailVerified) {
      db.collection('users').doc(user.uid).set(
        {
          emailVerified: true,
          verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      ).catch(() => {});
    }

    // NOTE: Do NOT call sendEmailVerification here. Issuing a new oobCode on
    // every auth-state change immediately invalidates any previously sent
    // verification link still in the user's inbox.
    // Verification emails are sent once: immediately after account creation in
    // SignupForm.js. Resending is handled explicitly via verify-email.html.
  } else {
    goOffline();
  }
});

// ===== HELPER FUNCTIONS =====
window.checkEmailVerification = function(user, action) {
  if (!user) {
    return {
      allowed: false,
      message: 'Please log in to ' + action
    };
  }
  
  if (!user.emailVerified && user.providerData.some(provider => provider.providerId === 'password')) {
    return {
      allowed: false,
      message: 'Please verify your email to ' + action + '. Check your inbox for the verification link.'
    };
  }
  
  return {
    allowed: true,
    message: ''
  };
};

// ===== CHANGED: Use verify-email.html in resend function too =====
window.resendVerificationEmail = async function(user) {
  if (!user) return false;
  try {
    await user.sendEmailVerification({
      url: window.location.origin + '/verify-email.html',
      handleCodeInApp: true
    });
    return true;
  } catch (err) {
    return false;
  }
};

// ===== GET LAST SEEN FORMAT =====
window.getLastSeenText = function(lastSeen, isOnline) {
  if (isOnline) return 'Online now';
  if (!lastSeen) return 'Offline';
  
  try {
    let date;
    if (typeof lastSeen === 'number') {
      date = new Date(lastSeen * 1000);
    } else if (lastSeen && typeof lastSeen.toDate === 'function') {
      date = lastSeen.toDate();
    } else if (lastSeen instanceof Date) {
      date = lastSeen;
    } else {
      date = new Date(lastSeen);
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
      return `${Math.floor(diffMinutes)} min ago`;
    }
    
    if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    }
    
    if (diffDays < 2) {
      return 'Yesterday';
    }
    
    if (diffDays < 7) {
      return `${Math.floor(diffDays)} days ago`;
    }
    
    return date.toLocaleDateString();
    
  } catch (error) {
    return 'Offline';
  }
};

// ===== FOR TESTING: Manual auth state check =====
window.checkAuthState = function() {
  const user = auth.currentUser;
  return user;
};
