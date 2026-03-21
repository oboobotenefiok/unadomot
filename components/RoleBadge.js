// components/RoleBadge.js
function RoleBadge({ user, size = 'sm' }) {
  if (!user) return null;
  
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  // Check verification status from the verified object
  const verified = user.verified || {};
  const isLandlordVerified = verified.landlord?.status === 'approved';
  const isAgentVerified = verified.agent?.status === 'approved';
  
  // Also check legacy userType for backward compatibility
  const userType = user.userType || 'user';
  
  // Build badges array
  const badges = [];
  
  // Case 1: User is verified as Landlord (from new verification system)
  if (isLandlordVerified) {
    badges.push(
      React.createElement('span', {
        key: 'landlord',
        className: `inline-flex items-center bg-green-100 text-green-700 border border-green-200 rounded-full font-medium ${sizes[size] || sizes.sm}`
      }, 'Landlord')
    );
  }
  // Case 2: Fallback for legacy userType = 'landlord' (before verification system)
  else if (userType === 'landlord') {
    badges.push(
      React.createElement('span', {
        key: 'landlord',
        className: `inline-flex items-center bg-green-100 text-green-700 border border-green-200 rounded-full font-medium ${sizes[size] || sizes.sm}`
      }, 'Landlord')
    );
  }
  
  // Case 1: User is verified as Agent (from new verification system)
  if (isAgentVerified) {
    badges.push(
      React.createElement('span', {
        key: 'agent',
        className: `inline-flex items-center bg-gray-700 text-white border border-gray-800 rounded-full font-medium ${sizes[size] || sizes.sm}`
      }, 'Agent')
    );
  }
  // Case 2: Fallback for legacy userType = 'agent' (before verification system)
  else if (userType === 'agent') {
    badges.push(
      React.createElement('span', {
        key: 'agent',
        className: `inline-flex items-center bg-gray-700 text-white border border-gray-800 rounded-full font-medium ${sizes[size] || sizes.sm}`
      }, 'Agent')
    );
  }
  
  // If no badges, return null
  if (badges.length === 0) return null;
  
  // Return badges side by side
  return React.createElement('div', {
    className: 'flex items-center gap-2 flex-wrap'
  }, ...badges);
}

window.RoleBadge = RoleBadge;