// components/AccessibilityPanel.js - With Dark Mode Toggle
function AccessibilityPanel({ onClose }) {
  const { settings, updateSetting, resetSettings } = window.useAccessibility();
  
  return React.createElement('div', {
      className: 'fixed top-20 right-4 w-80 bg-white rounded-lg shadow-xl z-50 p-4'
    },
    React.createElement('div', { className: 'flex justify-between items-center mb-4' },
      React.createElement('h3', { className: 'font-bold text-lg' }, 'Accessibility'),
      React.createElement('button', {
        onClick: onClose,
        className: 'text-gray-500 hover:text-gray-700'
      }, '✕')
    ),
    
    // ===== DARK MODE TOGGLE - ADDED =====
    React.createElement('div', { className: 'mb-4 pb-4 border-b border-gray-200' },
      React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
        React.createElement('span', { className: 'text-sm font-medium flex items-center gap-2' },
          React.createElement('span', { className: 'text-base' }, '🌙'),
          'Dark Mode'
        ),
        React.createElement('button', {
            onClick: function(e) {
              e.stopPropagation();
              const isDark = !document.body.classList.contains('dark-mode');
              document.body.classList.toggle('dark-mode', isDark);
              localStorage.setItem('darkMode', isDark);
              updateSetting('darkMode', isDark);
            },
            className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            document.body.classList.contains('dark-mode') ? 'bg-green-950' : 'bg-gray-300'
          }`,
            role: 'switch',
            'aria-checked': document.body.classList.contains('dark-mode')
          },
          React.createElement('span', {
            className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              document.body.classList.contains('dark-mode') ? 'translate-x-5' : 'translate-x-0.5'
            }`
          })
        )
      )
    ),
    
    React.createElement('div', { className: 'mb-4' },
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Text Size'),
      React.createElement('div', { className: 'flex gap-2' },
        ['small', 'normal', 'large', 'x-large'].map(size =>
          React.createElement('button', {
            key: size,
            onClick: function() { updateSetting('fontSize', size); },
            className: `px-3 py-1 rounded ${settings.fontSize === size ? 'bg-green-950 text-white' : 'bg-gray-100'}`
          }, size)
        )
      )
    ),
    
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
        React.createElement('span', { className: 'text-sm' }, 'High Contrast'),
        React.createElement('input', {
          type: 'checkbox',
          checked: settings.highContrast,
          onChange: function(e) { updateSetting('highContrast', e.target.checked); },
          className: 'toggle-checkbox'
        })
      ),
      
      React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
        React.createElement('span', { className: 'text-sm' }, 'Reduce Motion'),
        React.createElement('input', {
          type: 'checkbox',
          checked: settings.reduceMotion,
          onChange: function(e) { updateSetting('reduceMotion', e.target.checked); }
        })
      ),
      
      React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
        React.createElement('span', { className: 'text-sm' }, 'Dyslexia-Friendly Font'),
        React.createElement('input', {
          type: 'checkbox',
          checked: settings.dyslexicFont,
          onChange: function(e) { updateSetting('dyslexicFont', e.target.checked); }
        })
      ),
      
      React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
        React.createElement('span', { className: 'text-sm' }, 'Always Underline Links'),
        React.createElement('input', {
          type: 'checkbox',
          checked: settings.showLinks,
          onChange: function(e) { updateSetting('showLinks', e.target.checked); }
        })
      )
    ),
    
    React.createElement('button', {
      onClick: function() {
        resetSettings();
        // Also reset dark mode
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
      },
      className: 'w-full mt-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200'
    }, 'Reset to Default')
  );
}

window.AccessibilityPanel = AccessibilityPanel;