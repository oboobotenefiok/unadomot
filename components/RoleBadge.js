// components/RoleBadge.js
function RoleBadge({ user, size = 'sm' }) {
  if (!user) return null;
  
  const userType = user.userType || 'user';
  
  // Regular users get no badge
  if (userType === 'user') return null;
  
  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  // Define badge styles based on role
  const getBadgeStyles = () => {
    if (userType === 'landlord') {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Landlord'
      };
    }
    
    if (userType === 'agent') {
      return {
        bg: 'bg-gray-700',  // Dark gray/black
        text: 'text-white',
        border: 'border-gray-800',
        label: 'Agent'
      };
    }
    
    return null;
  };
  
  const styles = getBadgeStyles();
  if (!styles) return null;
  
  return React.createElement('span', {
    className: `inline-flex items-center ${styles.bg} ${styles.text} border ${styles.border} rounded-full font-medium ${sizes[size]}`
  }, styles.label);
}

window.RoleBadge = RoleBadge;