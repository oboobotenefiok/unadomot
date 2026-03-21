// pages/home/components/FilterBar.js
function FilterBar({
  activeFilterCount,
  onOpenFilters,
  touchTargetSize
}) {
  return React.createElement('div', { className: 'relative' },
    React.createElement('button', {
        onClick: onOpenFilters,
        className: 'p-2 text-gray-600 hover:text-green-950 rounded-full hover:bg-gray-100 transition ' + touchTargetSize,
        'aria-label': 'Filter listings'
      },
      React.createElement('svg', {
          className: 'w-5 h-5',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '2',
          d: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
        })
      )
    ),
    activeFilterCount > 0 && React.createElement('span', {
      className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px]'
    }, activeFilterCount)
  );
}

function FilterModal({
  show,
  onClose,
  filters,
  tempFilters,
  availableLgas,
  onUpdateFilter,
  onApply,
  onClear,
  activeFilterCount,
  onLocationSelect, // ← NEW: function to center map on selected location
  mapInstance // ← NEW: map instance for centering
}) {
  if (!show) return null;
  
  // ===== NEW: Handle location selection =====
  const handleLocationApply = () => {
    // If state and LGA are selected, center map there
    if (tempFilters.state && tempFilters.lga && onLocationSelect && mapInstance) {
      // Find the LGA coordinates from nigeria-states.js
      const stateData = (window.nigeriaStates || []).find(s => s.name === tempFilters.state);
      if (stateData) {
        const lgaData = stateData.lgas?.find(l => l.name === tempFilters.lga);
        if (lgaData && lgaData.lat && lgaData.lng) {
          // Center map on LGA
          mapInstance.setView([lgaData.lat, lgaData.lng], 12);
          onLocationSelect({
            lat: lgaData.lat,
            lng: lgaData.lng,
            display: `${tempFilters.lga}, ${tempFilters.state}`
          });
        } else if (stateData.lat && stateData.lng) {
          // Fallback to state center
          mapInstance.setView([stateData.lat, stateData.lng], 8);
          onLocationSelect({
            lat: stateData.lat,
            lng: stateData.lng,
            display: tempFilters.state
          });
        }
      }
    }
    
    // Apply all filters
    onApply();
  };
  
  return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
    React.createElement('div', { className: 'relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden' },
      React.createElement('div', { className: 'flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50' },
        React.createElement('h3', { className: 'font-bold text-base text-gray-900' }, 'Filter Listings',
          activeFilterCount > 0 && React.createElement('span', {
            className: 'ml-2 text-xs font-normal text-gray-500'
          }, '(' + activeFilterCount + ')')
        ),
        React.createElement('button', {
            onClick: onClose,
            className: 'text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200'
          },
          React.createElement('svg', {
              className: 'w-4 h-4',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: '2',
              d: 'M6 18L18 6M6 6l12 12'
            })
          )
        )
      ),
      
      React.createElement('div', { className: 'p-3 max-h-[50vh] overflow-y-auto' },
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          
          // Price range - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-2 mb-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Price (₦)'),
            React.createElement('div', { className: 'flex gap-1' },
              React.createElement('input', {
                type: 'number',
                placeholder: 'Min',
                value: tempFilters.minPrice,
                onChange: function(e) { onUpdateFilter('minPrice', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              }),
              React.createElement('input', {
                type: 'number',
                placeholder: 'Max',
                value: tempFilters.maxPrice,
                onChange: function(e) { onUpdateFilter('maxPrice', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              })
            )
          ),
          
          // State - ALWAYS SHOW NOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'State'),
            React.createElement('select', {
                value: tempFilters.state,
                onChange: function(e) { onUpdateFilter('state', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              },
              React.createElement('option', { value: '' }, 'All'),
              (window.nigeriaStates || []).map(function(s) {
                return React.createElement('option', { key: s.name, value: s.name }, s.name);
              })
            )
          ),
          
          // LGA - ALWAYS SHOW NOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'LGA'),
            React.createElement('select', {
                value: tempFilters.lga,
                onChange: function(e) { onUpdateFilter('lga', e.target.value); },
                disabled: !tempFilters.state,
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950' + (!tempFilters.state ? ' bg-gray-100 cursor-not-allowed' : '')
              },
              React.createElement('option', { value: '' }, 'All'),
              availableLgas.map(function(lga) {
                return React.createElement('option', { key: lga, value: lga }, lga);
              })
            )
          ),
          
          // Bedrooms - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Bedrooms'),
            React.createElement('select', {
                value: tempFilters.bedrooms,
                onChange: function(e) { onUpdateFilter('bedrooms', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              },
              React.createElement('option', { value: '' }, 'Any'),
              React.createElement('option', { value: 'Self-contain' }, 'Self'),
              React.createElement('option', { value: '1' }, '1'),
              React.createElement('option', { value: '2' }, '2'),
              React.createElement('option', { value: '3' }, '3'),
              React.createElement('option', { value: '4' }, '4'),
              React.createElement('option', { value: '5+' }, '5+')
            )
          ),
          
          // Property Type - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Type'),
            React.createElement('select', {
                value: tempFilters.propertyType,
                onChange: function(e) { onUpdateFilter('propertyType', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              },
              React.createElement('option', { value: '' }, 'Any'),
              React.createElement('option', { value: 'Apartment' }, 'Apt'),
              React.createElement('option', { value: 'House' }, 'House'),
              React.createElement('option', { value: 'Self Contain' }, 'SC'),
              React.createElement('option', { value: 'Room' }, 'Room'),
              React.createElement('option', { value: 'Duplex' }, 'Duplex')
            )
          ),
          
          // Furnishing - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Furnishing'),
            React.createElement('select', {
                value: tempFilters.furnishing,
                onChange: function(e) { onUpdateFilter('furnishing', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              },
              React.createElement('option', { value: '' }, 'Any'),
              React.createElement('option', { value: 'Furnished' }, 'Full'),
              React.createElement('option', { value: 'Semi-furnished' }, 'Semi'),
              React.createElement('option', { value: 'Unfurnished' }, 'Empty')
            )
          ),
          
          // Sort - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Sort'),
            React.createElement('select', {
                value: tempFilters.sortBy,
                onChange: function(e) { onUpdateFilter('sortBy', e.target.value); },
                className: 'w-full p-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-950'
              },
              React.createElement('option', { value: 'smart' }, 'Smart'),
              React.createElement('option', { value: 'price_low' }, 'Price ↓'),
              React.createElement('option', { value: 'price_high' }, 'Price ↑')
            )
          ),
          
          // Agent toggles - ALWAYS SHOW
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'flex items-center justify-between cursor-pointer p-1.5 bg-gray-50 rounded hover:bg-gray-100' },
              React.createElement('span', { className: 'text-xs font-medium text-gray-700' }, 'Agent Only'),
              React.createElement('input', {
                type: 'checkbox',
                checked: tempFilters.agentOnly,
                onChange: function(e) { onUpdateFilter('agentOnly', e.target.checked); },
                className: 'w-3.5 h-3.5 accent-green-900'
              })
            )
          ),
          React.createElement('div', { className: 'col-span-1' },
            React.createElement('label', { className: 'flex items-center justify-between cursor-pointer p-1.5 bg-gray-50 rounded hover:bg-gray-100' },
              React.createElement('span', { className: 'text-xs font-medium text-gray-700' }, 'No Fees'),
              React.createElement('input', {
                type: 'checkbox',
                checked: tempFilters.noAgentFees,
                onChange: function(e) { onUpdateFilter('noAgentFees', e.target.checked); },
                className: 'w-3.5 h-3.5 accent-green-900'
              })
            )
          )
        )
      ),
      
      React.createElement('div', { className: 'flex gap-2 p-3 border-t border-gray-200 bg-gray-50' },
        React.createElement('button', {
          onClick: onClear,
          className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-xs'
        }, 'Clear'),
        React.createElement('button', {
          onClick: handleLocationApply, // ← Use new handler that centers map
          className: 'flex-1 bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition font-bold text-xs'
        }, 'Apply Filters')
      )
    )
  );
}

window.FilterBar = FilterBar;
window.FilterModal = FilterModal;