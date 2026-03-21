// hooks/useVerification.js - Hook for verification checks

function useVerification() {
  const [showWarning, setShowWarning] = React.useState(false);
  const [warningMessage, setWarningMessage] = React.useState('');
  
  // Listen for verification warning events
  React.useEffect(() => {
    const handleVerificationWarning = (e) => {
      setWarningMessage(e.detail.message);
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    };
    
    window.addEventListener('show-verification-warning', handleVerificationWarning);
    return () => window.removeEventListener('show-verification-warning', handleVerificationWarning);
  }, []);
  
  const checkVerification = React.useCallback((user, action) => {
    if (!user) {
      window.__openAuthModal?.('login', window.location.pathname);
      return false;
    }
    
    const check = window.VerificationHelpers.checkEmailVerification(user, action);
    if (!check.allowed) {
      window.VerificationHelpers.showVerificationWarning(check.message);
      return false;
    }
    return true;
  }, []);
  
  const resendVerification = React.useCallback(async (user) => {
    const success = await window.VerificationHelpers.resendVerificationEmail(user);
    if (success) {
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Verification email sent! Check your inbox.', type: 'success' }
      });
      window.dispatchEvent(toastEvent);
    } else {
      const toastEvent = new CustomEvent('show-toast', {
        detail: { message: 'Failed to send verification email', type: 'error' }
      });
      window.dispatchEvent(toastEvent);
    }
    return success;
  }, []);
  
  return {
    showWarning,
    warningMessage,
    checkVerification,
    resendVerification
  };
}

window.useVerification = useVerification;