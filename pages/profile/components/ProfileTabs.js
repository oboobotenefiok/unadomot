// pages/profile/components/ProfileTabs.js - MODIFIED VERSION

function ProfileTabs({ activeTab, onTabChange }) {
  return React.createElement('div', { className: 'mb-6 border-b border-gray-200' },
    React.createElement('div', { className: 'flex items-center' },
      
      // Listings tab (unchanged)
      React.createElement('button', {
        onClick: () => onTabChange('listings'),
        className: `flex-1 flex justify-center py-3 text-2xl transition ${
          activeTab === 'listings' 
            ? 'text-green-950 border-b-2 border-green-950' 
            : 'text-gray-400 hover:text-gray-600'
        }`
      }, '☰'),
      
      React.createElement('div', { className: 'h-6 w-px bg-gray-300 mx-2' }),
      
      // ===== Settings tab - REPLACED ICON =====
      React.createElement('button', {
        onClick: () => onTabChange('settings'),
        className: `flex-1 flex justify-center py-3 transition ${
          activeTab === 'settings' 
            ? 'opacity-100 border-b-2 border-green-950 pb-2' 
            : 'opacity-60 hover:opacity-100'
        }`
      },
        // ===== NEW: Info icon (letter 'i' with hexagon) =====
        React.createElement('svg', {
          className: 'w-6 h-6',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        },
          // Hexagon shape
          React.createElement('path', {
            d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'
          }),
          // Letter 'i'
          React.createElement('circle', { cx: '12', cy: '9', r: '0.5', fill: 'currentColor' }),
          React.createElement('line', { x1: '12', y1: '12', x2: '12', y2: '17' })
        )
      )
    )
  );
}

window.ProfileTabs = ProfileTabs;
