// pages/profile/components/EditProfileModal.js
function EditProfileModal({ 
  show, 
  onClose, 
  onSubmit, 
  form, 
  onFormChange,
  errors,
  usernameState,
  isSubmitting,
  isUsernameEdited,
  onContactAdmin
}) {
  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

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
        React.createElement('form', { onSubmit: onSubmit, className: 'space-y-3' },
          
          React.createElement('div', null,
            React.createElement('input', {
              type: 'text',
              placeholder: 'Name *',
              value: form.name,
              onChange: (e) => onFormChange('name', e.target.value),
              className: `w-full p-2 border rounded ${errors.name ? 'border-red-500' : ''}`
            }),
            errors.name &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.name)
          ),
          
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center' },
              React.createElement('span', { className: 'text-gray-500 mr-1 text-sm font-mono' }, '@'),
              React.createElement('input', {
                type: 'text',
                placeholder: 'username',
                value: form.username,
                onChange: (e) => onFormChange('username', e.target.value),
                className: `w-full p-2 border rounded ${errors.username ? 'border-red-500' : ''} ${
                  isUsernameEdited ? 'bg-gray-100 cursor-not-allowed' : ''
                }`,
                readOnly: isUsernameEdited,
                disabled: isUsernameEdited
              })
            ),
            
            isUsernameEdited ? (
              React.createElement('div', { className: 'mt-1' },
                React.createElement('p', { className: 'text-yellow-600 text-xs flex items-center gap-1' },
                  React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' })
                  ),
                  'Username is locked. ',
                  React.createElement('button', {
                    type: 'button',
                    onClick: onContactAdmin,
                    className: 'text-green-600 hover:underline'
                  }, 'Contact admin to change')
                )
              )
            ) : (
              React.createElement(React.Fragment, null,
                usernameState.checking &&
                React.createElement('p', { className: 'text-yellow-600 text-xs mt-1' }, '⏳ Checking availability...'),
                
                !usernameState.checking && usernameState.available === true &&
                React.createElement('p', { className: 'text-green-600 text-xs mt-1' }, '✓ Username available'),
                
                !usernameState.checking && usernameState.available === false &&
                React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, '✗ Username already taken'),
                
                usernameState.error &&
                React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, usernameState.error),
                
                !form.username && !usernameState.error &&
                React.createElement('p', { className: 'text-gray-400 text-xs mt-1' },
                  'Choose a unique username (you can only do this once)'
                )
              )
            )
          ),
          
          React.createElement('div', null,
            React.createElement('input', {
              type: 'tel',
              placeholder: 'Phone (optional)',
              value: form.phone,
              onChange: (e) => onFormChange('phone', e.target.value),
              className: `w-full p-2 border rounded ${errors.phone ? 'border-red-500' : ''}`
            }),
            errors.phone &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.phone)
          ),
          
          React.createElement('div', null,
            React.createElement('textarea', {
              placeholder: 'Bio (optional)',
              value: form.bio,
              onChange: (e) => onFormChange('bio', e.target.value),
              rows: 2,
              className: `w-full p-2 border rounded ${errors.bio ? 'border-red-500' : ''}`
            }),
            errors.bio &&
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.bio)
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
          disabled: isSubmitting || usernameState.checking || usernameState.available === false,
          className: 'flex-1 bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50'
        }, isSubmitting ? 'Saving...' : 'Save Changes')
      )
    )
  );
}

window.EditProfileModal = EditProfileModal;