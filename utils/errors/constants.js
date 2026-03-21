// utils/errors/constants.js
const ERROR_CODES = {
  // Auth errors
  AUTH: {
    INVALID_EMAIL: 'auth/invalid-email',
    USER_DISABLED: 'auth/user-disabled',
    USER_NOT_FOUND: 'auth/user-not-found',
    WRONG_PASSWORD: 'auth/wrong-password',
    EMAIL_IN_USE: 'auth/email-already-in-use',
    WEAK_PASSWORD: 'auth/weak-password',
    NETWORK: 'auth/network-request-failed',
    TOO_MANY_REQUESTS: 'auth/too-many-requests',
    POPUP_CLOSED: 'auth/popup-closed-by-user'
  },

  // Firestore errors
  FIRESTORE: {
    PERMISSION_DENIED: 'permission-denied',
    NOT_FOUND: 'not-found',
    ALREADY_EXISTS: 'already-exists',
    UNAVAILABLE: 'unavailable',
    DEADLINE_EXCEEDED: 'deadline-exceeded'
  },

  // Storage errors
  STORAGE: {
    UNAUTHORIZED: 'storage/unauthorized',
    RETRY_LIMIT: 'storage/retry-limit-exceeded',
    INVALID_EVENT: 'storage/invalid-event'
  },

  // Custom app errors
  APP: {
    NETWORK: 'app/network-error',
    VALIDATION: 'app/validation-error',
    NOT_FOUND: 'app/not-found',
    UNAUTHORIZED: 'app/unauthorized',
    RATE_LIMIT: 'app/rate-limit',
    INVALID_DATA: 'app/invalid-data'
  }
};

const ERROR_MESSAGES = {
  // User-friendly messages
  [ERROR_CODES.AUTH.INVALID_EMAIL]: {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    suggestion: 'Check for typos and try again.'
  },
  [ERROR_CODES.AUTH.USER_DISABLED]: {
    title: 'Account Disabled',
    message: 'This account has been disabled.',
    suggestion: 'Contact support for assistance.'
  },
  [ERROR_CODES.AUTH.USER_NOT_FOUND]: {
    title: 'User Not Found',
    message: 'No account found with these credentials.',
    suggestion: 'Sign up for a new account.'
  },
  [ERROR_CODES.AUTH.WRONG_PASSWORD]: {
    title: 'Incorrect Password',
    message: 'The password you entered is incorrect.',
    suggestion: 'Try again or reset your password.'
  },
  [ERROR_CODES.AUTH.EMAIL_IN_USE]: {
    title: 'Email Already Registered',
    message: 'An account with this email already exists.',
    suggestion: 'Try logging in instead.'
  },
  [ERROR_CODES.AUTH.WEAK_PASSWORD]: {
    title: 'Weak Password',
    message: 'Password should be at least 6 characters.',
    suggestion: 'Use a mix of letters, numbers, and symbols.'
  },
  [ERROR_CODES.AUTH.NETWORK]: {
    title: 'Network Error',
    message: 'Unable to connect to the server.',
    suggestion: 'Check your internet connection.'
  },
  [ERROR_CODES.AUTH.TOO_MANY_REQUESTS]: {
    title: 'Too Many Attempts',
    message: 'Access temporarily blocked.',
    suggestion: 'Please try again later.'
  },
  [ERROR_CODES.AUTH.POPUP_CLOSED]: {
    title: 'Sign-in Cancelled',
    message: 'The sign-in popup was closed.',
    suggestion: 'Try again to continue.'
  },

  [ERROR_CODES.FIRESTORE.PERMISSION_DENIED]: {
    title: 'Access Denied',
    message: "You don't have permission to perform this action.",
    suggestion: 'Contact support if you need access.'
  },
  [ERROR_CODES.FIRESTORE.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested item could not be found.',
    suggestion: 'It may have been removed or moved.'
  },
  [ERROR_CODES.FIRESTORE.UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    suggestion: 'Please try again in a few moments.'
  },

  [ERROR_CODES.APP.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to reach our servers.',
    suggestion: 'Check your internet and try again.'
  },
  [ERROR_CODES.APP.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your information and try again.',
    suggestion: 'All fields must be filled correctly.'
  },
  [ERROR_CODES.APP.NOT_FOUND]: {
    title: 'Page Not Found',
    message: "The page you're looking for doesn't exist.",
    suggestion: 'Check the URL or go back home.'
  },
  [ERROR_CODES.APP.UNAUTHORIZED]: {
    title: 'Authentication Required',
    message: 'You need to be logged in to do this.',
    suggestion: 'Sign in to continue.'
  },
  [ERROR_CODES.APP.RATE_LIMIT]: {
    title: 'Rate Limit Exceeded',
    message: 'You\'re doing that too often.',
    suggestion: 'Please wait a moment and try again.'
  },
  [ERROR_CODES.APP.INVALID_DATA]: {
    title: 'Invalid Data',
    message: 'The data provided is invalid.',
    suggestion: 'Check your input and try again.'
  }
};

const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

const ERROR_ICONS = {
  [ERROR_LEVELS.INFO]: 'ℹ️',
  [ERROR_LEVELS.WARNING]: '⚠️',
  [ERROR_LEVELS.ERROR]: '❌',
  [ERROR_LEVELS.CRITICAL]: '🔥'
};

window.ERROR_CODES = ERROR_CODES;
window.ERROR_MESSAGES = ERROR_MESSAGES;
window.ERROR_LEVELS = ERROR_LEVELS;
window.ERROR_ICONS = ERROR_ICONS;