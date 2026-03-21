// pages/listing-detail/components/Description.js
function Description({ listing }) {
  return React.createElement('div', { className: 'mb-6' },
    React.createElement('h2', { className: 'font-bold text-lg mb-2' }, 'Description'),
    React.createElement('p', { className: 'text-gray-700 whitespace-pre-line leading-relaxed' },
      listing.description || LISTING_DETAIL_CONSTANTS.PLACEHOLDERS.NO_DESCRIPTION
    )
  );
}

window.Description = Description;