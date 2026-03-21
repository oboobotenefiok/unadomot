// utils/errors/ErrorLogger.js
const ErrorLogger = {
  logs: [],
  listeners: [],

  // Console styles for beautiful logging
  styles: {
    info: 'color: #3b82f6; font-weight: bold; background: #dbeafe; padding: 2px 6px; border-radius: 4px;',
    warning: 'color: #f59e0b; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 4px;',
    error: 'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;',
    critical: 'color: #b91c1c; font-weight: bold; background: #fecaca; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;',
    timestamp: 'color: #6b7280; font-size: 0.85em;',
    location: 'color: #10b981; font-style: italic;'
  },

  log(level, error, context = {}) {
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);
    const userMessage = ERROR_MESSAGES[errorCode] || {
      title: 'Something Went Wrong',
      message: errorMessage,
      suggestion: 'Please try again or contact support.'
    };

    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      code: errorCode,
      originalMessage: errorMessage,
      userMessage,
      context,
      stack: error?.stack || new Error().stack
    };

    this.logs.push(logEntry);
    
    // Beautiful console output
    this.prettyPrint(logEntry);
    
    // Store in localStorage for debugging (last 50 errors)
    this.persistLogs();
    
    // Notify listeners (for toast/UI updates)
    this.notifyListeners(logEntry);
    
    return logEntry;
  },

  prettyPrint(logEntry) {
    const icon = ERROR_ICONS[logEntry.level] || '❓';
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    
    console.groupCollapsed(
      `%c${icon} ${logEntry.level.toUpperCase()}%c ${logEntry.userMessage.title || 'Error'} %c@ ${timestamp}`,
      this.styles[logEntry.level],
      'color: inherit; font-weight: normal;',
      this.styles.timestamp
    );
    
    console.log('%cCode:', 'font-weight: bold;', logEntry.code);
    console.log('%cMessage:', 'font-weight: bold;', logEntry.originalMessage);
    
    if (Object.keys(logEntry.context).length > 0) {
      console.log('%cContext:', 'font-weight: bold;', logEntry.context);
    }
    
    if (logEntry.stack) {
      console.log('%cStack:', 'font-weight: bold;');
      console.log(logEntry.stack);
    }
    
    console.groupEnd();
  },

  info(error, context) {
    return this.log(ERROR_LEVELS.INFO, error, context);
  },

  warning(error, context) {
    return this.log(ERROR_LEVELS.WARNING, error, context);
  },

  error(error, context) {
    return this.log(ERROR_LEVELS.ERROR, error, context);
  },

  critical(error, context) {
    return this.log(ERROR_LEVELS.CRITICAL, error, context);
  },

  // Handle Firebase errors specially
  handleFirebaseError(error, context = {}) {
    const level = this.getFirebaseErrorLevel(error);
    return this.log(level, error, { ...context, source: 'firebase' });
  },

  getFirebaseErrorLevel(error) {
    const criticalErrors = [
      ERROR_CODES.AUTH.USER_DISABLED,
      ERROR_CODES.FIRESTORE.PERMISSION_DENIED
    ];
    
    if (criticalErrors.includes(error?.code)) {
      return ERROR_LEVELS.CRITICAL;
    }
    
    if (error?.code?.includes('network') || error?.code === ERROR_CODES.FIRESTORE.UNAVAILABLE) {
      return ERROR_LEVELS.WARNING;
    }
    
    return ERROR_LEVELS.ERROR;
  },

  persistLogs() {
    // Keep last 50 errors
    const recentLogs = this.logs.slice(-50);
    try {
      localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    } catch (e) {
      // Ignore storage errors
    }
  },

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  notifyListeners(logEntry) {
    this.listeners.forEach(callback => {
      try {
        callback(logEntry);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  },

  getLogs() {
    return this.logs;
  },

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('error_logs');
  },

  // Format error for user display
  formatForUser(error) {
    const errorCode = error?.code || 'unknown';
    return ERROR_MESSAGES[errorCode] || {
      title: 'Error',
      message: error?.message || 'An unexpected error occurred',
      suggestion: 'Please try again.'
    };
  }
};

// Load persisted logs
try {
  const saved = localStorage.getItem('error_logs');
  if (saved) {
    ErrorLogger.logs = JSON.parse(saved);
  }
} catch (e) {}

window.ErrorLogger = ErrorLogger;