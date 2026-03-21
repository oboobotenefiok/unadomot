// utils/verification.js - Centralized verification checks

const VerificationHelpers = {
  /**
   * Check if user can perform an action based on email verification
   * @param {Object} user - Firebase user object
   * @param {string} action - What they're trying to do (for message)
   * @returns {Object} { allowed: boolean, message: string }
   */
  checkEmailVerification: function(user, action) {
    if (!user) {
      return {
        allowed: false,
        message: 'Please log in to ' + action
      };
    }
    
    // Only check email/password users
    const isEmailUser = user.providerData?.some(p => p.providerId === 'password');
    if (!isEmailUser) {
      return { allowed: true, message: '' };
    }
    
    if (!user.emailVerified) {
      return {
        allowed: false,
        message: 'Please verify your email to ' + action + '. Check your inbox for the verification link.'
      };
    }
    
    return { allowed: true, message: '' };
  },
  
  /**
   * Resend verification email
   * @param {Object} user - Firebase user
   * @returns {Promise<boolean>}
   */
  resendVerificationEmail: async function(user) {
    if (!user) return false;
    try {
      await user.sendEmailVerification({
        url: window.location.origin + '/verify-email',
        handleCodeInApp: true
      });
      return true;
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Show verification warning toast and trigger event
   * @param {string} message - Warning message
   */
  showVerificationWarning: function(message) {
    const toastEvent = new CustomEvent('show-toast', {
      detail: { message, type: 'warning' }
    });
    window.dispatchEvent(toastEvent);
    
    const warningEvent = new CustomEvent('show-verification-warning', {
      detail: { message }
    });
    window.dispatchEvent(warningEvent);
  },
  
  /**
   * Check and handle verification in one call (for UI components)
   * @param {Object} user - Firebase user
   * @param {string} action - What they're trying to do
   * @returns {boolean} - True if allowed, false if blocked (and shows warning)
   */
  requireVerified: function(user, action) {
    const check = this.checkEmailVerification(user, action);
    if (!check.allowed) {
      this.showVerificationWarning(check.message);
      return false;
    }
    return true;
  }
};

window.VerificationHelpers = VerificationHelpers;