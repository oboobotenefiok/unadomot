// pages/VerificationPage.js
function VerificationPage({ user, navigate }) {
  const [profile, setProfile] = React.useState(null);
  const [form, setForm] = React.useState({
    idType: 'nin',
    idNumber: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { openModal } = window.useAuthModal();
  
  React.useEffect(function() {
    if (!user) {
      navigate('/');
      openModal('login', '/verify');
      return;
    }
    
    const fetchProfile = async function() {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
          setProfile({ id: userDoc.id, ...userDoc.data() });
        } else {
          await db.collection('users').doc(user.uid).set({
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verified: null
          });
          setProfile({
            id: user.uid,
            email: user.email,
            verified: null
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile. Please refresh the page.');
      }
    };
    
    fetchProfile();
  }, [user, navigate, openModal]);
  
  const validateForm = () => {
    const v = ValidationHelpers;
    const newErrors = {};
    
    const idError = v.validateIDNumber(form.idNumber, form.idType, true);
    if (idError) newErrors.idNumber = idError;
    
    const phoneError = v.validatePhone(form.phoneNumber, true);
    if (phoneError) newErrors.phoneNumber = phoneError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async function(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sanitizedIdNumber = ValidationHelpers.sanitizeInput(form.idNumber, 'text');
      const sanitizedPhone = ValidationHelpers.sanitizeInput(form.phoneNumber, 'phone');
      
      await db.collection('users').doc(user.uid).update({
        verified: {
          status: 'pending',
          idType: form.idType,
          idNumber: sanitizedIdNumber,
          phoneNumber: sanitizedPhone,
          submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
      
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        setProfile({ id: userDoc.id, ...userDoc.data() });
      }
      
      setForm({ idType: 'nin', idNumber: '', phoneNumber: '' });
      setErrors({});
      
    } catch (err) {
      console.error('Error submitting verification:', err);
      setError(err.message || 'Failed to submit verification. Please try again.');
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
  
  if (!user) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
        React.createElement('p', { className: 'text-gray-600' }, 'Redirecting to login...')
      )
    );
  }
  
  const verificationStatus = profile?.verified?.status || null;
  const rejectionReason = profile?.verified?.rejectionReason || '';
  
  return React.createElement('div', { className: 'min-h-screen bg-green-50' },
    React.createElement('div', { className: 'max-w-3xl mx-auto px-4 py-12' },
      
      React.createElement('div', { className: 'mb-6' },
        React.createElement('a', {
          href: '/profile',
          onClick: function(e) {
            e.preventDefault();
            navigate('/profile');
          },
          className: 'text-green-950 hover:underline cursor-pointer inline-flex items-center gap-2'
        }, '← Back to Profile')
      ),
      
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8' },
        React.createElement('h1', { className: 'text-3xl font-bold mb-4 text-gray-900' }, 'Landlord Verification'),
        React.createElement('p', { className: 'text-gray-600 mb-8' },
          'Get verified to build trust with potential tenants. Verified landlords receive a badge on their profiles and listings.'
        ),
        
        verificationStatus === 'approved' && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4 mb-8' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('svg', { className: 'w-6 h-6 text-green-600 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', {
                fillRule: 'evenodd',
                d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                clipRule: 'evenodd'
              })
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'font-bold text-green-800' }, '✓ Verified Account'),
              React.createElement('p', { className: 'text-sm text-green-700' }, 'Your identity has been verified. You now have a verification badge on your profile and listings.')
            )
          )
        ),
        
        verificationStatus === 'pending' && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('svg', { className: 'w-6 h-6 text-yellow-600 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', {
                fillRule: 'evenodd',
                d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z',
                clipRule: 'evenodd'
              })
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'font-bold text-yellow-800' }, '⏳ Verification Pending'),
              React.createElement('p', { className: 'text-sm text-yellow-700' }, "We're reviewing your submission. This usually takes 1-2 business days. You'll be notified once verified.")
            )
          )
        ),
        
        verificationStatus === 'rejected' && React.createElement('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-4 mb-8' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('svg', { className: 'w-6 h-6 text-red-600 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', {
                fillRule: 'evenodd',
                d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
                clipRule: 'evenodd'
              })
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'font-bold text-red-800' }, '✕ Verification Rejected'),
              React.createElement('p', { className: 'text-sm text-red-700' },
                rejectionReason || 'We could not verify your identity with the information provided. Please check your details and try again.'
              )
            )
          )
        ),
        
        (!verificationStatus || verificationStatus === 'rejected') && React.createElement(React.Fragment, null,
          error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200' }, error),
          
          React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-6' },
            
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Type'),
              React.createElement('select', {
                  name: 'idType',
                  value: form.idType,
                  onChange: function(e) { handleChange('idType', e.target.value); },
                  className: 'w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent',
                  required: true
                },
                React.createElement('option', { value: 'nin' }, 'National ID (NIN)'),
                React.createElement('option', { value: 'bvn' }, 'Bank Verification Number (BVN)'),
                React.createElement('option', { value: 'drivers_license' }, "Driver's License"),
                React.createElement('option', { value: 'passport' }, 'International Passport')
              )
            ),
            
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Number'),
              React.createElement('input', {
                type: 'text',
                name: 'idNumber',
                value: form.idNumber,
                onChange: function(e) { handleChange('idNumber', e.target.value); },
                className: `w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent ${
                  errors.idNumber ? 'border-red-500' : ''
                }`,
                required: true,
                placeholder: 'Enter your ID number'
              }),
              errors.idNumber && 
                React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.idNumber)
            ),
            
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Phone Number'),
              React.createElement('input', {
                type: 'tel',
                name: 'phoneNumber',
                value: form.phoneNumber,
                onChange: function(e) { handleChange('phoneNumber', e.target.value); },
                className: `w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent ${
                  errors.phoneNumber ? 'border-red-500' : ''
                }`,
                required: true,
                placeholder: 'e.g., 0800 000 0000'
              }),
              errors.phoneNumber && 
                React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.phoneNumber),
              React.createElement('p', { className: 'text-sm text-gray-500 mt-2 flex items-center gap-1' },
                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                ),
                'We\'ll send a verification code to this number'
              )
            ),
            
            React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4' },
              React.createElement('p', { className: 'text-sm text-green-800 flex items-start gap-2' },
                React.createElement('svg', { className: 'w-5 h-5 flex-shrink-0 mt-0.5', fill: 'currentColor', viewBox: '0 0 20 20' },
                  React.createElement('path', {
                    fillRule: 'evenodd',
                    d: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
                    clipRule: 'evenodd'
                  })
                ),
                React.createElement('span', null,
                  React.createElement('strong', null, 'Privacy Notice: '),
                  'Your personal information is encrypted and will only be used for verification purposes. We never share your data with third parties.'
                )
              )
            ),
            
            React.createElement('button', {
              type: 'submit',
              disabled: loading,
              className: 'w-full bg-green-950 text-white py-4 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            }, loading ? 'Submitting...' : 'Submit for Verification')
          )
        ),
        
        verificationStatus === 'approved' && React.createElement('div', { className: 'mt-8 text-center' },
          React.createElement('a', {
            href: '/profile',
            onClick: function(e) {
              e.preventDefault();
              navigate('/profile');
            },
            className: 'text-green-950 hover:underline font-medium'
          }, '← Return to Profile')
        ),
        
        React.createElement('div', { className: 'mt-12 pt-8 border-t border-gray-200' },
          React.createElement('h2', { className: 'text-xl font-bold mb-6 text-gray-900' }, 'Benefits of Verification'),
          React.createElement('div', { className: 'grid md:grid-cols-3 gap-6' },
            
            React.createElement('div', { className: 'text-center' },
              React.createElement('div', { className: 'bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3' },
                React.createElement('svg', { className: 'w-6 h-6 text-green-950', fill: 'currentColor', viewBox: '0 0 20 20' },
                  React.createElement('path', {
                    fillRule: 'evenodd',
                    d: 'M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                    clipRule: 'evenodd'
                  })
                )
              ),
              React.createElement('h3', { className: 'font-bold mb-1' }, 'Build Trust'),
              React.createElement('p', { className: 'text-sm text-gray-600' }, 'Verified badge shows tenants you\'re legitimate')
            ),
            
            React.createElement('div', { className: 'text-center' },
              React.createElement('div', { className: 'bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3' },
                React.createElement('svg', { className: 'w-6 h-6 text-green-950', fill: 'currentColor', viewBox: '0 0 20 20' },
                  React.createElement('path', {
                    fillRule: 'evenodd',
                    d: 'M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z',
                    clipRule: 'evenodd'
                  })
                )
              ),
              React.createElement('h3', { className: 'font-bold mb-1' }, 'Higher Visibility'),
              React.createElement('p', { className: 'text-sm text-gray-600' }, 'Verified listings rank higher in search')
            ),
            
            React.createElement('div', { className: 'text-center' },
              React.createElement('div', { className: 'bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3' },
                React.createElement('svg', { className: 'w-6 h-6 text-green-950', fill: 'currentColor', viewBox: '0 0 20 20' },
                  React.createElement('path', {
                    fillRule: 'evenodd',
                    d: 'M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z',
                    clipRule: 'evenodd'
                  })
                )
              ),
              React.createElement('h3', { className: 'font-bold mb-1' }, 'More Inquiries'),
              React.createElement('p', { className: 'text-sm text-gray-600' }, 'Tenants prefer verified landlords')
            )
          )
        )
      )
    )
  );
}

window.VerificationPage = VerificationPage;