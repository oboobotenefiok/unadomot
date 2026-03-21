
function ValidationIndicator({ status, message, className = '' }) {
  const getIcon = () => {
    switch (status) {
      case 'validating':
        return React.createElement('div', {
          className: 'w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin'
        });
      case 'success':
        return React.createElement('svg', {
          className: 'w-5 h-5 text-green-500',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2',
            d: 'M5 13l4 4L19 7'
          })
        );
      case 'error':
        return React.createElement('svg', {
          className: 'w-5 h-5 text-red-500',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2',
            d: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          })
        );
      case 'warning':
        return React.createElement('svg', {
          className: 'w-5 h-5 text-yellow-500',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2',
            d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          })
        );
      case 'hint':
        return React.createElement('span', { className: 'text-blue-500' }, '💡');
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'validating': return 'bg-yellow-50';
      case 'success': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      case 'hint': return 'bg-blue-50';
      default: return '';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'validating': return 'text-yellow-700';
      case 'success': return 'text-green-700';
      case 'error': return 'text-red-700';
      case 'warning': return 'text-yellow-700';
      case 'hint': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  };

  return React.createElement('div', {
    className: `flex items-start gap-2 p-3 rounded-lg ${getBgColor()} ${className}`
  },
    React.createElement('div', { className: 'flex-shrink-0 mt-0.5' }, getIcon()),
    React.createElement('p', { className: `text-sm ${getTextColor()}` }, message)
  );
}

window.ValidationIndicator = ValidationIndicator;