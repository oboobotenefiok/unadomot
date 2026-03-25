// pages/profile/components/EditProfileModal.js
function EditProfileModal({
  show,
  onClose,
  onSubmit,
  form,
  onFormChange,
  errors,
  isSubmitting,
  displayNameLastChanged,
  canChangeDisplayName,
  nextChangeDate
}) {
  if (!show) return null;
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const lastChangedFormatted = displayNameLastChanged ? formatDate(displayNameLastChanged) : null;
  const nextChangeFormatted = nextChangeDate ? formatDate(nextChangeDate) : null;
  
  return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
      onClick: handleBackdropClick
    },
    React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden',
        onClick: e => e.stopPropagation()
      },
      
      React.createElement('div', { className: 'flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50' },
        React.createElement('h3', { className: 'font-bold text-lg text-gray-900' }, 'Edit Profile'),
        React.createElement('button', {
            onClick: onClose,
            className: 'text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition'
          },
          React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ),
      
      React.createElement('div', { className: 'p-4 overflow-y-auto max-h-[70vh]' },
        React.createElement('form', { onSubmit: onSubmit, className: 'space-y-4' },
          
          // ===== DISPLAY NAME FIELD (Editable with cooldown) =====
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Display Name'),
            React.createElement('input', {
              type: 'text',
              placeholder: 'Your display name',
              value: form.displayName || '',
              onChange: (e) => onFormChange('displayName', e.target.value),
              className: `w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${
                errors.displayName ? 'border-red-500' : 'border-gray-300'
              }`,
              maxLength: 60,
              disabled: !canChangeDisplayName && lastChangedFormatted !== null
            }),
            errors.displayName &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.displayName),
            
            // Cooldown info
            lastChangedFormatted && React.createElement('div', { className: 'mt-2 text-xs space-y-1' },
              React.createElement('p', { className: 'text-gray-500 flex items-center gap-1' },
                React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
                ),
                `Last changed: ${lastChangedFormatted}`
              ),
              !canChangeDisplayName && nextChangeFormatted &&
              React.createElement('p', { className: 'text-amber-600 flex items-center gap-1' },
                React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
                ),
                `Next change available: ${nextChangeFormatted}`
              )
            ),
            
            // Info for first-time changers
            !lastChangedFormatted &&
            React.createElement('p', { className: 'text-xs text-gray-400 mt-1' },
              'You can change your display name once every 6 months.'
            )
          ),
          
          // ===== USERNAME (Permanent, Read-only) =====
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Username'),
            React.createElement('div', { className: 'flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2' },
              React.createElement('span', { className: 'text-gray-500 text-sm mr-1' }, '@'),
              React.createElement('span', { className: 'text-gray-600 text-sm font-mono' }, form.username || 'username-not-set'),
              React.createElement('span', { className: 'ml-auto text-xs text-gray-400' }, 'permanent')
            ),
            React.createElement('p', { className: 'text-xs text-gray-400 mt-1' },
              'Your username is permanent and cannot be changed. It\'s used for your profile URL.'
            )
          ),
          
          // Phone field
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Phone (optional)'),
            React.createElement('input', {
              type: 'tel',
              placeholder: 'Phone number',
              value: form.phone || '',
              onChange: (e) => onFormChange('phone', e.target.value),
              className: `w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`
            }),
            errors.phone &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.phone)
          ),
          
          // Bio field
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Bio (optional)'),
            React.createElement('textarea', {
              placeholder: 'Tell us about yourself...',
              value: form.bio || '',
              onChange: (e) => onFormChange('bio', e.target.value),
              rows: 3,
              className: `w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 resize-none ${
                errors.bio ? 'border-red-500' : 'border-gray-300'
              }`,
              maxLength: 500
            }),
            errors.bio &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.bio),
            React.createElement('p', { className: 'text-xs text-gray-400 text-right mt-1' },
              `${(form.bio || '').length}/500`
            )
          )
        )
      ),
      
      React.createElement('div', { className: 'flex gap-2 p-4 border-t border-gray-200 bg-gray-50' },
        React.createElement('button', {
          type: 'button',
          onClick: onClose,
          className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-medium'
        }, 'Cancel'),
        
        React.createElement('button', {
          type: 'submit',
          onClick: onSubmit,
          disabled: isSubmitting || (!canChangeDisplayName && form.displayName !== form.originalDisplayName),
          className: 'flex-1 bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50'
        }, isSubmitting ? 'Saving...' : 'Save Changes')
      )
    )
  );
}

window.EditProfileModal = EditProfileModal;