// pages/ListingByShortCodePage.js
function ListingByShortCodePage({ navigate }) {
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  
  const shortCode = window.location.pathname.split('/')[2];
  
  React.useEffect(() => {
    if (!shortCode) {
      setError('No listing code provided');
      setLoading(false);
      return;
    }
    
    const resolveShortCode = async () => {
      try {
        if (window.IDGenerator) {
          const isValid = window.IDGenerator.validateListingCode(shortCode);
          if (!isValid) {
            
          }
        }
        
        const result = await FirestoreQueries.query({
          collection: 'listings',
          where: [['shortCode', '==', shortCode]],
          limit: 1
        });
        
        if (result.data.length === 0) {
          setError('Listing not found');
          setLoading(false);
          return;
        }
        
        const listingId = result.data[0].id;
        const listingData = result.data[0];
        
        if (listingData.status === 'deleted') {
          setError('This listing has been removed');
          setLoading(false);
          return;
        }
        
        navigate('/listing/' + listingId);
        
      } catch (err) {
        
        setError('Failed to load listing. Please try again.');
        setLoading(false);
      }
    };
    
    resolveShortCode();
  }, [shortCode, navigate]);
  
  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 'Finding listing...')
      )
    );
  }
  
  if (error) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center max-w-md mx-auto px-4' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '🏠'),
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Listing Not Found'),
        React.createElement('p', { className: 'text-gray-600 mb-6' },
          error === 'Listing not found' ?
          `No listing found with code "${shortCode}"` :
          error
        ),
        React.createElement('button', {
          onClick: () => navigate('/listings'),
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Browse Listings')
      )
    );
  }
  
  return null;
}

window.ListingByShortCodePage = ListingByShortCodePage;