// utils/idGenerator.js
const IDGenerator = {
  
  CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  CODE_LENGTH: 6,
  
  // ===== NEW: Generate listing code with date + counter + random =====
  generateListingCode: async function() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateCode = `${year}${month}${day}`;
    
    // Get next counter for today (atomic increment)
    const counterRef = db.collection('dailyCounters').doc(dateCode);
    
    const newCounter = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const currentCounter = doc.exists ? doc.data().counter : 0;
      const nextCounter = currentCounter + 1;
      transaction.set(counterRef, { counter: nextCounter, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      return nextCounter;
    });
    
    // Format counter with leading zeros (001, 002, etc.)
    const counterPadded = String(newCounter).padStart(3, '0');
    
    // Generate random 3-character suffix
    const randomSuffix = Math.random().toString(36).substring(2, 5).toLowerCase();
    
    return `${dateCode}-${counterPadded}-${randomSuffix}`;
  },
  
  // ===== NEW: Validate listing code format =====
  validateListingCode: function(code) {
    if (!code) return false;
    // Format: YYMMDD-XXX-CCC (e.g., 250322-001-a1b)
    const pattern = /^\d{6}-\d{3}-[a-z0-9]{3}$/;
    return pattern.test(code);
  },
  
  // ===== NEW: Extract date from listing code =====
  extractDateFromCode: function(code) {
    if (!this.validateListingCode(code)) return null;
    const datePart = code.split('-')[0];
    const year = 2000 + parseInt(datePart.slice(0, 2));
    const month = parseInt(datePart.slice(2, 4)) - 1;
    const day = parseInt(datePart.slice(4, 6));
    return new Date(year, month, day);
  },
  
  // ===== NEW: Generate unique listing code with retry =====
  generateUniqueListingCode: async function(maxAttempts = 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = await this.generateListingCode();
      
      try {
        const snapshot = await db.collection('listings')
          .where('listingCode', '==', code)
          .limit(1)
          .get();
        
        if (snapshot.empty) return code;
      } catch (error) {
        // If query fails, still return the code (will be caught later)
        return code;
      }
    }
    throw new Error('Could not generate unique listing code after ' + maxAttempts + ' attempts');
  },
  
  // ===== USERNAME FUNCTIONS (unchanged) =====
  generateUsernameSuggestion: function(name) {
    if (!name) return '';
    
    const base = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12);
    
    const random = Math.random().toString(36).substring(2, 5);
    
    return base + random;
  },
  
  validateUsername: function(username) {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-z0-9_]+$/.test(username)) {
      return 'Username can only contain lowercase letters, numbers, and underscores';
    }
    return null;
  },
  
  checkUsernameExists: async function(username, excludeUserId = null) {
    if (!username) return false;
    
    try {
      const snapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (snapshot.empty) return false;
      
      if (excludeUserId && snapshot.docs[0].id === excludeUserId) return false;
      
      return true;
    } catch (error) {
      return true;
    }
  },
  
  // ===== URL HELPERS (updated) =====
  getProfileUrl: function(username) {
    if (!username) return null;
    return '/' + username;
  },
  
  getListingUrl: function(listingCode) {
    if (!listingCode) return null;
    return '/listing/' + listingCode;
  },
  
  extractUsernameFromUrl: function(url) {
    const match = url.match(/^\/([a-z0-9_]+)(?:\/|$)/);
    return match ? match[1] : null;
  },
  
  extractListingCodeFromUrl: function(url) {
    const match = url.match(/\/listing\/(\d{6}-\d{3}-[a-z0-9]{3})/);
    return match ? match[1] : null;
  }
};

window.IDGenerator = IDGenerator;