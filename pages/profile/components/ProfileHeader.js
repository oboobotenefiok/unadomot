// pages/profile/components/ProfileHeader.js
function ProfileHeader({ profile, user, onEditClick, onAdminClick }) {
  if (!profile) return null;

  // Check if current user is the super admin (your email)
  const isSuperAdmin = user?.email === 'oboobotenefiok@gmail.com';

  return React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6 mb-8' },
    React.createElement('div', { className: 'flex justify-between items-start' },
      
      // Left side - User info
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-2xl font-bold' },
          profile.name || 'User'
        ),
        
        React.createElement('div', { className: 'flex items-center gap-2 mt-1' },
          React.createElement('p', { className: 'text-sm text-gray-500' },
            '@' + (profile.username || 'username-not-set')
          ),
          
          // Role badge - shows for agents and landlords only
          React.createElement(RoleBadge, { user: profile, size: 'md' }),
          
          profile.usernameEdited && React.createElement('span', {
            className: 'text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'
          }, 'locked')
        )
      ),
      
      // Right side - Action buttons
      React.createElement('div', { className: 'flex gap-2' },
        // Admin button (only visible to your email)
        isSuperAdmin && React.createElement('button', {
          onClick: onAdminClick,
          className: 'flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium shadow-md',
          title: 'Admin Dashboard'
        },
          React.createElement('svg', { 
            className: 'w-4 h-4', 
            fill: 'none', 
            stroke: 'currentColor', 
            viewBox: '0 0 24 24' 
          },
            React.createElement('path', { 
              strokeLinecap: 'round', 
              strokeLinejoin: 'round', 
              strokeWidth: '2', 
              d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' 
            })
          ),
          ''
        ),
        
        // Edit profile button (always visible to owner)
        React.createElement('button', {
          onClick: onEditClick,
          className: 'flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium border border-green-200'
        },
          React.createElement('svg', { 
            className: 'w-4 h-4', 
            fill: 'none', 
            stroke: 'currentColor', 
            viewBox: '0 0 24 24' 
          },
            React.createElement('path', { 
              strokeLinecap: 'round', 
              strokeLinejoin: 'round', 
              strokeWidth: '2', 
              d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' 
            })
          ),
          'Edit'
        )
      )
    ),

    React.createElement('div', { className: 'mt-4 space-y-2 text-gray-700' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-lg' }, '✉️'),
        React.createElement('span', null, user?.email)
      ),
      profile.phone && React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-lg' }, '📞'),
        React.createElement('span', null, profile.phone)
      )
    )
  );
}

window.ProfileHeader = ProfileHeader;