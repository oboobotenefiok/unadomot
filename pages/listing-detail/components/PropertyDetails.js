// pages/listing-detail/components/PropertyDetails.js
function PropertyDetails({ listing }) {
  const details = [
    { icon: '🛏️', label: 'Bedrooms', value: listing.bedrooms || '—' },
    { icon: '🚿', label: 'Bathrooms', value: listing.bathrooms || '—' },
    { icon: '📐', label: 'Size', value: listing.size ? listing.size + ' sqm' : '—' },
    { icon: '🪑', label: 'Furnishing', value: listing.furnishing || '—' }
  ];

  return React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-6' },
    details.map(function(detail) {
      return React.createElement('div', { 
        key: detail.label, 
        className: 'bg-gray-50 p-3 rounded-lg text-center' 
      },
        React.createElement('span', { className: 'text-2xl mb-1 block' }, detail.icon),
        React.createElement('p', { className: 'text-xs text-gray-500' }, detail.label),
        React.createElement('p', { className: 'font-bold text-sm' }, detail.value)
      );
    })
  );
}

window.PropertyDetails = PropertyDetails;