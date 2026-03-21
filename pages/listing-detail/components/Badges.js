// pages/listing-detail/components/Badges.js
function Badges({ listing }) {
  const badges = [];
  
  // Property type badge
  if (listing.propertyType) {
    badges.push(
      React.createElement('span', {
        key: 'type',
        className: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm'
      }, listing.propertyType)
    );
  }
  
  // ===== UPDATED: Role badge using listingRole =====
  // Shows Landlord or Agent badge based on listing.listingRole
  const listingRole = listing.listingRole;
  
  if (listingRole === 'landlord') {
    badges.push(
      React.createElement('span', {
        key: 'landlord',
        className: 'inline-flex items-center bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm'
      }, 'Landlord')
    );
  } else if (listingRole === 'agent') {
    badges.push(
      React.createElement('span', {
        key: 'agent',
        className: 'inline-flex items-center bg-gray-700 text-white border border-gray-800 px-3 py-1 rounded-full text-sm'
      }, 'Agent')
    );
  }
  
  if (badges.length === 0) return null;
  
  return React.createElement('div', { className: 'flex flex-wrap gap-2 mb-6' },
    ...badges
  );
}

window.Badges = Badges;