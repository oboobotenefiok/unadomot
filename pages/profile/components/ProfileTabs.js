// pages/profile/components/ProfileTabs.js
function ProfileTabs({ activeTab, onTabChange }) {
  return React.createElement('div', { className: 'mb-6 border-b border-gray-200' },
    React.createElement('div', { className: 'flex items-center' },
      
      React.createElement('button', {
        onClick: () => onTabChange('listings'),
        className: `flex-1 flex justify-center py-3 text-2xl transition ${
          activeTab === 'listings' 
            ? 'text-green-950 border-b-2 border-green-950' 
            : 'text-gray-400 hover:text-gray-600'
        }`
      }, '☰'),
      
      React.createElement('div', { className: 'h-6 w-px bg-gray-300 mx-2' }),
      
      React.createElement('button', {
        onClick: () => onTabChange('settings'),
        className: `flex-1 flex justify-center py-3 transition ${
          activeTab === 'settings' 
            ? 'opacity-100 border-b-2 border-green-950 pb-2' 
            : 'opacity-60 hover:opacity-100'
        }`
      },
        React.createElement('img', {
          src: '/vault/img/unadomot.jpg',
          alt: 'Settings',
          className: 'w-6 h-6 rounded-full object-cover'
        })
      )
    )
  );
}

window.ProfileTabs = ProfileTabs;