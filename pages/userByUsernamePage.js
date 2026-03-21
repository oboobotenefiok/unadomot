// pages/userByUsernamePage.js
function UserByUsernamePage({ navigate }) {
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  
  const username = window.location.pathname.split('/')[2];
  
  React.useEffect(() => {
    if (!username) {
      setError('No username provided');
      setLoading(false);
      return;
    }
    
    const resolveUsername = async () => {
      try {
        if (window.IDGenerator) {
          const formatError = window.IDGenerator.validateUsername(username);
          if (formatError) {
                      }
        }
        
        const result = await FirestoreQueries.query({
          collection: 'users',
          where: [['username', '==', username]],
          limit: 1
        });
        
        if (result.data.length === 0) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        const userId = result.data[0].id;
        navigate('/profile/' + userId);
        
      } catch (err) {
        console.error('Error resolving username:', err);
        setError('Failed to load user. Please try again.');
        setLoading(false);
      }
    };
    
    resolveUsername();
  }, [username, navigate]);
  
  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 'Finding user...')
      )
    );
  }
  
  if (error) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center max-w-md mx-auto px-4' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '😕'),
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'User Not Found'),
        React.createElement('p', { className: 'text-gray-600 mb-6' },
          error === 'User not found' ?
          `No user found with username "@${username}"` :
          error
        ),
        React.createElement('button', {
          onClick: () => navigate('/'),
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Go Home')
      )
    );
  }
  
  return null;
}

window.UserByUsernamePage = UserByUsernamePage;