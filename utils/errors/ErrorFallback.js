// utils/errors/ErrorFallback.js
function ErrorFallback({ error, errorInfo, resetError, fallback }) {
  // Use custom fallback if provided
  if (fallback) {
    return typeof fallback === 'function' 
      ? fallback({ error, resetError }) 
      : fallback;
  }

  // Default fallback UI
  return React.createElement('div', {
    className: 'min-h-screen bg-red-50 flex items-center justify-center p-6'
  },
    React.createElement('div', { className: 'text-center max-w-md' },
      React.createElement('div', { className: 'text-6xl mb-4 animate-bounce' }, '💥'),
      
      React.createElement('h2', { className: 'text-2xl font-bold text-red-800 mb-2' },
        'Something went wrong'
      ),
      
      React.createElement('p', { className: 'text-red-600 mb-4' },
        error?.message || 'An unexpected error occurred'
      ),
      
      React.createElement('div', { className: 'bg-red-100 rounded-lg p-4 mb-6 text-left text-sm font-mono overflow-auto max-h-40' },
        error?.stack || 'No stack trace available'
      ),
      
      React.createElement('div', { className: 'flex gap-3 justify-center' },
        React.createElement('button', {
          onClick: resetError,
          className: 'bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium'
        }, 'Try Again'),
        
        React.createElement('button', {
          onClick: () => window.location.href = '/',
          className: 'bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-medium'
        }, 'Go Home')
      )
    )
  );
}

window.ErrorFallback = ErrorFallback;