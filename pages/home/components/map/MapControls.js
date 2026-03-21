// pages/home/components/map/MapControls.js - FIXED LEGEND

window.MapControls = function(props) {
  const {
    totalProperties,
    loadingMore,
    locationStatus,
    locationError,
    onGetUserLocation,
    showToast,
    currentZoom,
    onOpenFilterModal
  } = props;
  
  // State for collapsible legend
  const [legendCollapsed, setLegendCollapsed] = React.useState(true);
  
  // Determine what level we're at
  let zoomLevel = 'Continent';
  if (currentZoom >= 4 && currentZoom <= 5) zoomLevel = 'Country';
  else if (currentZoom >= 6 && currentZoom <= 8) zoomLevel = 'State';
  else if (currentZoom >= 9 && currentZoom <= 11) zoomLevel = 'LGA';
  else if (currentZoom >= 12) zoomLevel = 'Street';
  
  // Auto-collapse legend when zoom changes
  React.useEffect(() => {
    setLegendCollapsed(true);
  }, [currentZoom]);
  
  // Legend component - FIXED with proper dark mode classes
  const Legend = () => {
    return React.createElement('div', {
        key: 'legend',
        className: `absolute bottom-32 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg transition-all duration-300 ${
          legendCollapsed ? 'w-auto' : 'w-48'
        } dark:border dark:border-gray-700`,
        style: { zIndex: 20 }
      },
      // Header (always visible)
      React.createElement('div', {
          onClick: () => setLegendCollapsed(!legendCollapsed),
          className: 'flex items-center justify-between gap-2 p-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg dark:text-gray-200'
        },
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('span', { className: 'text-[10px] font-medium dark:text-gray-300' }, '🗺️ Map Legend'),
          React.createElement('span', { className: 'text-[8px] text-gray-500 dark:text-gray-400' }, `(${zoomLevel})`)
        ),
        React.createElement('span', {
          className: `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-transform duration-300 ${
            legendCollapsed ? '' : 'rotate-180'
          }`
        }, legendCollapsed ? '▼' : '▲')
      ),
      
      // Details (collapsible)
      !legendCollapsed && React.createElement('div', {
          className: 'p-1.5 pt-0 border-t border-gray-200 dark:border-gray-700 text-[8px] space-y-1 animate-fadeIn dark:text-gray-300'
        },
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('div', { className: 'w-2 h-2 bg-[#0a3622] dark:bg-[#2a6a3a] rounded-full' }),
          React.createElement('span', { className: 'dark:text-gray-300' }, 'Continent (Africa)')
        ),
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('div', { className: 'w-2 h-2 bg-[#052e16] dark:bg-[#1e5a2e] rounded-full' }),
          React.createElement('span', { className: 'dark:text-gray-300' }, 'Country (Nigeria)')
        ),
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('div', { className: 'w-2 h-2 bg-[#166534] dark:bg-[#2d7a4a] rounded-full' }),
          React.createElement('span', { className: 'dark:text-gray-300' }, 'State')
        ),
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('div', { className: 'w-2 h-2 bg-[#22c55e] dark:bg-[#3d9e5a] rounded-full' }),
          React.createElement('span', { className: 'dark:text-gray-300' }, 'LGA')
        ),
        React.createElement('div', { className: 'text-[7px] text-gray-500 dark:text-gray-400 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700' },
          `${totalProperties} total properties`
        )
      )
    );
  };
  
  return [
    // Location button
    React.createElement('div', {
        key: 'location-btn',
        className: 'absolute top-14 right-2 flex flex-col items-end',
        style: { zIndex: 20 }
      },
      React.createElement('button', {
          onClick: onGetUserLocation,
          disabled: locationStatus === 'loading',
          className: `bg-white dark:bg-gray-800 rounded-full shadow-lg p-1.5 transition-all hover:scale-110 dark:text-gray-200 dark:hover:bg-gray-700 ${
          locationStatus === 'loading' ? 'opacity-50 cursor-wait' : ''
        }`,
          title: 'Find my location'
        },
        locationStatus === 'loading' ?
        React.createElement('div', { className: 'w-4 h-4 border-2 border-green-950 dark:border-green-400 border-t-transparent rounded-full animate-spin' }) :
        React.createElement('span', { className: 'text-base' }, '📍')
      ),
      
      locationStatus === 'error' && locationError &&
      React.createElement('div', {
        className: 'mt-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] p-1 rounded shadow-lg max-w-[150px]'
      }, locationError)
    ),
    
    // Filter button
    React.createElement('button', {
        key: 'filter-btn',
        onClick: onOpenFilterModal,
        className: 'absolute top-20 left-2 bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 hover:scale-110 transition z-20 dark:text-gray-200 dark:hover:bg-gray-700',
        title: 'Filter listings'
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
    
    // Legend
    Legend(),
  ];
};