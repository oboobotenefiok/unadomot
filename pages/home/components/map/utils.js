// pages/home/components/map/utils.js
// Shared utility functions

// ===== SMART COUNT FORMATTING - More compact at smaller sizes =====
window.formatClusterCount = function(count) {
  if (count >= 1000000) {
    const millions = Math.floor(count / 1000000);
    const remainder = count % 1000000;
    if (remainder > 0) {
      return `${millions}M+`;
    }
    return `${millions}M`;
  } else if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    const remainder = count % 1000;
    if (remainder > 0) {
      return `${thousands}K+`;
    }
    return `${thousands}K`;
  } else if (count >= 100) {
    const hundreds = Math.floor(count / 100);
    const remainder = count % 100;
    if (remainder > 0) {
      return `${hundreds}H+`;
    }
    return `${hundreds}H`;
  } else {
    return count.toString();
  }
};

// ===== DISTANCE CALCULATION (Haversine formula) =====
window.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ===== IMAGE URL HELPER - Updated to match card styling exactly =====
window.getListingImageUrl = function(listing, index = 0) {
  if (!listing.images || listing.images.length === 0) {
    return '/vault/img/no-image.jpg';
  }
  
  const imageId = listing.images[index];
  
  if (typeof imageId === 'string' && imageId.startsWith('http')) {
    return imageId;
  }
  
  // Use same card URL as listing cards for consistency
  if (window.CloudinaryHelpers && window.CloudinaryHelpers.getCardUrl) {
    return window.CloudinaryHelpers.getCardUrl(imageId);
  }
  
  return `https://res.cloudinary.com/djddnda47/image/upload/c_fill,w_400,h_300,f_auto,q_auto/unadomot/listings/${imageId}`;
};