// pages/listing-detail/components/Badges.js
function Badges({ listing }) {
  const badges = [];

  if (listing.propertyType) {
    badges.push(
      React.createElement('span', { 
        key: 'type',
        className: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm' 
      }, listing.propertyType)
    );
  }

  if (!listing.agentToggle) {
    badges.push(
      React.createElement('span', { 
        key: 'agent-free',
        className: 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm' 
      }, '🏠 No Agent Fees')
    );
  }

  if (listing.agentToggle) {
    badges.push(
      React.createElement('span', { 
        key: 'agent',
        className: 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm' 
      }, '🏢 Listed by Agent')
    );
  }

  if (badges.length === 0) return null;

  return React.createElement('div', { className: 'flex flex-wrap gap-2 mb-6' },
    ...badges
  );
}

window.Badges = Badges;