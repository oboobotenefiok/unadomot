const CloudinaryHelpers = {
  get CLOUD_NAME() {
    return window.__ENV.CLOUDINARY_CLOUD_NAME;
  },

  getUrl: function(publicId, options = {}) {
    if (!publicId) return '/vault/img/no-image.jpg';
    if (publicId.startsWith('http')) return publicId; // Already a full URL
    
    const {
      width = 400,
        height = null,
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
        type = 'general' // 'card', 'detail', 'thumbnail', 'carousel'
    } = options;
    
    let transformations = [];
    
    if (crop) transformations.push(`c_${crop}`);
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    
    if (quality) transformations.push(`q_${quality}`);
    if (format) transformations.push(`f_${format}`);
    
    if (type === 'card') {
      transformations = [`c_fill,w_400,h_300,f_auto,q_auto`];
    } else if (type === 'detail') {
      transformations = [`c_fill,g_faces,w_1200,h_800,f_auto,q_auto:good`];
    } else if (type === 'thumbnail') {
      transformations = [`c_thumb,g_faces,w_100,h_100,f_auto,q_auto`];
    } else if (type === 'carousel') {
      transformations = [`c_fill,g_faces,w_800,h_450,f_auto,q_auto`];
    }
    
    const transformationString = Array.isArray(transformations) ?
      transformations.join(',') :
      transformations;
    
    return `https://res.cloudinary.com/${this.CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
  },
  
  getCardUrl: function(publicId) {
    return this.getUrl(publicId, { type: 'card' });
  },
  
  getDetailUrl: function(publicId) {
    return this.getUrl(publicId, { type: 'detail' });
  },
  
  getThumbnailUrl: function(publicId) {
    return this.getUrl(publicId, { type: 'thumbnail' });
  },
  
  getCarouselUrl: function(publicId) {
    return this.getUrl(publicId, { type: 'carousel' });
  }
};

window.CloudinaryHelpers = CloudinaryHelpers;
