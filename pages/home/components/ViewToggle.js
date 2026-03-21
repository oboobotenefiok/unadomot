// pages/home/components/ViewToggle.js
function ViewToggle({ viewMode, onToggle }) {
  return React.createElement('button', {
      onClick: onToggle,
      className: `p-2 rounded-full transition-all duration-300 ${
      viewMode === 'map' 
        ? 'bg-green-950 text-white shadow-lg scale-110' 
        : 'bg-white text-gray-600 hover:bg-gray-100'
    }`,
      'aria-label': viewMode === 'grid' ? 'Switch to map view' : 'Switch to grid view',
      title: viewMode === 'grid' ? 'View properties on map' : 'View properties as grid'
    },
    viewMode === 'grid' ?
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
        d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
      })
    ) :
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
        d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
      })
    )
  );
}

window.ViewToggle = ViewToggle;