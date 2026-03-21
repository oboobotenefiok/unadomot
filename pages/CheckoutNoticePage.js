// pages/CheckoutNoticePage.js
function CheckoutNoticePage({ user, navigate }) {
  const [form, setForm] = React.useState({
    propertyAddress: '',
    moveOutDate: '',
    reason: ''
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [loadingNotices, setLoadingNotices] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notices, setNotices] = React.useState([]);
  const [usingIndex, setUsingIndex] = React.useState(true);
  const { openModal } = window.useAuthModal();
  
  React.useEffect(function() {
    if (!user) {
      navigate('/');
      openModal('login', '/checkout');
      return;
    }
    
    fetchNotices();
  }, [user, navigate, openModal]);
  
  async function fetchNotices() {
    setLoadingNotices(true);
    
    try {
      const result = await FirestoreQueries.query({
        collection: 'checkoutNotices',
        where: [['tenantId', '==', user.uid]],
        orderBy: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      });
      
      setUsingIndex(result.usingIndex);
      setNotices(result.data);
      
    } catch (err) {
      
      setError('Failed to load your checkout notices');
    } finally {
      setLoadingNotices(false);
    }
  }
  
  const validateForm = () => {
    const newErrors = {};
    const v = ValidationHelpers;
    
    const addressError = v.validateAddress(form.propertyAddress, true);
    if (addressError) newErrors.propertyAddress = addressError;
    
    const dateError = v.validateDate(form.moveOutDate, true, { futureOnly: true });
    if (dateError) newErrors.moveOutDate = dateError;
    
    if (form.reason && form.reason.trim()) {
      const reasonError = v.validateText(form.reason, 'Reason', {
        required: false,
        maxLength: 500,
        allowHtml: false
      });
      if (reasonError) newErrors.reason = reasonError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async function(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sanitizedAddress = ValidationHelpers.sanitizeInput(form.propertyAddress, 'address');
      const sanitizedReason = form.reason ? ValidationHelpers.sanitizeInput(form.reason, 'text') : '';
      
      await db.collection('checkoutNotices').add({
        propertyAddress: sanitizedAddress,
        moveOutDate: new Date(form.moveOutDate),
        reason: sanitizedReason,
        tenantId: user.uid,
        verified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      setForm({
        propertyAddress: '',
        moveOutDate: '',
        reason: ''
      });
      setErrors({});
      
      fetchNotices();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };
  
  if (!user) return null;
  
  return React.createElement('div', { className: 'min-h-screen bg-gray-50 py-12' },
    React.createElement('div', { className: 'max-w-4xl mx-auto px-4' },

      React.createElement('div', { className: 'mb-6 flex justify-between items-center' },
        React.createElement('a', {
          href: '/profile',
          onClick: function(e) {
            e.preventDefault();
            navigate('/profile');
          },
          className: 'text-blue-600 hover:underline cursor-pointer'
        }, '← Back to Profile'),
        
        React.createElement('a', {
          href: '/',
          onClick: function(e) {
            e.preventDefault();
            navigate('/');
          },
          className: 'text-gray-600 hover:underline cursor-pointer'
        }, 'Home')
      ),
      
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8 mb-8' },
        React.createElement('h1', { className: 'text-3xl font-bold mb-8' }, 'Post Checkout Notice'),
        
        error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-4 rounded mb-6' }, error),
        
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-6' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Property Address'),
            React.createElement('input', {
              type: 'text',
              name: 'propertyAddress',
              value: form.propertyAddress,
              onChange: function(e) { handleChange('propertyAddress', e.target.value); },
              className: `w-full p-3 border rounded-lg ${errors.propertyAddress ? 'border-red-500' : ''}`,
              required: true,
              placeholder: "Full address of property you're leaving"
            }),
            errors.propertyAddress &&
            React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.propertyAddress)
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Move-out Date'),
            React.createElement('input', {
              type: 'date',
              name: 'moveOutDate',
              value: form.moveOutDate,
              onChange: function(e) { handleChange('moveOutDate', e.target.value); },
              className: `w-full p-3 border rounded-lg ${errors.moveOutDate ? 'border-red-500' : ''}`,
              required: true,
              min: new Date().toISOString().split('T')[0]
            }),
            errors.moveOutDate &&
            React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.moveOutDate)
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Reason (optional)'),
            React.createElement('textarea', {
              name: 'reason',
              value: form.reason,
              onChange: function(e) { handleChange('reason', e.target.value); },
              rows: '3',
              className: `w-full p-3 border rounded-lg ${errors.reason ? 'border-red-500' : ''}`,
              placeholder: 'e.g., Lease ended, relocation, etc.'
            }),
            errors.reason &&
            React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.reason)
          ),
          
          React.createElement('button', {
            type: 'submit',
            disabled: loading,
            className: 'w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer'
          }, loading ? 'Posting...' : 'Post Checkout Notice')
        )
      ),
      
      notices.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8' },
        React.createElement('h2', { className: 'text-xl font-bold mb-6' }, 'Your Checkout Notices'),
        
        loadingNotices ? 
        React.createElement('div', { className: 'flex justify-center py-8' },
          React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
        ) :
        React.createElement('div', { className: 'space-y-4' },
          notices.map(function(notice) {
            return React.createElement('div', { key: notice.id, className: 'border-b pb-4 last:border-0' },
              React.createElement('p', { className: 'font-medium' }, notice.propertyAddress),
              React.createElement('p', { className: 'text-sm text-gray-600' },
                'Moving out: ' + (notice.moveOutDate?.seconds ?
                  new Date(notice.moveOutDate.seconds * 1000).toLocaleDateString() :
                  new Date(notice.moveOutDate).toLocaleDateString())
              ),
              notice.reason && React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, notice.reason),
              notice.verified && React.createElement('span', {
                className: 'inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded'
              }, '✓ Verified Move-out')
            );
          })
        )
      )
    )
  );
}

window.CheckoutNoticePage = CheckoutNoticePage;