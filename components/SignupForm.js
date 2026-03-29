/* 2-step Signup Form - With pre-signup toast */
/* Fixed: Shows toast before signup to warn about email verification */

function SignupForm({ onSuccess, setIsLoading, initialEmail = '' }) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 2;
  
  const [form, setForm] = React.useState({
    email: initialEmail || '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [emailExists, setEmailExists] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  
  // Use the toast hook
  const { showToast } = window.useToast?.() || { showToast: (msg) => alert(msg) };

  // ===== VALIDATION FUNCTIONS =====
  const validateEmail = (value) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  };

  const validateName = (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (value.length > 60) return 'Name is too long';
    if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name can only contain letters, spaces, hyphens and apostrophes';
    return null;
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    if (value.length > 128) return 'Password is too long';
    return null;
  };

  const validateConfirmPassword = (value) => {
    if (!value) return 'Please confirm your password';
    if (value !== form.password) return 'Passwords do not match';
    return null;
  };

  // ===== STEP VALIDATION =====
  const validateStep = (step) => {
    const stepErrors = {};
    
    if (step === 1) {
      const nameError = validateName(form.name);
      if (nameError) stepErrors.name = nameError;
      
      const emailError = validateEmail(form.email);
      if (emailError) stepErrors.email = emailError;
    } else if (step === 2) {
      const passwordError = validatePassword(form.password);
      if (passwordError) stepErrors.password = passwordError;
      
      const confirmError = validateConfirmPassword(form.confirmPassword);
      if (confirmError) stepErrors.confirmPassword = confirmError;
    }
    
    setErrors(prev => ({ ...prev, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  // ===== FIXED: Check if email exists - NO AUTO REDIRECT =====
  const checkEmailExists = async (email) => {
    if (!email || validateEmail(email)) return false;
    
    setCheckingEmail(true);
    setEmailExists(null);
    
    try {
      const methods = await auth.fetchSignInMethodsForEmail(email);
      const exists = methods && methods.length > 0;
      setEmailExists(exists);
      
      if (exists) {
        setError('An account with this email already exists. Please go back to login.');
      } else {
        setError('');
      }
      
      return exists;
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Error checking email. Please try again.');
      }
      
      setEmailExists(null);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  // ===== FIXED: Handle step 1 submit - Stay on step 1 if email exists =====
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(1)) return;
    
    setLoading(true);
    setError('');
    
    const exists = await checkEmailExists(form.email);
    
    if (exists) {
      setError('An account with this email already exists. Please click "Sign in" below to log in.');
      setLoading(false);
      return;
    }
    
    setCurrentStep(2);
    setLoading(false);
  };

  // ===== SHOW PRE-SIGNUP TOAST =====
  const showPreSignupToast = React.useCallback(() => {
    showToast(
      '📧 After signup, you\'ll need to verify your email to post listings, comment, and message.',
      'info',
      6000
    );
  }, [showToast]);

  // ===== HANDLE FINAL SUBMIT - With pre-toast =====
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(2)) return;

    showPreSignupToast();

    setLoading(true);
    setIsLoading(true);
    setError('');

    try {
      const sanitizedName = form.name.trim().replace(/\s+/g, ' ');
      const email = form.email.trim().toLowerCase();
      
      const credential = await auth.createUserWithEmailAndPassword(email, form.password);
      
      // Store email for verification link
      localStorage.setItem('emailForSignIn', email);
      
      await credential.user.updateProfile({ displayName: sanitizedName });

      // ===== GENERATE PERMANENT USERNAME =====
      let username = '';
      try {
        username = await window.IDGenerator.generateUniqueUsername(sanitizedName);
      } catch (err) {
        // Fallback if generation fails
        const base = sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
        username = base + Math.random().toString(36).substring(2, 8);
      }
      
      // ===== CREATE USER DOCUMENT WITH DISPLAY NAME AND USERNAME =====
      await db.collection('users').doc(credential.user.uid).set({
        displayName: sanitizedName,      // Editable display name (can be changed)
        username: username,               // Permanent, never changes
        email: email,
        phone: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        replyRate: 0,
        isOnline: true,
        displayNameLastChanged: firebase.firestore.FieldValue.serverTimestamp() // Track for cooldown
      });

      try {
        await credential.user.sendEmailVerification({
          url: window.location.origin + '/verify-email.html',
          handleCodeInApp: true
        });
        
        showToast(
          '✅ Verification email sent! Check your inbox.',
          'success'
        );
        
      } catch (verificationErr) {
        showToast(
          '⚠️ Account created but verification email could not be sent. You can request one later.',
          'warning'
        );
      }

      onSuccess();
      
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
        setCurrentStep(1);
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
        setCurrentStep(1);
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password sign up is not enabled. Please contact support.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  // ===== HANDLE GOOGLE SIGN UP - With pre-toast =====
  const handleGoogleSignUp = async () => {
    if (googleLoading) return;
    
    showPreSignupToast();
    
    setGoogleLoading(true);
    setIsLoading(true);
    setError('');

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await auth.signInWithPopup(provider);
        
        showToast(
          '✅ Signed up successfully with Google!',
          'success'
        );
        
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        
        if (!userDoc.exists) {
          // Generate username from Google display name
          const displayName = result.user.displayName || 'User';
          let username = '';
          try {
            username = await window.IDGenerator.generateUniqueUsername(displayName);
          } catch (err) {
            const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
            username = base + Math.random().toString(36).substring(2, 8);
          }
          
          await db.collection('users').doc(result.user.uid).set({
            displayName: displayName,
            username: username,
            email: result.user.email || '',
            phone: '',
            photoURL: result.user.photoURL || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            replyRate: 0,
            isOnline: true,
            displayNameLastChanged: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        
        onSuccess();
        
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked') {
          setError('Popup was blocked. Redirecting to Google...');
          showToast('Popup blocked - redirecting to Google', 'info');
          await new Promise(resolve => setTimeout(resolve, 1500));
          await auth.signInWithRedirect(provider);
          return;
        } else {
          throw popupError;
        }
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up was cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email. Try logging in instead.');
      } else {
        setError('Failed to sign up with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
      setIsLoading(false);
    }
  };

  // ===== HANDLE REDIRECT RESULT =====
  React.useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await auth.getRedirectResult();
        if (result.user) {
          const userDoc = await db.collection('users').doc(result.user.uid).get();
          
          if (!userDoc.exists) {
            const displayName = result.user.displayName || 'User';
            let username = '';
            try {
              username = await window.IDGenerator.generateUniqueUsername(displayName);
            } catch (err) {
              const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
              username = base + Math.random().toString(36).substring(2, 8);
            }
            
            await db.collection('users').doc(result.user.uid).set({
              displayName: displayName,
              username: username,
              email: result.user.email || '',
              phone: '',
              photoURL: result.user.photoURL || '',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastActive: firebase.firestore.FieldValue.serverTimestamp(),
              replyRate: 0,
              isOnline: true,
              displayNameLastChanged: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          
          onSuccess();
        }
      } catch (err) {}
    };
    
    checkRedirectResult();
  }, [onSuccess]);

  // ===== PASSWORD STRENGTH METER =====
  const passwordStrength = React.useMemo(() => {
    const p = form.password;
    if (!p || p.length < 6) return { label: p ? 'Too short' : '', pct: 0, color: '#ef4444' };
    
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    
    const map = [
      { label: 'Weak', pct: 25, color: '#f97316' },
      { label: 'Fair', pct: 50, color: '#eab308' },
      { label: 'Good', pct: 75, color: '#3b82f6' },
      { label: 'Strong', pct: 100, color: '#22c55e' }
    ];
    return map[score] || map[0];
  }, [form.password]);

  // ===== INPUT CLASS HELPER =====
  const inputClass = (field) => {
    const hasError = errors[field] && touched[field];
    return `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent text-base ${
      hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`;
  };

  const goToPrevStep = () => {
    setCurrentStep(1);
    setError('');
  };

  const switchToLogin = () => {
    if (window.__openAuthModal) {
      window.__openAuthModal('login', { email: form.email });
    }
  };

  return React.createElement('div', { className: 'w-full' },

    // Step indicator
    React.createElement('div', { className: 'flex justify-center gap-1 mb-3' },
      [1, 2].map(step => 
        React.createElement('div', { 
          key: step,
          className: `h-1 w-6 rounded-full transition-colors ${
            step === currentStep ? 'bg-green-950' : 'bg-gray-200'
          }` 
        })
      )
    ),

    // Error message
    error && React.createElement('div', { 
      className: 'mb-3 bg-red-50 border border-red-200 text-red-600 p-2 rounded-lg text-xs' 
    }, error),

    // ===== STEP 1: Name + Email Form (includes Google button) =====
    currentStep === 1 && React.createElement('div', null,
      // Google Sign-Up (ONLY in Step 1)
      React.createElement('div', { className: 'mb-3' },
        React.createElement('button', {
          onClick: handleGoogleSignUp,
          disabled: googleLoading || loading,
          className: `w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${googleLoading ? 'animate-pulse' : ''}`,
          style: { minHeight: '44px' }
        },
          googleLoading ? (
            React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin' }),
              React.createElement('span', null, 'Connecting to Google...')
            )
          ) : (
            React.createElement(React.Fragment, null,
              React.createElement('svg', { className: 'w-5 h-5', viewBox: '0 0 24 24' },
                React.createElement('path', { fill: '#4285F4', d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' }),
                React.createElement('path', { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' }),
                React.createElement('path', { fill: '#FBBC05', d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' }),
                React.createElement('path', { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' })
              ),
              React.createElement('span', null, 'Sign up with Google')
            )
          )
        ),

        // Divider
        React.createElement('div', { className: 'relative my-3' }, 
          React.createElement('div', { className: 'absolute inset-0 flex items-center' },
            React.createElement('div', { className: 'w-full border-t border-gray-200' })
          ),
          React.createElement('div', { className: 'relative flex justify-center text-xs' },
            React.createElement('span', { className: 'px-2 bg-white text-gray-400' }, 'or sign up with email')
          )
        )
      ),

      // Name + Email Form
      React.createElement('form', { 
        onSubmit: handleStep1Submit,
        className: 'space-y-3'
      },
        React.createElement('div', null,
          React.createElement('input', {
            type: 'text',
            value: form.name,
            onChange: (e) => {
              setForm({ ...form, name: e.target.value });
              setTouched({ ...touched, name: true });
              if (errors.name) setErrors({ ...errors, name: null });
            },
            onBlur: () => setTouched({ ...touched, name: true }),
            placeholder: 'Full name',
            className: inputClass('name'),
            autoFocus: true,
            maxLength: 60
          }),
          errors.name && touched.name && 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.name)
        ),

        React.createElement('div', null,
          React.createElement('input', {
            type: 'email',
            value: form.email,
            onChange: (e) => {
              setForm({ ...form, email: e.target.value });
              setTouched({ ...touched, email: true });
              if (errors.email) setErrors({ ...errors, email: null });
            },
            onBlur: () => setTouched({ ...touched, email: true }),
            placeholder: 'Email address',
            className: inputClass('email'),
            disabled: loading || checkingEmail
          }),
          
          checkingEmail && React.createElement('p', { className: 'text-xs text-gray-500 mt-1 flex items-center gap-1' },
            React.createElement('div', { className: 'w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin' }),
            'Checking email...'
          ),
          
          emailExists && !checkingEmail && React.createElement('p', { className: 'text-xs text-amber-600 mt-1' },
            'Email already registered. ', 
            React.createElement('button', {
              type: 'button',
              onClick: switchToLogin,
              className: 'text-green-950 hover:underline font-medium'
            }, 'Sign in instead')
          ),
          
          errors.email && touched.email && 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.email)
        ),

        React.createElement('button', {
          type: 'submit',
          disabled: loading || checkingEmail || emailExists,
          className: `w-full bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-1 ${
            emailExists ? 'opacity-50 cursor-not-allowed' : ''
          }`
        }, loading || checkingEmail ? 'Checking...' : 'Continue →')
      )
    ),

    // ===== STEP 2: Password + Confirm Form (NO Google button) =====
    currentStep === 2 && React.createElement('form', { 
      onSubmit: handleFinalSubmit,
      className: 'space-y-3'
    },
      // Compact user info pill (shows display name and email)
      React.createElement('div', { 
        className: 'flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 text-sm'
      },
        React.createElement('div', { className: 'flex items-center gap-2 overflow-hidden' },
          React.createElement('span', { className: 'text-gray-500 text-xs flex-shrink-0' }, '👤'),
          React.createElement('span', { className: 'font-medium truncate' }, form.name),
          React.createElement('span', { className: 'text-gray-300 mx-1' }, '•'),
          React.createElement('span', { className: 'text-gray-600 text-xs truncate' }, form.email)
        ),
        React.createElement('button', {
          type: 'button',
          onClick: goToPrevStep,
          className: 'text-xs text-green-950 hover:underline flex-shrink-0 ml-2'
        }, 'Edit')
      ),

      // Password field
      React.createElement('div', null,
        React.createElement('div', { className: 'relative' },
          React.createElement('input', {
            type: showPassword ? 'text' : 'password',
            value: form.password,
            onChange: (e) => {
              setForm({ ...form, password: e.target.value });
              setTouched({ ...touched, password: true });
              if (errors.password) setErrors({ ...errors, password: null });
            },
            onBlur: () => setTouched({ ...touched, password: true }),
            placeholder: 'Password',
            className: inputClass('password') + ' pr-10',
            maxLength: 128,
            autoFocus: true
          }),
          React.createElement('button', {
            type: 'button',
            onClick: () => setShowPassword(!showPassword),
            className: 'absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-sm',
            tabIndex: -1
          }, showPassword ? 'Hide' : 'Show')
        ),
        errors.password && touched.password && 
          React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.password),
        
        // Password strength meter
        form.password && !errors.password && React.createElement('div', { className: 'mt-1' },
          React.createElement('div', { className: 'h-1 rounded-full bg-gray-200 overflow-hidden' },
            React.createElement('div', {
              className: 'h-full rounded-full transition-all duration-300',
              style: { width: passwordStrength.pct + '%', backgroundColor: passwordStrength.color }
            })
          ),
          React.createElement('p', { className: 'text-[10px] mt-0.5', style: { color: passwordStrength.color } },
            passwordStrength.label
          )
        )
      ),

      // Confirm password field
      React.createElement('div', null,
        React.createElement('div', { className: 'relative' },
          React.createElement('input', {
            type: showConfirm ? 'text' : 'password',
            value: form.confirmPassword,
            onChange: (e) => {
              setForm({ ...form, confirmPassword: e.target.value });
              setTouched({ ...touched, confirmPassword: true });
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
            },
            onBlur: () => setTouched({ ...touched, confirmPassword: true }),
            placeholder: 'Confirm password',
            className: inputClass('confirmPassword') + ' pr-10',
            maxLength: 128
          }),
          React.createElement('button', {
            type: 'button',
            onClick: () => setShowConfirm(!showConfirm),
            className: 'absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-sm',
            tabIndex: -1
          }, showConfirm ? 'Hide' : 'Show')
        ),
        errors.confirmPassword && touched.confirmPassword && 
          React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.confirmPassword),
        
        // Match indicator
        form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword &&
          React.createElement('p', { className: 'text-xs text-green-600 mt-1 flex items-center gap-1' },
            React.createElement('svg', { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
            ),
            '✓'
          )
      ),

      // Terms agreement
      React.createElement('div', { className: 'mt-2 text-xs text-gray-500 text-center' },
        'By continuing, you agree to our ',
        React.createElement('button', {
          type: 'button',
          onClick: () => window.__navigate?.('/terms'),
          className: 'text-green-950 hover:underline font-medium'
        }, 'Terms'),
        ' and ',
        React.createElement('button', {
          type: 'button',
          onClick: () => window.__navigate?.('/privacy'),
          className: 'text-green-950 hover:underline font-medium'
        }, 'Privacy')
      ),

      // Navigation buttons
      React.createElement('div', { className: 'flex gap-2 mt-3' },
        React.createElement('button', {
          type: 'button',
          onClick: goToPrevStep,
          className: 'flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium text-sm'
        }, '← Back'),
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          className: 'flex-1 bg-green-950 text-white py-2.5 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50 text-sm'
        }, loading ? 'Creating...' : 'Create Account')
      )
    ),


  );
}

window.SignupForm = SignupForm;