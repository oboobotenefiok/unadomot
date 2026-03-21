// pages/listing-detail/components/CommentForm.js - With Email Verification Check
function CommentForm({
  user,
  value,
  onChange,
  onSubmit,
  isSubmitting,
  placeholder = 'Add a comment...'
}) {
  const [showVerificationWarning, setShowVerificationWarning] = React.useState(false);
  
  // ===== USE VERIFICATION HOOK =====
  const { checkVerification, resendVerification } = window.useVerification?.() || {
    checkVerification: () => true,
    resendVerification: async () => false
  };
  
  // ===== UPDATED: Use centralized verification check =====
  const handleSubmit = function(e) {
    e.preventDefault();
    
    if (!user) {
      // Let the original flow handle login redirect
      onSubmit(e);
      return;
    }
    
    // Use centralized verification check
    if (!checkVerification(user, 'post comments')) {
      setShowVerificationWarning(true);
      setTimeout(() => setShowVerificationWarning(false), 5000);
      return;
    }
    
    onSubmit(e);
  };
  
  // ===== UPDATED: Use centralized resend function =====
  const handleResendVerification = async function() {
    const success = await resendVerification(user);
    if (success) {
      ToastHelpers?.success('Verification email sent! Please check your inbox.');
    } else {
      ToastHelpers?.error('Failed to send verification email. Please try again.');
    }
  };
  
  return React.createElement(React.Fragment, null,
    // ===== VERIFICATION WARNING =====
    showVerificationWarning && React.createElement('div', {
        className: 'mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-center justify-between'
      },
      React.createElement('span', { className: 'text-sm' }, '⚠️ Please verify your email to post comments.'),
      React.createElement('button', {
        onClick: handleResendVerification,
        className: 'ml-2 text-xs bg-yellow-100 px-2 py-1 rounded hover:bg-yellow-200 transition whitespace-nowrap'
      }, 'Resend')
    ),
    
    React.createElement('form', { onSubmit: handleSubmit, className: 'mb-6' },
      React.createElement('div', { className: 'relative' },
        React.createElement('textarea', {
          value: value,
          onChange: onChange,
          placeholder: user ? placeholder : 'Sign in to comment',
          disabled: !user || isSubmitting,
          rows: 2,
          className: `w-full p-3 pr-12 border border-gray-300 rounded-2xl resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent ${
            !user || isSubmitting ? 'bg-gray-100' : 'bg-white'
          }`
        }),
        
        React.createElement('div', { className: 'absolute right-12 bottom-3 text-xs text-gray-400' },
          value.length + '/500'
        ),
        
        React.createElement('button', {
            type: 'submit',
            disabled: !user || !value.trim() || isSubmitting,
            className: `absolute right-3 bottom-3 p-1 rounded-full transition flex-shrink-0 ${
            !user || !value.trim() || isSubmitting
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-green-950 hover:text-green-700'
          }`
          },
          isSubmitting ?
          React.createElement('div', {
            className: 'w-5 h-5 border-2 border-green-950 border-t-transparent rounded-full animate-spin'
          }) :
          React.createElement('svg', {
              className: 'w-6 h-6',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: '2',
              d: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
            })
          )
        )
      )
    )
  );
}

window.CommentForm = CommentForm;