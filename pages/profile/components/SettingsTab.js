// pages/profile/components/SettingsTab.js - MODIFIED VERSION

function SettingsTab({
  openDropdowns,
  toggleDropdown,
  openPopup,
  versionInfo,
  checkForUpdates,
  handleLogout,
  settingsRef,
  onVerify // NEW: callback for verification
}) {
  const getArrowIcon = (isOpen) => isOpen ? '✕' : '▼';
  
  return React.createElement('div', {
    ref: settingsRef,
    className: 'bg-white rounded-lg shadow-md p-6 space-y-2'
  },
    
    // ===== NEW: Verification option (at the top) =====
    React.createElement('div', { className: 'border-b border-gray-100 pb-2' },
      React.createElement('button', {
        onClick: onVerify,
        className: 'w-full flex items-center justify-between py-3 text-left px-2 rounded-lg transition hover:bg-gray-50'
      },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-xl' }, '✅'),
          React.createElement('span', { className: 'font-medium text-gray-800' }, 'Get Verified')
        ),
        React.createElement('span', { className: 'text-sm text-gray-400' }, '→')
      )
    ),
    
    // Support dropdown (unchanged)
    React.createElement('div', { className: 'border-b border-gray-100 pb-2' },
      React.createElement('button', {
        onClick: () => toggleDropdown('support'),
        className: 'w-full flex items-center justify-between py-3 text-left px-2 rounded-lg transition'
      },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-xl' }, '📞'),
          React.createElement('span', { className: 'font-medium text-gray-800' }, 'SUPPORT')
        ),
        React.createElement('span', { className: 'text-sm text-gray-500' },
          getArrowIcon(openDropdowns.support)
        )
      ),
      
      openDropdowns.support && React.createElement('div', { className: 'ml-10 mt-1 space-y-1 animate-slide-down' },
        PROFILE_CONSTANTS.SUPPORT_OPTIONS.map(item =>
          React.createElement('button', {
            key: item,
            onClick: () => openPopup(item.toLowerCase().replace(/\s+/g, '_')),
            className: 'w-full flex items-center justify-between py-2 px-2 text-sm text-gray-600 rounded-lg transition hover:bg-gray-50'
          },
            React.createElement('span', null, item),
            React.createElement('span', { className: 'text-gray-400' }, '→')
          )
        )
      )
    ),
    
    // About (unchanged)
    React.createElement('div', { className: 'border-b border-gray-100 pb-2' },
      React.createElement('button', {
        onClick: () => openPopup('about_us'),
        className: 'w-full flex items-center justify-between py-3 text-left px-2 rounded-lg transition'
      },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-xl' }, 'ℹ️'),
          React.createElement('span', { className: 'font-medium text-gray-800' }, 'ABOUT')
        ),
        React.createElement('span', { className: 'text-sm text-gray-400' }, '→')
      )
    ),
    
    // Legal dropdown (unchanged)
    React.createElement('div', { className: 'border-b border-gray-100 pb-2' },
      React.createElement('button', {
        onClick: () => toggleDropdown('legal'),
        className: 'w-full flex items-center justify-between py-3 text-left px-2 rounded-lg transition'
      },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-xl' }, '⚖️'),
          React.createElement('span', { className: 'font-medium text-gray-800' }, 'LEGAL')
        ),
        React.createElement('span', { className: 'text-sm text-gray-500' },
          getArrowIcon(openDropdowns.legal)
        )
      ),
      
      openDropdowns.legal && React.createElement('div', { className: 'ml-10 mt-1 space-y-1 animate-slide-down' },
        PROFILE_CONSTANTS.LEGAL_OPTIONS.map(item =>
          React.createElement('button', {
            key: item,
            onClick: () => openPopup(item.toLowerCase().replace(/\s+&\s+/, '_').replace(/\s+/g, '_')),
            className: 'w-full flex items-center justify-between py-2 px-2 text-sm text-gray-600 rounded-lg transition hover:bg-gray-50'
          },
            React.createElement('span', null, item),
            React.createElement('span', { className: 'text-gray-400' }, '→')
          )
        )
      )
    ),
    
    // Version dropdown (unchanged)
    React.createElement('div', { className: 'border-b border-gray-100 pb-2' },
      React.createElement('button', {
        onClick: () => toggleDropdown('version'),
        className: 'w-full flex items-center justify-between py-3 text-left px-2 rounded-lg transition'
      },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-xl' }, '📦'),
          React.createElement('span', { className: 'font-medium text-gray-800' }, 'VERSION')
        ),
        React.createElement('span', { className: 'text-sm text-gray-500' },
          getArrowIcon(openDropdowns.version)
        )
      ),
      
      openDropdowns.version && React.createElement('div', { className: 'ml-10 mt-1 space-y-2 animate-slide-down' },
        React.createElement('div', { className: 'py-2 px-2 text-sm text-gray-600' },
          React.createElement('span', { className: 'font-mono bg-gray-100 px-2 py-1 rounded' },
            'v' + versionInfo.current
          )
        ),
        
        React.createElement('button', {
          onClick: checkForUpdates,
          disabled: versionInfo.checking,
          className: 'w-full flex items-center justify-between py-2 px-2 text-sm text-gray-600 rounded-lg transition hover:bg-gray-50 disabled:opacity-50'
        },
          React.createElement('span', null, versionInfo.checking ? 'Checking...' : '🔄 Check for Updates'),
          versionInfo.updateAvailable && React.createElement('span', {
            className: 'bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full'
          }, 'New!')
        )
      )
    ),
    
    // Logout (unchanged)
    React.createElement('button', {
      onClick: handleLogout,
      className: 'w-full flex items-center gap-3 py-3 text-left px-2 rounded-lg transition text-red-600 font-medium hover:bg-red-50'
    },
      React.createElement('span', { className: 'text-xl' }, '🚪'),
      React.createElement('span', null, 'LOGOUT')
    )
  );
}

window.SettingsTab = SettingsTab;
