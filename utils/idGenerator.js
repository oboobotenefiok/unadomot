

const IDGenerator = {
  
  CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  CODE_LENGTH: 6, 
  
  
  
  
  
  
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
  
  
  
  
  
  
  generateListingCode: function() {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CODE_CHARS.length);
      code += this.CODE_CHARS[randomIndex];
    }
    
    code += this.calculateChecksum(code);
    return code;
  },
  
  
  calculateChecksum: function(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    return this.CODE_CHARS[sum % this.CODE_CHARS.length];
  },
  
  
  validateListingCode: function(code) {
    if (!code || code.length !== this.CODE_LENGTH + 1) return false;
    const data = code.slice(0, this.CODE_LENGTH);
    const checksum = code[this.CODE_LENGTH];
    return checksum === this.calculateChecksum(data);
  },
  
  
  generateUniqueListingCode: async function(maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = this.generateListingCode();
      
      try {
        const snapshot = await db.collection('listings')
          .where('shortCode', '==', code)
          .limit(1)
          .get();
        
        if (snapshot.empty) return code;
      } catch (error) {
        
        return code;
      }
    }
    throw new Error('Could not generate unique listing code after ' + maxAttempts + ' attempts');
  },
  
  
  
  
  
  
  getProfileUrl: function(username) {
    if (!username) return null;
    return '/u/' + username;
  },
  
  
  getListingUrl: function(shortCode) {
    if (!shortCode) return null;
    return '/l/' + shortCode;
  },
  
  
  extractUsernameFromUrl: function(url) {
    const match = url.match(/\/u\/([a-z0-9_]+)/);
    return match ? match[1] : null;
  },
  
  
  extractShortCodeFromUrl: function(url) {
    const match = url.match(/\/l\/([A-Z2-9]{7})/);
    return match ? match[1] : null;
  }
};

window.IDGenerator = IDGenerator;

