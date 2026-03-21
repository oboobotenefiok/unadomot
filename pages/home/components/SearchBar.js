// pages/home/components/SearchBar.js - WITH ARROW/X TOGGLE (FIXED)

function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  showDropdown,
  setShowDropdown,
  searchHistory,
  suggestions,
  onSelectSuggestion,
  onClearHistory,
  searchInputRef,
  searchDropdownRef,
  touchTargetSize,
  showToast,
  isSearchActive // New prop to know if we're in search mode
}) {
  const handleKeyDown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit(searchTerm);
      setShowDropdown(false);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };
  
  const handleSearchClick = function() {
    if (searchTerm.trim()) {
      onSearchSubmit(searchTerm);
      setShowDropdown(false);
    }
  };
  
  const handleClearClick = function() {
    onClearSearch();
    setShowDropdown(false);
    // Focus back on input after clearing
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  const highlightMatch = function(text, query) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return React.createElement('span', null,
      text.substring(0, index),
      React.createElement('strong', { className: 'bg-yellow-100 font-normal' },
        text.substring(index, index + query.length)
      ),
      text.substring(index + query.length)
    );
  };
  
  // Get icon based on suggestion type
  const getSuggestionIcon = function(suggestion) {
    if (suggestion.icon) return suggestion.icon;
    return '🔍';
  };
  
  // Determine which button to show - Arrow when typing, X when search is active
  const showArrow = searchTerm.length > 0 && !isSearchActive;
  const showX = isSearchActive;
  
  return React.createElement('div', { className: 'flex-1 relative' },
    React.createElement('div', { className: 'relative' },
      React.createElement('input', {
        ref: searchInputRef,
        type: 'text',
        placeholder: 'Search locations, property types, bedrooms...',
        value: searchTerm,
        onChange: function(e) {
          onSearchChange(e.target.value);
          setShowDropdown(true);
        },
        onFocus: function() { setShowDropdown(true); },
        onKeyDown: handleKeyDown,
        className: 'w-full pl-9 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent text-sm'
      }),
      
      // Search icon (always visible)
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
      
      // Dynamic button - Arrow or X
      (showArrow || showX) && React.createElement('button', {
          onClick: showArrow ? handleSearchClick : handleClearClick,
          className: `absolute right-2.5 top-1.5 rounded-full w-7 h-7 flex items-center justify-center transition ${
            showArrow 
              ? 'bg-green-950 text-white hover:bg-green-800' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`,
          'aria-label': showArrow ? 'Search' : 'Clear search'
        },
        showArrow ?
        React.createElement('svg', {
            className: 'w-4 h-4',
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
        ) :
        React.createElement('svg', {
            className: 'w-4 h-4',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: '2.5',
            d: 'M6 18L18 6M6 6l12 12'
          })
        )
      )
    ),
    
    // Search dropdown
    showDropdown && (searchTerm.length === 0 ? searchHistory.length > 0 : suggestions.length > 0) &&
    React.createElement('div', {
        ref: searchDropdownRef,
        className: 'absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-96 overflow-y-auto'
      },
      
      // Search history section
      searchTerm.length === 0 && searchHistory.length > 0 &&
      React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'flex items-center justify-between px-3 py-2 border-b border-gray-50 bg-gray-50' },
          React.createElement('span', { className: 'text-xs font-medium text-gray-500 uppercase tracking-wide' }, 'Recent searches'),
          React.createElement('button', {
            onClick: onClearHistory,
            className: 'text-xs text-gray-400 hover:text-red-500 transition'
          }, 'Clear')
        ),
        searchHistory.map(function(h, i) {
          return React.createElement('button', {
              key: i,
              onClick: function() { onSelectSuggestion(h); },
              className: 'w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm text-gray-700 transition border-b border-gray-50 last:border-0'
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
      
      // Suggestions with categories
      searchTerm.length > 0 && suggestions.length > 0 &&
      React.createElement('div', null,
        suggestions.map(function(item, index) {
          // Render header
          if (item.type === 'header') {
            return React.createElement('div', {
              key: 'header-' + index,
              className: 'px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500'
            }, item.text);
          }
          
          // Render suggestion item
          return React.createElement('button', {
              key: item.type + '-' + item.text + '-' + index,
              onClick: function() { onSelectSuggestion(item.text); },
              className: 'w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left text-sm text-gray-700 transition border-b border-gray-50 last:border-0'
            },
            React.createElement('span', { className: 'text-base' }, getSuggestionIcon(item)),
            React.createElement('div', { className: 'flex-1' },
              highlightMatch(item.text, searchTerm)
            ),
            React.createElement('span', { className: 'text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full' },
              item.category
            )
          );
        })
      ),
      
      // No results message
      searchTerm.length > 0 && suggestions.length === 0 &&
      React.createElement('div', { className: 'px-3 py-4 text-center text-sm text-gray-400' },
        'No matches found for "', searchTerm, '"'
      )
    )
  );
}

window.SearchBar = SearchBar;