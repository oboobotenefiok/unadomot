// pages/VerificationPage.js - Two-Way Verification (Landlord & Agent)

function VerificationPage({ user, navigate }) {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [uploadingDocs, setUploadingDocs] = React.useState(false);
  
  // ===== ROLE SELECTION =====
  const [selectedRole, setSelectedRole] = React.useState('landlord'); // 'landlord' or 'agent'
  
  // ===== LANDLORD FORM STATE =====
  const [landlordForm, setLandlordForm] = React.useState({
    idType: 'nin',
    idNumber: '',
    phoneNumber: '',
    propertyProofUrl: null
  });
  
  // ===== AGENT FORM STATE =====
  const [agentForm, setAgentForm] = React.useState({
    idType: 'nin',
    idNumber: '',
    phoneNumber: '',
    businessRegUrl: null,
    agencyLicenseUrl: null  // optional
  });
  
  const [errors, setErrors] = React.useState({});
  
  const { openModal } = window.useAuthModal();
  const CLOUD_NAME = window.__ENV.CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = window.__ENV.CLOUDINARY_UPLOAD_PRESET;
  
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
          
          // Pre-fill forms if previously submitted
          const verified = userDoc.data().verified || {};
          
          if (verified.landlord) {
            setLandlordForm({
              idType: verified.landlord.idType || 'nin',
              idNumber: verified.landlord.idNumber || '',
              phoneNumber: verified.landlord.phoneNumber || '',
              propertyProofUrl: verified.landlord.propertyProofUrl || null
            });
          }
          
          if (verified.agent) {
            setAgentForm({
              idType: verified.agent.idType || 'nin',
              idNumber: verified.agent.idNumber || '',
              phoneNumber: verified.agent.phoneNumber || '',
              businessRegUrl: verified.agent.businessRegUrl || null,
              agencyLicenseUrl: verified.agent.agencyLicenseUrl || null
            });
          }
        } else {
          await db.collection('users').doc(user.uid).set({
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verified: { landlord: null, agent: null }
          });
          setProfile({
            id: user.uid,
            email: user.email,
            verified: { landlord: null, agent: null }
          });
        }
      } catch (err) {
        setError('Failed to load profile. Please refresh the page.');
      }
    };
    
    fetchProfile();
  }, [user, navigate, openModal]);
  
  // Upload document to Cloudinary
  const uploadDocument = async (file, onSuccess) => {
    if (!file) return;
    
    setUploadingDocs(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      onSuccess(data.public_id);
    } catch (err) {
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploadingDocs(false);
    }
  };
  
  const handleLandlordChange = (field, value) => {
    setLandlordForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  const handleAgentChange = (field, value) => {
    setAgentForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  const validateLandlordForm = () => {
    const newErrors = {};
    const v = ValidationHelpers;
    
    if (!landlordForm.idNumber.trim()) newErrors.idNumber = 'ID Number is required';
    if (!landlordForm.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!landlordForm.propertyProofUrl) newErrors.propertyProofUrl = 'Property ownership proof is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateAgentForm = () => {
    const newErrors = {};
    const v = ValidationHelpers;
    
    if (!agentForm.idNumber.trim()) newErrors.idNumber = 'ID Number is required';
    if (!agentForm.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!agentForm.businessRegUrl) newErrors.businessRegUrl = 'Business registration is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmitLandlord = async (e) => {
    e.preventDefault();
    
    if (!validateLandlordForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sanitizedIdNumber = ValidationHelpers.sanitizeInput(landlordForm.idNumber, 'text');
      const sanitizedPhone = ValidationHelpers.sanitizeInput(landlordForm.phoneNumber, 'phone');
      
      const currentVerified = profile?.verified || {};
      
      await db.collection('users').doc(user.uid).update({
        'verified.landlord': {
          status: 'pending',
          idType: landlordForm.idType,
          idNumber: sanitizedIdNumber,
          phoneNumber: sanitizedPhone,
          propertyProofUrl: landlordForm.propertyProofUrl,
          submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
      
      // Refresh profile
      const userDoc = await db.collection('users').doc(user.uid).get();
      setProfile({ id: userDoc.id, ...userDoc.data() });
      
      ToastHelpers?.success('Landlord verification submitted! Pending review.');
      
    } catch (err) {
      setError('Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitAgent = async (e) => {
    e.preventDefault();
    
    if (!validateAgentForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const sanitizedIdNumber = ValidationHelpers.sanitizeInput(agentForm.idNumber, 'text');
      const sanitizedPhone = ValidationHelpers.sanitizeInput(agentForm.phoneNumber, 'phone');
      
      const currentVerified = profile?.verified || {};
      
      await db.collection('users').doc(user.uid).update({
        'verified.agent': {
          status: 'pending',
          idType: agentForm.idType,
          idNumber: sanitizedIdNumber,
          phoneNumber: sanitizedPhone,
          businessRegUrl: agentForm.businessRegUrl,
          agencyLicenseUrl: agentForm.agencyLicenseUrl || null,
          submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
      
      // Refresh profile
      const userDoc = await db.collection('users').doc(user.uid).get();
      setProfile({ id: userDoc.id, ...userDoc.data() });
      
      ToastHelpers?.success('Agent verification submitted! Pending review.');
      
    } catch (err) {
      setError('Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
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
  
  const landlordVerified = profile?.verified?.landlord;
  const agentVerified = profile?.verified?.agent;
  
  const landlordStatus = landlordVerified?.status || null;
  const agentStatus = agentVerified?.status || null;
  
  const landlordRejectionReason = landlordVerified?.rejectionReason || '';
  const agentRejectionReason = agentVerified?.rejectionReason || '';
  
  return React.createElement('div', { className: 'min-h-screen bg-green-50' },
    React.createElement('div', { className: 'max-w-3xl mx-auto px-4 py-12' },
      
     
      
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8' },
        React.createElement('h1', { className: 'text-3xl font-bold mb-4 text-gray-900' }, 'Verification'),
        React.createElement('p', { className: 'text-gray-600 mb-6' },
          'Get verified to build trust. Verified users receive badges on their profiles and listings.'
        ),
        
        // ===== ROLE SELECTION RADIO BUTTONS =====
        React.createElement('div', { className: 'mb-8 pb-6 border-b border-gray-200' },
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-3' }, 'Choose what to verify as:'),
          React.createElement('div', { className: 'flex gap-6' },
            React.createElement('label', { className: 'flex items-center gap-2 cursor-pointer' },
              React.createElement('input', {
                type: 'radio',
                name: 'role',
                value: 'landlord',
                checked: selectedRole === 'landlord',
                onChange: () => setSelectedRole('landlord'),
                className: 'w-4 h-4 accent-green-950'
              }),
              React.createElement('span', { className: 'text-gray-700' }, '🏠 Landlord')
            ),
            React.createElement('label', { className: 'flex items-center gap-2 cursor-pointer' },
              React.createElement('input', {
                type: 'radio',
                name: 'role',
                value: 'agent',
                checked: selectedRole === 'agent',
                onChange: () => setSelectedRole('agent'),
                className: 'w-4 h-4 accent-green-950'
              }),
              React.createElement('span', { className: 'text-gray-700' }, '🤝 Agent')
            )
          )
        ),
        
        // ===== LANDLORD FORM =====
        selectedRole === 'landlord' && React.createElement('div', null,
          // Status display
          landlordStatus === 'approved' && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-green-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-green-800' }, '✓ Landlord Verified'),
                React.createElement('p', { className: 'text-sm text-green-700' }, 'Your landlord status has been verified.')
              )
            )
          ),
          
          landlordStatus === 'pending' && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-yellow-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-yellow-800' }, '⏳ Landlord Verification Pending'),
                React.createElement('p', { className: 'text-sm text-yellow-700' }, 'We\'re reviewing your submission.')
              )
            )
          ),
          
          landlordStatus === 'rejected' && React.createElement('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-red-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-red-800' }, '✕ Landlord Verification Rejected'),
                React.createElement('p', { className: 'text-sm text-red-700' }, landlordRejectionReason || 'Please update your information and resubmit.')
              )
            )
          ),
          
          (landlordStatus !== 'approved' && landlordStatus !== 'pending') && React.createElement(React.Fragment, null,
            error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200' }, error),
            
            React.createElement('form', { onSubmit: handleSubmitLandlord, className: 'space-y-5' },
              React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 'Landlord Verification'),
              
              // ID Type
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Type *'),
                React.createElement('select', {
                  value: landlordForm.idType,
                  onChange: (e) => handleLandlordChange('idType', e.target.value),
                  className: 'w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950'
                },
                  React.createElement('option', { value: 'nin' }, 'National ID (NIN)'),
                  React.createElement('option', { value: 'bvn' }, 'Bank Verification Number (BVN)'),
                  React.createElement('option', { value: 'drivers_license' }, "Driver's License"),
                  React.createElement('option', { value: 'passport' }, 'International Passport')
                )
              ),
              
              // ID Number
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Number *'),
                React.createElement('input', {
                  type: 'text',
                  value: landlordForm.idNumber,
                  onChange: (e) => handleLandlordChange('idNumber', e.target.value),
                  className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${errors.idNumber ? 'border-red-500' : 'border-gray-300'}`,
                  placeholder: 'Enter your ID number'
                }),
                errors.idNumber && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.idNumber)
              ),
              
              // Phone Number
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Phone Number *'),
                React.createElement('input', {
                  type: 'tel',
                  value: landlordForm.phoneNumber,
                  onChange: (e) => handleLandlordChange('phoneNumber', e.target.value),
                  className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`,
                  placeholder: 'e.g., 08012345678'
                }),
                errors.phoneNumber && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.phoneNumber)
              ),
              
              // Property Proof Upload
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Property Ownership Proof *'),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-2' }, 'Upload deed of assignment, title document, or any proof of property ownership'),
                
                landlordForm.propertyProofUrl ?
                  React.createElement('div', { className: 'flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200' },
                    React.createElement('svg', { className: 'w-5 h-5 text-green-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
                    ),
                    React.createElement('span', { className: 'text-sm text-green-700' }, 'Document uploaded'),
                    React.createElement('button', {
                      type: 'button',
                      onClick: () => handleLandlordChange('propertyProofUrl', null),
                      className: 'ml-auto text-red-500 text-xs hover:text-red-700'
                    }, 'Remove')
                  ) :
                  React.createElement('div', null,
                    React.createElement('input', {
                      type: 'file',
                      accept: 'image/*,.pdf',
                      onChange: (e) => {
                        const file = e.target.files[0];
                        if (file) uploadDocument(file, (url) => handleLandlordChange('propertyProofUrl', url));
                      },
                      className: 'w-full p-2 border border-gray-300 rounded-lg text-sm'
                    }),
                    uploadingDocs && React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Uploading...')
                  ),
                errors.propertyProofUrl && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.propertyProofUrl)
              ),
              
              React.createElement('button', {
                type: 'submit',
                disabled: loading || uploadingDocs,
                className: 'w-full bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
              }, loading ? 'Submitting...' : 'Submit Landlord Verification')
            )
          )
        ),
        
        // ===== AGENT FORM =====
        selectedRole === 'agent' && React.createElement('div', null,
          // Status display
          agentStatus === 'approved' && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-green-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-green-800' }, '✓ Agent Verified'),
                React.createElement('p', { className: 'text-sm text-green-700' }, 'Your agent status has been verified.')
              )
            )
          ),
          
          agentStatus === 'pending' && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-yellow-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-yellow-800' }, '⏳ Agent Verification Pending'),
                React.createElement('p', { className: 'text-sm text-yellow-700' }, 'We\'re reviewing your submission.')
              )
            )
          ),
          
          agentStatus === 'rejected' && React.createElement('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-4 mb-6' },
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('svg', { className: 'w-6 h-6 text-red-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z', clipRule: 'evenodd' })
              ),
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold text-red-800' }, '✕ Agent Verification Rejected'),
                React.createElement('p', { className: 'text-sm text-red-700' }, agentRejectionReason || 'Please update your information and resubmit.')
              )
            )
          ),
          
          (agentStatus !== 'approved' && agentStatus !== 'pending') && React.createElement(React.Fragment, null,
            error && React.createElement('div', { className: 'bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200' }, error),
            
            React.createElement('form', { onSubmit: handleSubmitAgent, className: 'space-y-5' },
              React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 'Agent Verification'),
              
              // ID Type
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Type *'),
                React.createElement('select', {
                  value: agentForm.idType,
                  onChange: (e) => handleAgentChange('idType', e.target.value),
                  className: 'w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950'
                },
                  React.createElement('option', { value: 'nin' }, 'National ID (NIN)'),
                  React.createElement('option', { value: 'bvn' }, 'Bank Verification Number (BVN)'),
                  React.createElement('option', { value: 'drivers_license' }, "Driver's License"),
                  React.createElement('option', { value: 'passport' }, 'International Passport')
                )
              ),
              
              // ID Number
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'ID Number *'),
                React.createElement('input', {
                  type: 'text',
                  value: agentForm.idNumber,
                  onChange: (e) => handleAgentChange('idNumber', e.target.value),
                  className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${errors.idNumber ? 'border-red-500' : 'border-gray-300'}`,
                  placeholder: 'Enter your ID number'
                }),
                errors.idNumber && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.idNumber)
              ),
              
              // Phone Number
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Phone Number *'),
                React.createElement('input', {
                  type: 'tel',
                  value: agentForm.phoneNumber,
                  onChange: (e) => handleAgentChange('phoneNumber', e.target.value),
                  className: `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`,
                  placeholder: 'e.g., 08012345678'
                }),
                errors.phoneNumber && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.phoneNumber)
              ),
              
              // Business Registration (MANDATORY)
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Business Registration (CAC) *'),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-2' }, 'Upload your business registration certificate (CAC)'),
                
                agentForm.businessRegUrl ?
                  React.createElement('div', { className: 'flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200' },
                    React.createElement('svg', { className: 'w-5 h-5 text-green-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
                    ),
                    React.createElement('span', { className: 'text-sm text-green-700' }, 'Business registration uploaded'),
                    React.createElement('button', {
                      type: 'button',
                      onClick: () => handleAgentChange('businessRegUrl', null),
                      className: 'ml-auto text-red-500 text-xs hover:text-red-700'
                    }, 'Remove')
                  ) :
                  React.createElement('div', null,
                    React.createElement('input', {
                      type: 'file',
                      accept: 'image/*,.pdf',
                      onChange: (e) => {
                        const file = e.target.files[0];
                        if (file) uploadDocument(file, (url) => handleAgentChange('businessRegUrl', url));
                      },
                      className: 'w-full p-2 border border-gray-300 rounded-lg text-sm'
                    }),
                    uploadingDocs && React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Uploading...')
                  ),
                errors.businessRegUrl && React.createElement('p', { className: 'text-red-500 text-sm mt-1' }, errors.businessRegUrl)
              ),
              
              // Agency License (OPTIONAL)
              React.createElement('div', null,
                React.createElement('label', { className: 'block text-gray-700 font-bold mb-2' }, 'Agency License (Optional)'),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-2' }, 'Upload your agency license if available'),
                
                agentForm.agencyLicenseUrl ?
                  React.createElement('div', { className: 'flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200' },
                    React.createElement('svg', { className: 'w-5 h-5 text-green-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
                    ),
                    React.createElement('span', { className: 'text-sm text-green-700' }, 'License uploaded'),
                    React.createElement('button', {
                      type: 'button',
                      onClick: () => handleAgentChange('agencyLicenseUrl', null),
                      className: 'ml-auto text-red-500 text-xs hover:text-red-700'
                    }, 'Remove')
                  ) :
                  React.createElement('input', {
                    type: 'file',
                    accept: 'image/*,.pdf',
                    onChange: (e) => {
                      const file = e.target.files[0];
                      if (file) uploadDocument(file, (url) => handleAgentChange('agencyLicenseUrl', url));
                    },
                    className: 'w-full p-2 border border-gray-300 rounded-lg text-sm'
                  })
              ),
              
              React.createElement('button', {
                type: 'submit',
                disabled: loading || uploadingDocs,
                className: 'w-full bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
              }, loading ? 'Submitting...' : 'Submit Agent Verification')
            )
          )
        )
      )
    )
  );
}

window.VerificationPage = VerificationPage;