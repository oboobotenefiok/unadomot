
function NotFoundPage({ navigate }) {
  return React.createElement('div', { className: 'min-h-screen bg-green-50' },
    
    
    
    React.createElement('div', { className: 'max-w-2xl mx-auto text-center py-20 px-4' },
      React.createElement('h1', { className: 'text-8xl font-bold text-gray-200 mb-4' }, '404'),
      React.createElement('h2', { className: 'text-3xl font-bold text-gray-900 mb-4' }, 'Page not found'),
      React.createElement('p', { className: 'text-gray-600 mb-8' },
        "The page you're looking for doesn't exist or has been moved."
      ),
      React.createElement('a', {
        href: '/',
        onClick: function(e) {
          e.preventDefault();
          navigate('/');
        },
        className: 'inline-block bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-100 cursor-pointer'
      }, 'Go back home')
    )
  );
}