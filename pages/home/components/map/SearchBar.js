// pages/home/components/SearchBar.js
function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  showDropdown,
  setShowDropdown,
  searchHistory,
  suggestions,
  onSelectSuggestion,
  onClearHistory,
  searchInputRef,
  searchDropdownRef,
  touchTargetSize,
  showToast
}) {
  const handleKeyDown = function(e) {
    if (e.key === 'Enter') {
      onSearchSubmit(searchTerm);
      setShowDropdown(false);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      onSearchChange('');
    }
  };
  
  const highlightMatch = function(text, query) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return React.createElement('span', null,
      text.substring(0, index),
      React.createElement('strong', { className: 'bg-yellow-100' },
        text.substring(index, index + query.length)
      ),
      text.substring(index + query.length)
    );
  };
  
  return React.createElement('div', { className: 'flex-1 relative' },
    React.createElement('div', { className: 'relative' },
      React.createElement('input', {
        ref: searchInputRef,
        type: 'text',
        placeholder: 'Search properties, locations...',
        value: searchTerm,
        onChange: function(e) {
          onSearchChange(e.target.value);
          setShowDropdown(true);
        },
        onFocus: function() { setShowDropdown(true); },
        onKeyDown: handleKeyDown,
        className: 'w-full pl-9 pr-8 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent text-sm'
      }),
      // Search icon
      React.createElement('svg', {
          className: 'absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none',
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
      // Search button
      searchTerm && React.createElement('button', {
          onClick: function() {
            onSearchSubmit(searchTerm);
            setShowDropdown(false);
          },
          className: 'absolute right-2.5 top-1.5 bg-green-950 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-green-800 transition',
          'aria-label': 'Search'
        },
        React.createElement('svg', {
            className: 'w-3.5 h-3.5',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2.5',
            d: 'M9 5l7 7-7 7'
          })
        )
      )
    ),
    
    // Search dropdown
    showDropdown && (searchTerm.length === 0 ? searchHistory.length > 0 : suggestions.length > 0) &&
    React.createElement('div', {
        ref: searchDropdownRef,
        className: 'absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden'
      },
      searchTerm.length === 0 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'flex items-center justify-between px-3 py-2 border-b border-gray-50' },
          React.createElement('span', { className: 'text-xs font-medium text-gray-400 uppercase tracking-wide' }, 'Recent searches'),
          React.createElement('button', {
            onClick: onClearHistory,
            className: 'text-xs text-gray-400 hover:text-red-500 transition'
          }, 'Clear')
        ),
        searchHistory.map(function(h, i) {
          return React.createElement('button', {
              key: i,
              onClick: function() { onSelectSuggestion(h); },
              className: 'w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm text-gray-700 transition'
            },
            React.createElement('svg', {
                className: 'w-3.5 h-3.5 text-gray-400 flex-shrink-0',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              })
            ),
            h
          );
        })
      ),
      searchTerm.length > 0 && suggestions.map(function(s, i) {
        return React.createElement('button', {
            key: i,
            onClick: function() { onSelectSuggestion(s); },
            className: 'w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left text-sm text-gray-700 transition'
          },
          React.createElement('svg', {
              className: 'w-3.5 h-3.5 text-green-600 flex-shrink-0',
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
          highlightMatch(s, searchTerm)
        );
      })
    )
  );
}

window.SearchBar = SearchBar;