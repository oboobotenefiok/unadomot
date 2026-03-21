// pages/listing-detail/utils/constants.js
const LISTING_DETAIL_CONSTANTS = {
  CAROUSEL: {
    INTERVAL: 5000,
    TOUCH_THRESHOLD: 50
  },
  
  COMMENTS: {
    INITIAL_LIMIT: 20,
    REPLIES_LIMIT: 10,
    TEXT_MAX_LENGTH: 500,
    LOAD_MORE_THRESHOLD: 5,
    DEBOUNCE_DELAY: 800,
    OPTIMISTIC_TIMEOUT: 3000
  },
  
  LANDLORD: {
    DEFAULT_RATING: 4.8,
    DEFAULT_REVIEW_COUNT: 23,
    DEFAULT_RESPONSE_TIME: '< 1hr'
  },
  
  IMAGE: {
    LIGHTBOX_QUALITY: 'auto:best',
    LIGHTBOX_WIDTH: 2000
  },
  
  PLACEHOLDERS: {
    NO_IMAGE: '/vault/img/no-image.jpg',
    NO_DESCRIPTION: 'No description provided.',
    UNKNOWN_USER: 'Unknown User'
  },
  
  MESSAGES: {
    DELETE_CONFIRM: 'Delete this listing? It will be hidden from others.',
    DELETE_SUCCESS: 'Listing deleted successfully',
    DELETE_ERROR: 'Failed to delete listing',
    CHAT_ERROR: 'Failed to start chat. Please try again.',
    COMMENT_ERROR: 'Failed to post comment. Please try again.',
    REPLY_ERROR: 'Failed to post reply. Please try again.'
  },
  
  // NEW: Helpful count constants
  HELPFUL: {
    MAX_VOTES_PER_USER: 1, // Can only mark helpful once
    COOLDOWN_MS: 1000, // Prevent spam clicking
    ANIMATION_DURATION: 300
  }
};

window.LISTING_DETAIL_CONSTANTS = LISTING_DETAIL_CONSTANTS;