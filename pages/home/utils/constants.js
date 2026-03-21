// pages/home/utils/constants.js
const HOME_CONSTANTS = {
  // Filter options
  BEDROOM_OPTIONS: ['Self-contain', '1', '2', '3', '4', '5+'],
  PROPERTY_TYPES: ['Apartment', 'House', 'Self Contain', 'Room', 'Duplex'],
  FURNISHING_OPTIONS: ['Furnished', 'Semi-furnished', 'Unfurnished'],
  SORT_OPTIONS: [
    { value: 'smart', label: 'Smart' },
    { value: 'price_low', label: 'Price ↓' },
    { value: 'price_high', label: 'Price ↑' }
  ],
  
  // Default filters
  DEFAULT_FILTERS: {
    minPrice: '',
    maxPrice: '',
    state: '',
    lga: '',
    bedrooms: '',
    propertyType: '',
    furnishing: '',
    agentOnly: false,
    noAgentFees: false,
    sortBy: 'smart'
  },

  // Scroll thresholds
  SCROLL: {
    HIDE_SEARCH_BAR: 50,
    SHOW_SCROLL_BUTTON: 200,
    INFINITE_SCROLL_TRIGGER: 1.5
  },

  // Carousel
  CAROUSEL: {
    INTERVAL: 3500,
    LIMIT: 10,
    TOUCH_THRESHOLD: 50
  },

  // Pagination
  PAGINATION: {
    PAGE_SIZE: 20,
    MAX_PAGES: 60
  },

  // Search
  SEARCH: {
    MAX_HISTORY: 8,
    MIN_CHARS: 2,
    SUGGESTIONS_LIMIT: 6,
    RESULT_TOAST_DELAY: 500
  },

  // Toast
  TOAST: {
    DURATION: 3000
  }
};

window.HOME_CONSTANTS = HOME_CONSTANTS;