// pages/listing-detail/utils/commentHelpers.js
const CommentHelpers = {
  sanitizeComment: function(text) {
    if (!text) return '';
    
    let sanitized = text.replace(/<[^>]*>/g, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/onerror=/gi, '');
    sanitized = sanitized.replace(/onload=/gi, '');
    sanitized = sanitized.replace(/onclick=/gi, '');
    sanitized = sanitized.replace(/eval\(/gi, '');
    sanitized = sanitized.slice(0, 500); // Use constant or default
    
    const div = document.createElement('div');
    div.textContent = sanitized;
    return div.innerHTML;
  },
  
  formatTime: function(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    return date.toLocaleDateString();
  },
  
  createOptimisticComment: function(user, text) {
    return {
      id: 'temp_' + Date.now(),
      userId: user.uid,
      text: this.sanitizeComment(text),
      createdAt: { seconds: Date.now() / 1000 },
      user: {
        id: user.uid,
        name: user.displayName || 'User',
        photoURL: user.photoURL
      },
      isTemp: true
    };
  },
  
  getUserInitials: function(name) {
    return (name || 'U').charAt(0).toUpperCase();
  }
};

window.CommentHelpers = CommentHelpers;