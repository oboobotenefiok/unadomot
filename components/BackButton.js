function BackButton({ currentPath, navigate }) {
  const [pageName, setPageName] = React.useState('');
  
  
  if (currentPath === '/') return null;
  
  
  if (!currentPath || !navigate) {
    return null;
  }
  
  
  React.useEffect(function() {
    const path = currentPath.split('?')[0];
    
    
    const pageNames = {
      '/login': 'Sign In',
      '/signup': 'Create Account',
      '/listings': 'Browse Rentals',
      '/favorites': 'Saved Listings',
      '/profile': 'My Profile',
      '/settings': 'Settings',
      '/post': 'Post Listing',
      '/chat': 'Messages',
      '/verify': 'Get Verified',
      '/checkout': 'Checkout Notice',
      '/forgot-password': 'Reset Password',
      '/terms': 'Terms & Conditions',
      '/privacy': 'Privacy Policy',
      '/admin': 'Admin Dashboard'
    };
    
    
    if (path.startsWith('/listing/')) {
      setPageName('Property Details');
      return;
    }
    
    if (path.startsWith('/public-profile/')) {
      setPageName('Public Profile');
      return;
    }
    
    if (path.startsWith('/u/')) {
      setPageName('User Profile');
      return;
    }
    
    
    setPageName(pageNames[path] || path.slice(1).charAt(0).toUpperCase() + path.slice(2));
  }, [currentPath]);
  
  const handleBack = function() {
    // Get the previous path from history state if available
    const previousPath = window.history.state?.previousPath;
    
    if (window.history.length > 1) {
      // Use browser back - this will trigger our cached navigation
      window.history.back();
    } else if (previousPath) {
      // If we have a previous path in state, use that
      navigate(previousPath);
    } else {
      // Fallback to home
      navigate('/');
    }
  };
  
  // Add a small arrow icon to show direction
  return React.createElement('div', {
      className: 'fixed top-0 left-0 right-0 z-40 bg-green-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm'
    },
    React.createElement('div', {
        className: 'container mx-auto px-4 py-3'
      },
      React.createElement('div', {
          className: 'flex items-center gap-3'
        },
        
        React.createElement('button', {
            onClick: handleBack,
            className: 'p-1 text-gray-700 hover:text-green-950 transition group flex items-center gap-1',
            'aria-label': 'Go back'
          },
          React.createElement('svg', {
              className: 'w-5 h-5 group-hover:-translate-x-1 transition-transform',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: '2',
              d: 'M15 19l-7-7 7-7'
            })
          ),
          React.createElement('span', { className: 'text-sm hidden sm:inline' }, 'Back')
        ),
        
        
        React.createElement('span', {
          className: 'text-gray-300 select-none'
        }, '|'),
        
        
        React.createElement('span', {
            className: 'font-medium text-gray-900 truncate'
          },
          pageName
        )
      )
    )
  );
}

window.BackButton = BackButton;