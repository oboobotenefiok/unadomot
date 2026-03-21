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
  
  // Helper to get status badge
  const getStatusBadge = (status, type) => {
    if (status === 'approved') {
      return React.createElement('span', {
          className: 'inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full'
        },
        React.createElement('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
          React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', clipRule: 'evenodd' })
        ),
        'Verified'
      );
    }
    if (status === 'pending') {
      return React.createElement('span', {
          className: 'inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full',
          title: 'Waiting for admin review'
        },
        React.createElement('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
          React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z', clipRule: 'evenodd' })
        ),
        'Pending'
      );
    }
    if (status === 'rejected') {
      return React.createElement('span', {
          className: 'inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full',
          title: type === 'landlord' ? landlordRejectionReason : agentRejectionReason
        },
        React.createElement('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
          React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z', clipRule: 'evenodd' })
        ),
        'Rejected'
      );
    }
    return null;
  };
  
  // Check if verification can be applied for
  const canApplyLandlord = landlordStatus !== 'approved' && landlordStatus !== 'pending';
  const canApplyAgent = agentStatus !== 'approved' && agentStatus !== 'pending';
  
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
        ),
        
        // ===== VERIFICATION STATUS SECTION =====
        React.createElement('div', { className: 'mt-4 pt-3 border-t border-gray-100' },
          React.createElement('p', { className: 'text-xs font-medium text-gray-500 mb-2' }, 'Verification Status'),
          
          // Landlord verification row
          React.createElement('div', { className: 'flex items-center justify-between py-2' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('span', { className: 'text-base' }, '🏠'),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'Landlord'),
              getStatusBadge(landlordStatus, 'landlord')
            ),
            React.createElement('button', {
                onClick: onVerifyLandlord,
                disabled: !canApplyLandlord,
                className: `text-xs px-3 py-1 rounded-lg transition ${
                canApplyLandlord
                  ? 'bg-green-950 text-white hover:bg-green-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`
              },
              landlordStatus === 'rejected' ? 'Reapply' :
              landlordStatus === 'pending' ? 'Pending Review' :
              landlordStatus === 'approved' ? 'Verified' :
              'Apply'
            )
          ),
          
          // Agent verification row
          React.createElement('div', { className: 'flex items-center justify-between py-2 border-t border-gray-50' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('span', { className: 'text-base' }, '🤝'),
              React.createElement('span', { className: 'text-sm text-gray-700' }, 'Agent'),
              getStatusBadge(agentStatus, 'agent')
            ),
            React.createElement('button', {
                onClick: onVerifyAgent,
                disabled: !canApplyAgent,
                className: `text-xs px-3 py-1 rounded-lg transition ${
                canApplyAgent
                  ? 'bg-green-950 text-white hover:bg-green-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`
              },
              agentStatus === 'rejected' ? 'Reapply' :
              agentStatus === 'pending' ? 'Pending Review' :
              agentStatus === 'approved' ? 'Verified' :
              'Apply'
            )
          ),
          
          // Info note
          (landlordStatus === 'rejected' || agentStatus === 'rejected') &&
          React.createElement('p', { className: 'text-xs text-red-500 mt-2 flex items-center gap-1' },
            React.createElement('span', null, '⚠️'),
            'Rejected applications can be resubmitted with correct documents.'
          ),
          
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