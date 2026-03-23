// pages/ListingByCodePage.js
// Resolves listing codes like /listing/250322-001-a1b to actual listing IDs

function ListingByCodePage({ navigate }) {
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  
  const listingCode = window.location.pathname.split('/')[2];
  
  React.useEffect(() => {
    if (!listingCode) {
      setError('No listing code provided');
      setLoading(false);
      return;
    }
    
    const resolveListingCode = async () => {
      try {
        // Validate format
        if (window.IDGenerator && !window.IDGenerator.validateListingCode(listingCode)) {
          setError('Invalid listing code format');
          setLoading(false);
          return;
        }
        
        // Query by listingCode
        const result = await FirestoreQueries.query({
          collection: 'listings',
          where: [['listingCode', '==', listingCode]],
          limit: 1
        });
        
        if (result.data.length === 0) {
          setError('Listing not found');
          setLoading(false);
          return;
        }
        
        const listing = result.data[0];
        
        // Check if listing is deleted
        if (listing.status === 'deleted') {
          setError('This listing has been removed');
          setLoading(false);
          return;
        }
        
        // Check if listing is pending review (not yet live)
        if (listing.status === 'pending_review') {
          setError('This listing is pending review and not yet available');
          setLoading(false);
          return;
        }
        
        // Redirect to the listing detail page (by Firestore ID)
        navigate('/listing/' + listing.id);
        
      } catch (err) {
        console.error('Error resolving listing code:', err);
        setError('Failed to load listing. Please try again.');
        setLoading(false);
      }
    };
    
    resolveListingCode();
  }, [listingCode, navigate]);
  
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
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Listing Not Available'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, error),
        React.createElement('button', {
          onClick: () => navigate('/'),
          className: 'bg-green-950 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition cursor-pointer'
        }, 'Go Home')
      )
    );
  }
  
  return null;
}

window.ListingByCodePage = ListingByCodePage;