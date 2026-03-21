
const ShareHelpers = {
  
  shareListing: async function(listing, options = {}) {
    if (!listing) {
      return false;
    }
    
    const {
      includePrice = true,
        includeLink = true,
        customMessage = null,
        onSuccess = null,
        onError = null,
        showToast = null 
    } = options;
    
    
    const shareUrl = window.location.origin + '/listing/' + listing.id;
    
    
    const shareTitle = listing.title || 'Check out this property';
    
    
    let shareText = '';
    
    if (customMessage) {
      shareText = customMessage;
    } else {
      
      const priceText = includePrice && listing.price ?
        ` - ₦${listing.price.toLocaleString()}/month` :
        '';
      
      shareText = `Check out this property: ${listing.title}${priceText}`;
    }
    
    const shareData = {
      title: shareTitle,
      text: shareText,
      url: includeLink ? shareUrl : undefined
    };
    
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        if (onSuccess) onSuccess();
        if (showToast) showToast('Shared successfully!', 'success');
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          if (onError) onError(err);
          if (showToast) showToast('Sharing cancelled', 'info');
        }
        return false;
      }
    }
    
    else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        if (onSuccess) onSuccess();
        if (showToast) showToast('Link copied to clipboard!', 'success');
        return true;
      } catch (err) {
        if (onError) onError(err);
        if (showToast) showToast('Failed to copy link', 'error');
        return false;
      }
    }
  },
  
  
  shareNaijaStyle: async function(listing, options = {}) {
    const messages = [
      `Abeg check dis property wey I see for UnaDomot o! ${listing.title} - ₦${listing.price?.toLocaleString()}/month. No agent wahala! 🇳🇬`,
      `Omo! See where to spend your money! ${listing.title} just Dey your domot! 😱`,
      `If you get money like this, come see: ${listing.title} for ₦${listing.price?.toLocaleString()}/month. No dulling! 💰`,
      `If you no share this, I go vex! ${listing.title} - ₦${listing.price?.toLocaleString()}/month. Abeg help me share! 😤`,
      `You wey get money like water! Come buy this one: ${listing.title} for ₦${listing.price?.toLocaleString()}/month. Sharp sharp! 💸`,
      `Just dey show you wetin I dey look... ${listing.title} - ₦${listing.price?.toLocaleString()}/month. No too talk abeg 🤫`,
      `As e dey hot so, I don see better place: ${listing.title}. ₦${listing.price?.toLocaleString()}/month. Who get money come! 🔥`,
      `🚨 URGENT: Dis property no fit last! ${listing.title} - ₦${listing.price?.toLocaleString()}/month. Grab am quick! 🏃`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    return this.shareListing(listing, {
      ...options,
      customMessage: randomMessage
    });
  },
  
  
  shareUrl: async function(url, options = {}) {
    const { onSuccess, onError, showToast } = options;
    
    if (navigator.share) {
      try {
        await navigator.share({ url });
        if (onSuccess) onSuccess();
        if (showToast) showToast('Shared successfully!', 'success');
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          if (onError) onError(err);
          if (showToast) showToast('Sharing cancelled', 'info');
        }
        return false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        if (onSuccess) onSuccess();
        if (showToast) showToast('Link copied to clipboard!', 'success');
        return true;
      } catch (err) {
        if (onError) onError(err);
        if (showToast) showToast('Failed to copy link', 'error');
        return false;
      }
    }
  }
};

window.ShareHelpers = ShareHelpers;