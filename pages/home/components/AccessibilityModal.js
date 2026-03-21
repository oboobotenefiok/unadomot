// pages/home/components/AccessibilityModal.js
function AccessibilityModal({ onClose, settings, updateSetting, resetSettings }) {
  return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
    React.createElement('div', { className: 'relative w-64 bg-white rounded-xl shadow-2xl overflow-hidden' },
      React.createElement('div', { className: 'flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50' },
        React.createElement('h3', { className: 'font-bold text-sm text-gray-900' }, 'Accessibility'),
        React.createElement('button', {
            onClick: onClose,
            className: 'text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200'
          },
          React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ),
      
      React.createElement('div', { className: 'p-3 space-y-4' },
        
        // Dark mode
        React.createElement('div', { className: 'mb-3 pb-3 border-b border-gray-200' },
          React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
            React.createElement('span', { className: 'text-xs font-medium text-gray-700 flex items-center gap-1' },
              React.createElement('span', { className: 'text-base' }, '🌙'), 'Dark Mode'
            ),
            React.createElement('button', {
                onClick: function(e) {
                  e.stopPropagation();
                  const isDark = !document.body.classList.contains('dark-mode');
                  document.body.classList.toggle('dark-mode', isDark);
                  localStorage.setItem('darkMode', isDark);
                  if (window.useAccessibility) {
                    const { updateSetting: us } = window.useAccessibility();
                    us('darkMode', isDark);
                  }
                },
                className: 'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ' +
                  (document.body.classList.contains('dark-mode') ? 'bg-green-950' : 'bg-gray-300'),
                role: 'switch',
                'aria-checked': document.body.classList.contains('dark-mode')
              },
              React.createElement('span', {
                className: 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
                  (document.body.classList.contains('dark-mode') ? 'translate-x-5' : 'translate-x-0.5')
              })
            )
          )
        ),
        
        // Text size
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Text Size'),
          React.createElement('select', {
              value: settings.fontSize,
              onChange: function(e) { updateSetting('fontSize', e.target.value); },
              className: 'w-full p-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-950'
            },
            React.createElement('option', { value: 'small' }, 'Small'),
            React.createElement('option', { value: 'normal' }, 'Normal'),
            React.createElement('option', { value: 'large' }, 'Large'),
            React.createElement('option', { value: 'x-large' }, 'Extra Large')
          )
        ),
        
        // Accessibility toggles
        React.createElement('div', { className: 'space-y-2' },
          [
            { key: 'highContrast', label: 'High Contrast' },
            { key: 'reduceMotion', label: 'Reduce Motion' },
            { key: 'dyslexicFont', label: 'Dyslexia Font' },
            { key: 'showLinks', label: 'Underline Links' }
          ].map(function(item) {
            return React.createElement('label', {
                key: item.key,
                className: 'flex items-center justify-between cursor-pointer p-1.5 bg-gray-50 rounded hover:bg-gray-100'
              },
              React.createElement('span', { className: 'text-xs font-medium text-gray-700' }, item.label),
              React.createElement('input', {
                type: 'checkbox',
                checked: settings[item.key],
                onChange: function(e) { updateSetting(item.key, e.target.checked); },
                className: 'w-3.5 h-3.5 accent-green-900'
              })
            );
          })
        ),
        
        // Reset button
        React.createElement('button', {
          onClick: function() {
            resetSettings();
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
          },
          className: 'w-full mt-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-xs'
        }, 'Reset to Default')
      )
    )
  );
}

window.AccessibilityModal = AccessibilityModal;