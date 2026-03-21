
function ForgotPasswordPage({ navigate }) {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  const { openModal } = window.useAuthModal();
  
  
  const resetRequests = React.useRef({
    count: 0,
    lastReset: 0
  });
  
  const validateForm = () => {
    const v = ValidationHelpers;
    
    
    const emailErr = v.validateEmail(email, true);
    setEmailError(emailErr || '');
    
    return !emailErr;
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
  
  const handleSubmit = async function(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!checkRateLimit()) return;
    
    setLoading(true);
    setError('');
    
    try {
      
      const sanitizedEmail = ValidationHelpers.sanitizeInput(email, 'email');
      
      await auth.sendPasswordResetEmail(sanitizedEmail);
      
      
      resetRequests.current.count++;
      resetRequests.current.lastReset = Date.now();
      
      setSuccess(true);
    } catch (err) {
      
      
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    
    if (emailError) {
      setEmailError('');
    }
    if (error) {
      setError('');
    }
  };
  
  const handleBackToLogin = (e) => {
    e.preventDefault();
    
    navigate('/');
    openModal('login', '/');
  };
  
  return React.createElement('div', { className: 'min-h-screen flex items-center justify-center bg-green-50' },
    React.createElement('div', { className: 'bg-white p-8 rounded-lg shadow-md w-96' },
      React.createElement('h2', { className: 'text-2xl font-bold text-center mb-6' }, 'Reset Password'),
      
      success ?
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'bg-green-50 text-green-700 p-4 rounded mb-4' },
          'Password reset email sent! Check your inbox.'
        ),
        React.createElement('button', {
          onClick: handleBackToLogin,
          className: 'text-green-950 hover:underline cursor-pointer'
        }, 'Return to Login')
      ) :
      React.createElement(React.Fragment, null,
        React.createElement('p', { className: 'text-gray-600 mb-6 text-sm' },
          'Enter your email address and we\'ll send you a link to reset your password.'
        ),
        
        error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-3 rounded mb-4 text-sm' }, error),
        
        React.createElement('form', { onSubmit: handleSubmit },
          React.createElement('div', { className: 'mb-6' },
            React.createElement('label', { className: 'block text-gray-700 text-sm font-bold mb-2' }, 'Email'),
            React.createElement('input', {
              type: 'email',
              value: email,
              onChange: handleEmailChange,
              className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${
                emailError ? 'border-red-500' : ''
              }`,
              required: true,
              disabled: loading,
              placeholder: 'your@email.com'
            }),
            emailError &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, emailError)
          ),
          
          React.createElement('button', {
            type: 'submit',
            disabled: loading,
            className: 'w-full bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 disabled:opacity-50 mb-4'
          }, loading ? 'Sending...' : 'Send Reset Link'),
          
          React.createElement('button', {
            onClick: handleBackToLogin,
            className: 'block text-center text-gray-600 hover:text-green-950 text-sm cursor-pointer w-full'
          }, '← Back to Login')
        )
      )
    )
  );
}

window.ForgotPasswordPage = ForgotPasswordPage;