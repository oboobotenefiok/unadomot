/* Auth modal: login, signup, post - Headings ONLY in this file */
function AuthModal() {
  const { isOpen, mode, redirectPath, modalProps, closeModal, toggleMode } = window.useAuthModal();
  const [isLoading, setIsLoading] = React.useState(false);
  const modalRef = React.useRef(null);
  
  React.useEffect(function() {
    const onEsc = function(e) { if (e.key === 'Escape' && isOpen) closeModal(); };
    window.addEventListener('keydown', onEsc);
    return function() { window.removeEventListener('keydown', onEsc); };
  }, [isOpen, closeModal]);
  
  if (!isOpen) return null;
  
  /* Route after successful auth */
  const handleAuthSuccess = function() {
    closeModal();
    
    /* Open post wizard after login */
    if (modalProps && modalProps.openPostAfterLogin) {
      if (window.__navigate) window.__navigate('/');
      setTimeout(function() {
        if (window.__openAuthModal) window.__openAuthModal('post', {});
      }, 300);
      return;
    }
    
    if (window.__navigate) window.__navigate(redirectPath);
    else window.location.href = redirectPath;
  };
  
  const handlePostSuccess = function(listingId) {
    closeModal();
    
    if (modalProps?.listingId) {
      if (window.__navigate) {
        window.__navigate(window.location.pathname + window.location.search);
      }
      window.dispatchEvent(new CustomEvent('listing-updated', { detail: { listingId, action: 'edit' } }));
    } else {
      if (window.__navigate) window.__navigate('/profile?tab=listings');
      else window.location.href = '/profile?tab=listings';
      window.dispatchEvent(new CustomEvent('listing-created', { detail: { listingId } }));
    }
  };
  
  const handleBackdropClick = function(e) {
    if (e.target === e.currentTarget) closeModal();
  };
  
  const LoginFormComponent = window.LoginForm;
  const SignupFormComponent = window.SignupForm;
  const PostListingWizard = window.PostListingWizard;
  
  
  if ((mode === 'login' || mode === 'signup') && (!LoginFormComponent || !SignupFormComponent)) {
    return React.createElement('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
      },
      React.createElement('div', { className: 'bg-white p-8 rounded-xl shadow-2xl' },
        React.createElement('div', { className: 'space-y-3 animate-pulse' },
          React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-32 mx-auto' }),
          React.createElement('div', { className: 'h-10 bg-gray-200 rounded' }),
          React.createElement('div', { className: 'h-10 bg-gray-200 rounded' }),
          React.createElement('div', { className: 'h-10 bg-gray-200 rounded' })
        )
      )
    );
  }
  
  if (mode === 'post' && !PostListingWizard) {
    return React.createElement('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
      },
      React.createElement('div', { className: 'bg-white p-8 rounded-xl shadow-2xl' },
        React.createElement('div', { className: 'space-y-3 animate-pulse' },
          React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-40 mx-auto' }),
          React.createElement('div', { className: 'h-20 bg-gray-200 rounded' }),
          React.createElement('div', { className: 'h-10 bg-gray-200 rounded' })
        )
      )
    );
  }
  
  const renderContent = function() {
    switch (mode) {
      case 'login':
      case 'signup':
        const emailFromProps = modalProps?.email || '';
        
        return React.createElement(React.Fragment, null,
          // HEADER - ONLY LOGO, NO TEXT
          React.createElement('div', { className: 'text-center pt-6 px-6 pb-2' },
            React.createElement('img', {
              src: '/vault/img/unadomot.jpg',
              alt: 'UnaDomot',
              className: 'w-16 h-16 rounded-full mx-auto mb-2'
            })
          ),
          
          // FORM - NO HEADINGS INSIDE
          React.createElement('div', { className: 'px-6 pb-6' },
            mode === 'login' ?
            React.createElement(LoginFormComponent, {
              onSuccess: handleAuthSuccess,
              setIsLoading,
              initialEmail: emailFromProps
            }) :
            React.createElement(SignupFormComponent, {
              onSuccess: handleAuthSuccess,
              setIsLoading,
              initialEmail: emailFromProps
            })
          ),
          
          // FOOTER - Toggle between login/signup
          React.createElement('div', { className: 'px-6 pb-6 text-center text-sm text-gray-600 border-t border-gray-100 pt-4' },
            mode === 'login' ? 'New to UnaDomot? ' : 'Already have an account? ',
            React.createElement('button', {
              onClick: toggleMode,
              className: 'text-green-950 font-semibold hover:underline focus:outline-none'
            }, mode === 'login' ? 'Create account' : 'Sign in')
          )
        );
        
      case 'post':
        return React.createElement(PostListingWizard, {
          modal: true,
          listingId: modalProps?.listingId,
          onSuccess: handlePostSuccess,
          onClose: closeModal
        });
        
      default:
        return null;
    }
  };
  
  // Calculate modal width based on mode
  const modalWidth = mode === 'post' ?
    'w-full max-w-2xl' :
    'w-full max-w-md';
  
  return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: handleBackdropClick
    },
    React.createElement('div', {
        ref: modalRef,
        className: `${modalWidth} bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100`,
        style: {
          maxHeight: mode === 'post' ? '95vh' : 'auto',
          overflowY: mode === 'post' ? 'auto' : 'hidden'
        },
        onClick: (e) => e.stopPropagation()
      },
      // Close button for all modes
      React.createElement('div', {
          className: 'flex justify-end p-2 absolute top-0 right-0 z-10'
        },
        React.createElement('button', {
            onClick: closeModal,
            className: 'text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition',
            'aria-label': 'Close modal'
          },
          React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ),
      
      // Main content
      renderContent(),
      
      // Loading overlay
      isLoading && React.createElement('div', {
          className: 'absolute inset-0 bg-white/80 flex items-center justify-center z-20'
        },
        React.createElement('div', { className: 'text-center' },
          React.createElement('div', { className: 'w-8 h-8 border-4 border-green-950 border-t-transparent rounded-full animate-spin mx-auto mb-2' }),
          React.createElement('p', { className: 'text-sm text-gray-600' }, 'Please wait...')
        )
      )
    )
  );
}

window.AuthModal = AuthModal;