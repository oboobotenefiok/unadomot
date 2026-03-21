
const SanitizeHelpers = {
  
  escapeHtml: function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  
  sanitizeMessage: function(text) {
    if (!text) return '';
    
    
    let sanitized = this.escapeHtml(text);
    
    
    
    
    return sanitized;
  },
  
  
  sanitizeText: function(text, maxLength = 500) {
    if (!text) return '';
    
    let sanitized = text.trim().slice(0, maxLength);
    
    return this.escapeHtml(sanitized);
  },
  
  
  sanitizeUrl: function(url) {
    if (!url) return '';
    
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('/')) {
      
      return url.replace(/javascript:/gi, '').replace(/<script>/gi, '');
    }
    return '';
  },
  
  
  sanitizeListing: function(listing) {
    if (!listing) return listing;
    
    const sanitized = { ...listing };
    
    
    if (sanitized.title) sanitized.title = this.escapeHtml(sanitized.title.slice(0, 200));
    if (sanitized.description) sanitized.description = this.escapeHtml(sanitized.description.slice(0, 5000));
    if (sanitized.address) sanitized.address = this.escapeHtml(sanitized.address.slice(0, 200));
    
    
    if (sanitized.amenities) {
      sanitized.amenities = sanitized.amenities.map(a => this.escapeHtml(a.slice(0, 100)));
    }
    
    return sanitized;
  }
};

window.SanitizeHelpers = SanitizeHelpers;