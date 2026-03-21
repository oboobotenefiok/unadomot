// pages/home/components/PriceRangeSlider.js
function PriceRangeSlider({ minPrice, maxPrice, onMinChange, onMaxChange, onApply }) {
  const [localMin, setLocalMin] = React.useState(minPrice || '');
  const [localMax, setLocalMax] = React.useState(maxPrice || '');
  const [showPresets, setShowPresets] = React.useState(false);
  
  const presets = [
    { label: 'Under ₦500k', min: '', max: '500000' },
    { label: '₦500k - ₦1M', min: '500000', max: '1000000' },
    { label: '₦1M - ₦3M', min: '1000000', max: '3000000' },
    { label: '₦3M - ₦5M', min: '3000000', max: '5000000' },
    { label: 'Above ₦5M', min: '5000000', max: '' }
  ];
  
  const handleApply = () => {
    onApply(localMin, localMax);
  };
  
  const handlePresetSelect = (preset) => {
    setLocalMin(preset.min);
    setLocalMax(preset.max);
    onApply(preset.min, preset.max);
    setShowPresets(false);
  };
  
  const formatNaira = (value) => {
    if (!value) return '';
    return `₦${Number(value).toLocaleString()}`;
  };
  
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-4' },
    // Header with presets toggle
    React.createElement('div', { className: 'flex justify-between items-center mb-3' },
      React.createElement('h3', { className: 'font-bold text-gray-900' }, 'Price Range'),
      React.createElement('button', {
          onClick: () => setShowPresets(!showPresets),
          className: 'text-xs text-green-950 hover:underline flex items-center gap-1'
        },
        React.createElement('span', null, 'Quick picks'),
        React.createElement('svg', {
            className: `w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`,
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' })
        )
      )
    ),
    
    // Presets dropdown
    showPresets && React.createElement('div', { className: 'mb-4 space-y-1' },
      presets.map((preset, i) =>
        React.createElement('button', {
          key: i,
          onClick: () => handlePresetSelect(preset),
          className: 'w-full text-left px-3 py-2 text-sm hover:bg-green-50 rounded-lg transition'
        }, preset.label)
      )
    ),
    
    // Slider inputs
    React.createElement('div', { className: 'space-y-4' },
      // Min price
      React.createElement('div', null,
        React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Minimum'),
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-3 top-2 text-gray-500' }, '₦'),
          React.createElement('input', {
            type: 'number',
            value: localMin,
            onChange: (e) => setLocalMin(e.target.value),
            placeholder: 'Any',
            className: 'w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-950'
          })
        )
      ),
      
      // Max price
      React.createElement('div', null,
        React.createElement('label', { className: 'block text-xs text-gray-600 mb-1' }, 'Maximum'),
        React.createElement('div', { className: 'relative' },
          React.createElement('span', { className: 'absolute left-3 top-2 text-gray-500' }, '₦'),
          React.createElement('input', {
            type: 'number',
            value: localMax,
            onChange: (e) => setLocalMax(e.target.value),
            placeholder: 'Any',
            className: 'w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-950'
          })
        )
      ),
      
      // Visual range indicator
      React.createElement('div', { className: 'relative h-2 bg-gray-200 rounded-full mt-4' },
        React.createElement('div', {
          className: 'absolute h-full bg-green-950 rounded-full',
          style: {
            left: localMin ? `${Math.min(Number(localMin) / 10000000 * 100, 100)}%` : '0%',
            right: localMax ? `${100 - Math.min(Number(localMax) / 10000000 * 100, 100)}%` : '0%'
          }
        })
      ),
      
      // Apply button
      React.createElement('button', {
        onClick: handleApply,
        className: 'w-full bg-green-950 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition mt-2'
      }, 'Apply Price Filter')
    )
  );
}

window.PriceRangeSlider = PriceRangeSlider;