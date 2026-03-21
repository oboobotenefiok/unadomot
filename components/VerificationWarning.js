// components/VerificationWarning.js - Reusable component

function VerificationWarning({
  message,
  onResend,
  show = true,
  className = '',
  autoHide = true,
  onClose
}) {
  const [isVisible, setIsVisible] = React.useState(show);
  
  React.useEffect(() => {
    setIsVisible(show);
    
    if (autoHide && show) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, onClose]);
  
  if (!isVisible) return null;
  
  return React.createElement('div', {
      className: `fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-yellow-50 text-yellow-800 rounded-lg shadow-lg border border-yellow-200 flex items-center justify-between max-w-md ${className}`
    },
    React.createElement('span', { className: 'text-sm flex items-center gap-2' },
      React.createElement('span', { className: 'text-base' }, '⚠️'),
      message
    ),
    onResend && React.createElement('button', {
      onClick: onResend,
      className: 'ml-4 text-xs bg-yellow-100 px-3 py-1 rounded hover:bg-yellow-200 transition whitespace-nowrap'
    }, 'Resend')
  );
}

window.VerificationWarning = VerificationWarning;