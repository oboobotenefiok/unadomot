// utils/errors/ErrorToast.js
function ErrorToast({ 
  error, 
  onClose, 
  duration = 5000,
  position = 'bottom-center'
}) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const level = error.level || ERROR_LEVELS.ERROR;
  const icon = ERROR_ICONS[level] || '❌';
  const userMessage = error.userMessage || ErrorLogger.formatForUser(error);

  const bgColors = {
    [ERROR_LEVELS.INFO]: 'bg-blue-50 border-blue-200',
    [ERROR_LEVELS.WARNING]: 'bg-yellow-50 border-yellow-200',
    [ERROR_LEVELS.ERROR]: 'bg-red-50 border-red-200',
    [ERROR_LEVELS.CRITICAL]: 'bg-red-100 border-red-300'
  };

  const textColors = {
    [ERROR_LEVELS.INFO]: 'text-blue-800',
    [ERROR_LEVELS.WARNING]: 'text-yellow-800',
    [ERROR_LEVELS.ERROR]: 'text-red-800',
    [ERROR_LEVELS.CRITICAL]: 'text-red-900'
  };

  const positions = {
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return React.createElement('div', {
    className: `fixed ${positions[position]} z-50 max-w-md w-full transform transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
    }`
  },
    React.createElement('div', {
      className: `rounded-lg border ${bgColors[level]} shadow-lg overflow-hidden`
    },
      React.createElement('div', { className: 'p-4' },
        React.createElement('div', { className: 'flex items-start' },
          React.createElement('div', { className: 'flex-shrink-0 text-2xl mr-3' }, icon),
          
          React.createElement('div', { className: 'flex-1' },
            React.createElement('h3', { className: `text-sm font-bold ${textColors[level]}` },
              userMessage.title
            ),
            React.createElement('p', { className: `text-sm mt-1 ${textColors[level].replace('800', '700')}` },
              userMessage.message
            ),
            userMessage.suggestion && 
              React.createElement('p', { className: `text-xs mt-2 ${textColors[level].replace('800', '600')}` },
                '💡 ' + userMessage.suggestion
              )
          ),
          
          React.createElement('button', {
            onClick: () => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            },
            className: `ml-4 flex-shrink-0 ${textColors[level]} hover:opacity-75`
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
            )
          )
        )
      )
    )
  );
}

window.ErrorToast = ErrorToast;