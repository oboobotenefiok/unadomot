// components/ForgotPasswordModal.js
function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [email, setEmail] = React.useState(initialEmail);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  
  const resetRequests = React.useRef({
    count: 0,
    lastReset: 0
  });
  
  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setError('');
      setSuccess(false);
      setEmailError('');
    }
  }, [isOpen, initialEmail]);
  
  const validateEmail = (value) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  };
  
  const checkRateLimit = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - resetRequests.current.lastReset > oneHour) {
      resetRequests.current.count = 0;
      resetRequests.current.lastReset = now;
    }
    
    if (resetRequests.current.count >= 3) {
      setError('Too many password reset attempts. Please try again later.');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setEmailError(emailError);
      return;
    }
    
    if (!checkRateLimit()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sanitizedEmail = ValidationHelpers.sanitizeInput(email, 'email');
      await auth.sendPasswordResetEmail(sanitizedEmail);
      
      resetRequests.current.count++;
      resetRequests.current.lastReset = Date.now();
      
      setSuccess(true);
      
      // Auto close after 3 seconds on success
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  if (!isOpen) return null;
  
  return React.createElement('div', {
    className: 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
    onClick: handleBackdropClick
  },
    React.createElement('div', {
      className: 'w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      React.createElement('div', { className: 'text-center pt-6 px-6 pb-2' },
        React.createElement('img', {
          src: '/vault/img/unadomot.jpg',
          alt: 'UnaDomot',
          className: 'w-16 h-16 rounded-full mx-auto mb-2'
        })
      ),
      
      // Content
      React.createElement('div', { className: 'px-6 pb-6' },
        success ? (
          React.createElement('div', { className: 'text-center' },
            React.createElement('div', { className: 'bg-green-50 text-green-700 p-4 rounded-lg mb-4' },
              'Password reset email sent! Check your inbox.'
            ),
            React.createElement('button', {
              onClick: onClose,
              className: 'text-green-950 hover:underline text-sm'
            }, 'Close')
          )
        ) : (
          React.createElement(React.Fragment, null,
            React.createElement('p', { className: 'text-gray-600 mb-6 text-sm text-center' },
              'Enter your email address and we\'ll send you a link to reset your password.'
            ),
            
            error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm' }, error),
            
            React.createElement('form', { onSubmit: handleSubmit },
              React.createElement('div', { className: 'mb-6' },
                React.createElement('label', { className: 'block text-gray-700 text-sm font-medium mb-2' }, 'Email'),
                React.createElement('input', {
                  type: 'email',
                  value: email,
                  onChange: (e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    setError('');
                  },
                  className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  }`,
                  required: true,
                  disabled: loading,
                  placeholder: 'your@email.com',
                  autoFocus: true
                }),
                emailError && React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, emailError)
              ),
              
              React.createElement('div', { className: 'flex gap-3' },
                React.createElement('button', {
                  type: 'button',
                  onClick: onClose,
                  className: 'flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium'
                }, 'Cancel'),
                
                React.createElement('button', {
                  type: 'submit',
                  disabled: loading,
                  className: 'flex-1 bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
                }, loading ? 'Sending...' : 'Send Reset Link')
              )
            )
          )
        )
      ),
      
      // Footer
      React.createElement('div', { className: 'px-6 pb-6 text-center text-xs text-gray-500 border-t border-gray-100 pt-4' },
        React.createElement('button', {
          onClick: onClose,
          className: 'text-green-950 hover:underline'
        }, '← Back to Sign In')
      )
    )
  );
}

window.ForgotPasswordModal = ForgotPasswordModal;