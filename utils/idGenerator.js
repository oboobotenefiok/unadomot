// utils/idGenerator.js
const IDGenerator = {
  
  CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  CODE_LENGTH: 6,
  
  // ===== LISTING CODE FUNCTIONS (already existing) =====
  generateListingCode: async function() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateCode = `${year}${month}${day}`;
    
    const counterRef = db.collection('dailyCounters').doc(dateCode);
    
    const newCounter = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const currentCounter = doc.exists ? doc.data().counter : 0;
      const nextCounter = currentCounter + 1;
      transaction.set(counterRef, { counter: nextCounter, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      return nextCounter;
    });
    
    const counterPadded = String(newCounter).padStart(3, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 5).toLowerCase();
    
    return `${dateCode}-${counterPadded}-${randomSuffix}`;
  },
  
  validateListingCode: function(code) {
    if (!code) return false;
    const pattern = /^\d{6}-\d{3}-[a-z0-9]{3}$/;
    return pattern.test(code);
  },
  
  extractDateFromCode: function(code) {
    if (!this.validateListingCode(code)) return null;
    const datePart = code.split('-')[0];
    const year = 2000 + parseInt(datePart.slice(0, 2));
    const month = parseInt(datePart.slice(2, 4)) - 1;
    const day = parseInt(datePart.slice(4, 6));
    return new Date(year, month, day);
  },
  
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
        return code;
      }
    }
    throw new Error('Could not generate unique listing code after ' + maxAttempts + ' attempts');
  },
  
  // ===== NEW: Generate permanent username from name =====
  // Format: {firstName}{lastInitial}{4randomNumbers}
  // Example: John Doe → johnd1234
  generateUsernameFromName: function(fullName) {
    if (!fullName) return null;
    
    // Clean and split name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    // Get first 4 letters of first name (pad with random letters if shorter)
    let firstPart = firstName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    while (firstPart.length < 4) {
      firstPart += String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
    }
    
    // Get last initial (first letter of last name, or random if no last name)
    let lastInitial = '';
    if (lastName && lastName.length > 0) {
      lastInitial = lastName.toLowerCase().replace(/[^a-z]/g, '').charAt(0);
    }
    if (!lastInitial) {
      lastInitial = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    
    // Generate 4 random numbers
    const randomNum = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
    
    return `${firstPart}${lastInitial}${randomNum}`;
  },
  
  // ===== NEW: Ensure username is unique (with retry) =====
  generateUniqueUsername: async function(fullName, maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const username = this.generateUsernameFromName(fullName);
      const exists = await this.checkUsernameExists(username);
      if (!exists) return username;
    }
    // Fallback: add timestamp
    const fallback = this.generateUsernameFromName(fullName);
    return `${fallback}${Date.now().toString().slice(-2)}`;
  },
  
  // ===== USERNAME FUNCTIONS (existing, keep) =====
  generateUsernameSuggestion: function(name) {
    if (!name) return '';
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
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