// pages/profile/components/ProfileHeader.js
function ProfileHeader({ profile, user, onEditClick, onAdminClick, onVerifyLandlord, onVerifyAgent }) {
  if (!profile) return null;
  
  // Check if current user is the super admin (your email)
  const isSuperAdmin = user?.email === 'oboobotenefiok@gmail.com';
  
  // Get verification data from profile
  const verified = profile.verified || {};
  const landlordVerified = verified.landlord;
  const agentVerified = verified.agent;
  
  const landlordStatus = landlordVerified?.status || null;
  const agentStatus = agentVerified?.status || null;
  
  const landlordRejectionReason = landlordVerified?.rejectionReason || '';
  const agentRejectionReason = agentVerified?.rejectionReason || '';
  
  // Helper to get button text and style based on status
  const getButtonConfig = (status, type) => {
    if (status === 'approved') {
      return {
        text: '✓ Verified',
        className: 'bg-green-100 text-green-700 border border-green-200 cursor-default hover:bg-green-100',
        disabled: true
      };
    }
    if (status === 'pending') {
      return {
        text: '⏳ Pending',
        className: 'bg-yellow-100 text-yellow-700 border border-yellow-200 cursor-default hover:bg-yellow-100',
        disabled: true
      };
    }
    if (status === 'rejected') {
      return {
        text: '⚠️ Reapply',
        className: 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 cursor-pointer',
        disabled: false
      };
    }
    return {
      text: 'Apply',
      className: 'bg-green-950 text-white hover:bg-green-800 cursor-pointer',
      disabled: false
    };
  };
  
  const landlordConfig = getButtonConfig(landlordStatus, 'landlord');
  const agentConfig = getButtonConfig(agentStatus, 'agent');
  
  // Tooltip for rejected status
  const getRejectionTooltip = (status, reason) => {
    if (status === 'rejected' && reason) {
      return { title: `Rejected: ${reason}` };
    }
    return {};
  };
  
  return React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6 mb-8' },
    React.createElement('div', { className: 'flex justify-between items-start' },
      
      // Left side - User info (NO ROLE BADGE HERE)
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-2xl font-bold' },
          profile.name || 'User'
        ),
        
        React.createElement('div', { className: 'flex items-center gap-2 mt-1' },
          React.createElement('p', { className: 'text-sm text-gray-500' },
            '@' + (profile.username || 'username-not-set')
          ),
          profile.usernameEdited && React.createElement('span', {
            className: 'text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'
          }, 'locked')
        ),
        
        // ===== VERIFICATION STATUS SECTION (Unified) =====
        React.createElement('div', { className: 'mt-4 pt-3 border-t border-gray-100' },
          React.createElement('p', { className: 'text-xs font-medium text-gray-500 mb-2' }, 'Verification Status'),
          
          // Landlord verification row
          React.createElement('div', { className: 'flex items-center justify-between py-2' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('span', { className: 'text-base' }, ''),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'Landlord')
            ),
            React.createElement('button', {
              onClick: landlordStatus !== 'approved' && landlordStatus !== 'pending' ? onVerifyLandlord : undefined,
              disabled: landlordConfig.disabled,
              title: landlordStatus === 'rejected' ? `Rejected: ${landlordRejectionReason}` : '',
              className: `text-xs px-3 py-1 rounded-lg transition ${landlordConfig.className} ${landlordConfig.disabled ? 'cursor-default' : ''}`
            }, landlordConfig.text)
          ),
          
          // Agent verification row
          React.createElement('div', { className: 'flex items-center justify-between py-2 border-t border-gray-50' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('span', { className: 'text-base' }, ''),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'Agent')
            ),
            React.createElement('button', {
              onClick: agentStatus !== 'approved' && agentStatus !== 'pending' ? onVerifyAgent : undefined,
              disabled: agentConfig.disabled,
              title: agentStatus === 'rejected' ? `Rejected: ${agentRejectionReason}` : '',
              className: `text-xs px-3 py-1 rounded-lg transition ${agentConfig.className} ${agentConfig.disabled ? 'cursor-default' : ''}`
            }, agentConfig.text)
          ),
          
          // Info note for rejected applications
          (landlordStatus === 'rejected' || agentStatus === 'rejected') &&
          React.createElement('p', { className: 'text-xs text-red-500 mt-2 flex items-center gap-1' },
            React.createElement('span', null, '⚠️'),
            'Rejected applications can be resubmitted with correct documents.'
          ),
          
          // Info note for unverified users
          (landlordStatus === null && agentStatus === null) &&
          React.createElement('p', { className: 'text-xs text-gray-400 mt-2' },
            'Get verified to receive badges on your profile and listings.'
          )
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