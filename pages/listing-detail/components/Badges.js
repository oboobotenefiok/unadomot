// pages/listing-detail/components/Badges.js
function Badges({ listing, userType }) {
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
  
  // ===== UPDATED: Role badge - shows Landlord or Agent based on userType =====
  // Only show for landlords and agents (not regular users)
  if (userType && userType !== 'user') {
    const badgeStyles = userType === 'landlord' ?
      'bg-green-100 text-green-700 border-green-200' :
      'bg-gray-700 text-white border-gray-800';
    
    const badgeLabel = userType === 'landlord' ? 'Landlord' : 'Agent';
    
    badges.push(
      React.createElement('span', {
        key: 'role',
        className: `inline-flex items-center px-3 py-1 rounded-full text-sm ${badgeStyles}`
      }, badgeLabel)
    );
  }
  
  if (badges.length === 0) return null;
  
  return React.createElement('div', { className: 'flex flex-wrap gap-2 mb-6' },
    ...badges
  );
}

window.Badges = Badges;