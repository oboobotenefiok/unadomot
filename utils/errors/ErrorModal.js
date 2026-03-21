// utils/errors/ErrorModal.js - CORRECTED VERSION
function ErrorModal({ error, onClose }) {
  if (!error) return null;

  const level = error.level || (window.ERROR_LEVELS ? window.ERROR_LEVELS.ERROR : 'error');
  const icon = window.ERROR_ICONS ? window.ERROR_ICONS[level] : '❌';
  const userMessage = error.userMessage || (window.ErrorLogger ? window.ErrorLogger.formatForUser(error) : {
    title: 'Error',
    message: error.message || 'An error occurred',
    suggestion: 'Please try again.'
  });

  const bgColors = {
    info: 'bg-blue-50',
    warning: 'bg-yellow-50',
    error: 'bg-red-50',
    critical: 'bg-red-100'
  };

  const textColors = {
    info: 'text-blue-800',
    warning: 'text-yellow-800',
    error: 'text-red-800',
    critical: 'text-red-900'
  };

  const buttonColors = {
    info: 'bg-blue-600 hover:bg-blue-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    error: 'bg-red-600 hover:bg-red-700',
    critical: 'bg-red-700 hover:bg-red-800'
  };

  return React.createElement('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
    onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement('div', {
      className: 'relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden ' + (bgColors[level] || 'bg-white') + ' border border-gray-200'
    },
      React.createElement('div', { className: 'p-6' },
        React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
          React.createElement('div', { className: 'text-4xl' }, icon),
          React.createElement('h2', { className: 'text-xl font-bold ' + (textColors[level] || 'text-gray-900') },
            userMessage.title
          )
        ),

        React.createElement('div', { className: 'space-y-3' },
          React.createElement('p', { className: 'text-base text-gray-700' },
            userMessage.message
          ),
          
          userMessage.suggestion && 
            React.createElement('div', { className: 'mt-4 p-3 rounded-lg bg-gray-100' },
              React.createElement('p', { className: 'text-sm text-gray-700' },
                React.createElement('span', { className: 'font-bold' }, '💡 Suggestion: '),
                userMessage.suggestion
              )
            ),
          
          (error.code || error.stack) && 
            React.createElement('details', { className: 'mt-4 text-xs text-gray-500' },
              React.createElement('summary', { className: 'cursor-pointer hover:text-gray-700' },
                'Technical details'
              ),
              React.createElement('div', { className: 'mt-2 p-2 bg-gray-100 rounded font-mono whitespace-pre-wrap' },
                error.code && React.createElement('div', null, 'Code: ', error.code),
                error.stack && React.createElement('div', { className: 'mt-1' }, error.stack)
              )
            )
        ),

        React.createElement('div', { className: 'mt-6 flex justify-end' },
          React.createElement('button', {
            onClick: onClose,
            className: 'px-6 py-2 bg-green-950 text-white rounded-lg hover:bg-green-800 transition font-medium'
          }, 'Close')
        )
      )
    )
  );
}

// Make it globally available
window.ErrorModal = ErrorModal;