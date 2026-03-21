// components/VerificationBadge.js
function VerificationBadge({ status, size = 'md' }) {
  if (status !== 'approved') return null;
  
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return React.createElement('span', {
      className: `inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full ${sizes[size]}`
    },
    React.createElement('svg', {
        className: iconSizes[size],
        fill: 'currentColor',
        viewBox: '0 0 20 20'
      },
      React.createElement('path', {
        fillRule: 'evenodd',
        d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
        clipRule: 'evenodd'
      })
    ),
    'Verified'
  );
}

window.VerificationBadge = VerificationBadge;