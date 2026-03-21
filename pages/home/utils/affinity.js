// pages/home/utils/affinity.js
const AffinityHelpers = {
  // Load affinity from localStorage
  loadAffinity: function() {
    try {
      return JSON.parse(localStorage.getItem('ud_affinity') || '{}');
    } catch(e) { 
      return {}; 
    }
  },

  // Save affinity when user interacts with a listing
  saveAffinity: function(listing) {
    if (!listing) return;
    
    const affinity = this.loadAffinity();
    
    if (listing.propertyType) {
      affinity['type_' + listing.propertyType] = (affinity['type_' + listing.propertyType] || 0) + 1;
    }
    if (listing.state) {
      affinity['state_' + listing.state] = (affinity['state_' + listing.state] || 0) + 1;
    }
    if (listing.bedrooms) {
      affinity['bed_' + listing.bedrooms] = (affinity['bed_' + listing.bedrooms] || 0) + 1;
    }
    
    try { 
      localStorage.setItem('ud_affinity', JSON.stringify(affinity)); 
    } catch(e) {}
  },

  // Get user preferences based on affinity
  getUserPreferences: function() {
    return this.loadAffinity();
  },

  // Clear all affinity data
  clearAffinity: function() {
    try {
      localStorage.removeItem('ud_affinity');
    } catch(e) {}
  }
};

window.AffinityHelpers = AffinityHelpers;