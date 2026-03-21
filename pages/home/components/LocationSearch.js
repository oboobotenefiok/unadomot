// pages/home/components/LocationSearch.js
function LocationSearch({ onLocationSelect }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [showResults, setShowResults] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const searchRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = async (text) => {
    if (text.length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    
    try {
      // Use Nominatim for location search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Nigeria')}&limit=5`,
        { headers: { 'User-Agent': 'UnaDomot/1.0' } }
      );
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = React.useCallback(
    debounce(searchLocation, 500), []
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSelect = (result) => {
    setQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    onLocationSelect({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name
    });
  };

  return React.createElement('div', {
    ref: searchRef,
    className: 'relative flex-1'
  },
    React.createElement('input', {
      type: 'text',
      value: query,
      onChange: handleInputChange,
      placeholder: 'Search location...',
      className: 'w-full pl-9 pr-8 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-950'
    }),
    React.createElement('svg', {
      className: 'absolute left-3 top-2.5 w-4 h-4 text-gray-400',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
      })
    ),
    searching && React.createElement('div', {
      className: 'absolute right-3 top-2.5 w-4 h-4 border-2 border-green-950 border-t-transparent rounded-full animate-spin'
    }),

    showResults && results.length > 0 && React.createElement('div', {
      className: 'absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto'
    },
      results.map((r, i) => 
        React.createElement('button', {
          key: i,
          onClick: () => handleSelect(r),
          className: 'w-full text-left px-4 py-2 hover:bg-green-50 text-sm border-b last:border-0'
        }, r.display_name)
      )
    )
  );
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.LocationSearch = LocationSearch;