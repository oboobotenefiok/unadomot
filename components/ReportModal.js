// components/ReportModal.js - 2-COLUMN LAYOUT, SUPER COMPACT
function ReportModal({ targetId, targetType, reportedBy, onClose }) {
  const [reason, setReason] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');

  
  const LISTING_REASONS = [
    { value: 'scam',         label: 'Scam or Fraud' },
    { value: 'misleading',   label: 'Misleading Info' },
    { value: 'wrong_price',  label: 'Wrong Price' },
    { value: 'inappropriate',label: 'Inappropriate' },
    { value: 'spam',         label: 'Spam' },
    { value: 'other',        label: 'Other' }
  ];

  
  const USER_REASONS = [
    { value: 'scam',         label: 'Scam' },
    { value: 'harassment',   label: 'Harassment' },
    { value: 'inappropriate',label: 'Inappropriate' },
    { value: 'spam',         label: 'Spam' },
    { value: 'other',        label: 'Other' }
  ];

  const reasons = targetType === 'user' ? USER_REASONS : LISTING_REASONS;

  const handleBackdropClick = function(e) {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async function() {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await db.collection('reports').add({
        targetId:   targetId,
        targetType: targetType,    
        reportedBy: reportedBy,
        reason:     reason,
        description: description.trim().slice(0, 500),
        status:     'pending',
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      });

      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  
  if (submitted) {
    return React.createElement('div', {
        className: 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4',
        onClick: handleBackdropClick
      },
      React.createElement('div', {
          className: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center',
          onClick: function(e) { e.stopPropagation(); }
        },
        React.createElement('div', {
            className: 'w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3'
          },
          React.createElement('svg', { className: 'w-7 h-7 text-green-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
          )
        ),
        React.createElement('h3', { className: 'text-lg font-bold text-gray-900 mb-1' }, 'Report Submitted'),
        React.createElement('p', { className: 'text-xs text-gray-600 mb-4' },
          'Thank you. Our team will review within 24h.'
        ),
        React.createElement('button', {
          onClick: onClose,
          className: 'bg-green-950 text-white px-6 py-2 rounded-lg hover:bg-green-800 transition text-sm'
        }, 'Done')
      )
    );
  }

  
  return React.createElement('div', {
      className: 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4',
      onClick: handleBackdropClick
    },
    React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden',
        onClick: function(e) { e.stopPropagation(); }
      },

      
      React.createElement('div', { className: 'flex items-center justify-between p-3 border-b border-gray-200' },
        React.createElement('h2', { className: 'font-bold text-gray-900' },
          'Report ' + (targetType === 'user' ? 'User' : 'Listing')
        ),
        React.createElement('button', {
          onClick: onClose,
          className: 'text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100'
        },
          React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ),

      
      React.createElement('div', { className: 'p-3' },

        
        React.createElement('p', { className: 'text-xs font-medium text-gray-700 mb-2' }, 'Reason:'),
        
        // ===== 2-COLUMN GRID FOR REASONS =====
        React.createElement('div', { className: 'grid grid-cols-2 gap-1 mb-3' },
          reasons.map(function(r) {
            const isSelected = reason === r.value;
            return React.createElement('label', {
                key: r.value,
                className: `flex items-center gap-1 p-1.5 border rounded cursor-pointer transition text-xs ${
                  isSelected ? 'border-green-950 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`
              },
              React.createElement('input', {
                type: 'radio',
                name: 'report_reason',
                value: r.value,
                checked: isSelected,
                onChange: function() { setReason(r.value); setError(''); },
                className: 'accent-green-900 w-3 h-3'
              }),
              React.createElement('span', { className: 'text-gray-900' }, r.label)
            );
          })
        ),

        
        React.createElement('div', { className: 'mb-2' },
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' },
            'Details', ' ', React.createElement('span', { className: 'text-gray-400' }, '(optional)')
          ),
          React.createElement('textarea', {
            value: description,
            onChange: function(e) { setDescription(e.target.value); },
            placeholder: 'Brief description...',
            maxLength: 500,
            rows: 1,
            className: 'w-full p-1.5 border border-gray-300 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-green-950'
          }),
          React.createElement('p', { className: 'text-[10px] text-gray-400 text-right mt-0.5' },
            description.length + '/500'
          )
        ),

        
        error && React.createElement('div', {
            className: 'bg-red-50 text-red-600 text-xs p-1.5 rounded mb-2'
          }, error),

        
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', {
            onClick: onClose,
            className: 'flex-1 border border-gray-300 text-gray-700 py-1.5 rounded text-xs hover:bg-gray-50 transition'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handleSubmit,
            disabled: loading || !reason,
            className: 'flex-1 bg-red-500 text-white py-1.5 rounded text-xs hover:bg-red-600 transition disabled:opacity-50'
          }, loading ? '...' : 'Report')
        )
      )
    )
  );
}

window.ReportModal = ReportModal;