// pages/listing-detail/components/Amenities.js
function Amenities({ amenities }) {
  if (!amenities || amenities.length === 0) return null;

  return React.createElement('div', { className: 'mb-6' },
    React.createElement('h2', { className: 'font-bold text-lg mb-3' }, 'Amenities'),
    React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
      amenities.map(function(amenity, i) {
        return React.createElement('div', { key: i, className: 'flex items-center gap-2 text-sm' },
          React.createElement('span', { className: 'text-green-600' }, '✓'),
          React.createElement('span', null, amenity)
        );
      })
    )
  );
}

window.Amenities = Amenities;