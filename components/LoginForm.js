/* pages/home/components/LoginForm.js - DIRECT DATABASE CHECK */

function LoginForm({ onSuccess, setIsLoading, initialEmail = '' }) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [email, setEmail] = React.useState(initialEmail || '');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [touched, setTouched] = React.useState({});
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [emailExists, setEmailExists] = React.useState(null);

  // Email validation
  const validateEmail = (value) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  };

  // Password validation
  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  // ===== FIXED: Check if email exists by trying to get auth methods AND checking Firestore =====
  const checkEmailExists = async (email) => {
    if (!email || validateEmail(email)) return false;
    
    setCheckingEmail(true);
    setEmailExists(null);
    
    try {
      // Method 1: Check Firebase Auth sign-in methods
      let authExists = false;
      try {
        const methods = await auth.fetchSignInMethodsForEmail(email);
        authExists = methods && methods.length > 0;
        console.log('📧 Auth methods for', email, ':', methods);
      } catch (authErr) {
        console.log('Auth method check failed, trying Firestore...', authErr);
      }
      
      // Method 2: Directly check Firestore users collection
      let firestoreExists = false;
      try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();
        firestoreExists = !snapshot.empty;
        console.log('📧 Firestore check for', email, ':', firestoreExists ? 'found' : 'not found');
      } catch (dbErr) {
        console.log('Firestore check failed', dbErr);
      }
      
      // If either method says exists, consider it exists
      const exists = authExists || firestoreExists;
      setEmailExists(exists);
      
      if (!exists) {
        setError('No account found with this email. Would you like to sign up?');
      } else {
        setError(''); // Clear error if exists
      }
      
      return exists;
    } catch (err) {
      console.error('Error checking email:', err);
      
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setTouched({ ...touched, email: true });
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const exists = await checkEmailExists(email);
      
      if (exists) {
        // Email exists - proceed to password step
        setCurrentStep(2);
      } else {
        // Email doesn't exist - stay on step 1, error already set
        console.log('Email not found, staying on step 1');
      }
    } catch (err) {
      console.error('Email check error:', err);
      setError('Error checking email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ===== FIXED: Direct login with better error handling =====
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setTouched({ ...touched, password: true });
      return;
    }
    
    setError('');
    setLoading(true);
    setIsLoading(true);

    try {
      // DIRECT LOGIN - let Firebase handle it
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('✅ Login successful:', userCredential.user.email);
      
      // Update lastActive in Firestore
      try {
        await db.collection('users').doc(userCredential.user.uid).update({
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          isOnline: true
        });
      } catch (updateErr) {
        console.log('Could not update lastActive, but login successful');
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // ===== FIXED: More accurate error messages =====
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
        setCurrentStep(1); // Go back to email step
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
        setCurrentStep(1);
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact support.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    
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
        console.log('✅ Google login successful:', result.user.email);
        
        // Check if user document exists, create if not
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
          // Create user document for Google sign-in
          let base = (result.user.displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (base.length < 3) base = 'user' + base;
          const username = base.substring(0, 14) + Math.random().toString(36).substring(2, 6);
          
          await db.collection('users').doc(result.user.uid).set({
            name: result.user.displayName || 'User',
            username: username,
            email: result.user.email || '',
            phone: '',
            photoURL: result.user.photoURL || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            replyRate: 0,
            usernameEdited: false,
            isOnline: true
          });
        } else {
          // Update existing user
          await db.collection('users').doc(result.user.uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true
          });
        }
        
        onSuccess();
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked') {
          setError('Popup was blocked. Redirecting to Google...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          await auth.signInWithRedirect(provider);
          return;
        } else {
          throw popupError;
        }
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email. Try logging in with email/password.');
      } else {
        setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
      setIsLoading(false);
    }
  };

  // Handle redirect result
  React.useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await auth.getRedirectResult();
        if (result.user) {
          console.log('✅ Redirect login successful:', result.user.email);
          onSuccess();
        }
      } catch (err) {
        console.error('Redirect sign-in error:', err);
      }
    };
    checkRedirectResult();
  }, [onSuccess]);

  const goBackToEmail = () => {
    setCurrentStep(1);
    setError('');
    setPassword('');
  };

  const switchToSignup = () => {
    if (window.__openAuthModal) {
      window.__openAuthModal('signup', { email: email });
    }
  };

  const inputClass = (field) => {
    const hasError = error && touched[field];
    return `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-950 focus:border-transparent text-base ${
      hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`;
  };

  return React.createElement('div', { className: 'w-full' },

    // Google Sign-In
    React.createElement('div', { className: 'mb-4' },
      React.createElement('button', {
        onClick: handleGoogleSignIn,
        disabled: googleLoading || loading,
        className: `w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${googleLoading ? 'animate-pulse' : ''}`,
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
            React.createElement('span', null, 'Continue with Google')
          )
        )
      ),

      React.createElement('div', { className: 'relative my-4' }, 
        React.createElement('div', { className: 'absolute inset-0 flex items-center' },
          React.createElement('div', { className: 'w-full border-t border-gray-200' })
        ),
        React.createElement('div', { className: 'relative flex justify-center text-xs' },
          React.createElement('span', { className: 'px-2 bg-white text-gray-400' }, 
            currentStep === 1 ? 'or sign in with email' : 'or use password'
          )
        )
      )
    ),

    // Step indicator
    React.createElement('div', { className: 'flex justify-center gap-1 mb-4' },
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
      className: 'mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm' 
    }, error),

    // Step 1: Email Form
    currentStep === 1 && React.createElement('form', { 
      onSubmit: handleEmailSubmit
    },
      React.createElement('div', { className: 'mb-4' },
        React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Email Address'),
        React.createElement('input', {
          type: 'email',
          value: email,
          onChange: (e) => {
            setEmail(e.target.value);
            setError('');
            setTouched({ ...touched, email: true });
            setEmailExists(null); // Reset on change
          },
          onBlur: () => setTouched({ ...touched, email: true }),
          placeholder: 'you@example.com',
          className: inputClass('email'),
          autoFocus: true,
          disabled: loading || checkingEmail
        }),
        
        checkingEmail && React.createElement('p', { className: 'text-xs text-gray-500 mt-1 flex items-center gap-1' },
          React.createElement('div', { className: 'w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin' }),
          'Checking email...'
        ),
        
        // Show sign up link if email doesn't exist
        emailExists === false && !checkingEmail && React.createElement('p', { className: 'text-xs text-amber-600 mt-1' },
          'No account found. ', 
          React.createElement('button', {
            type: 'button',
            onClick: switchToSignup,
            className: 'text-green-950 hover:underline font-medium'
          }, 'Sign up instead')
        )
      ),

      React.createElement('button', {
        type: 'submit',
        disabled: loading || checkingEmail,
        className: 'w-full bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed'
      }, loading || checkingEmail ? 'Checking...' : 'Continue →')
    ),

    // Step 2: Password Form
    currentStep === 2 && React.createElement('form', { 
      onSubmit: handlePasswordSubmit
    },
      // Email display with edit option
      React.createElement('div', { className: 'mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('svg', { className: 'w-4 h-4 text-gray-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' })
          ),
          React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, email)
        ),
        React.createElement('button', {
          type: 'button',
          onClick: goBackToEmail,
          className: 'text-xs text-green-950 hover:underline'
        }, 'Change')
      ),

      React.createElement('div', { className: 'mb-4' },
        React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Password'),
        React.createElement('input', {
          type: 'password',
          value: password,
          onChange: (e) => {
            setPassword(e.target.value);
            setError('');
            setTouched({ ...touched, password: true });
          },
          onBlur: () => setTouched({ ...touched, password: true }),
          placeholder: '••••••••',
          className: inputClass('password'),
          autoFocus: true,
          disabled: loading
        }),
        
        // Forgot password link
        React.createElement('div', { className: 'text-right mt-1' },
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              if (window.__navigate) {
                window.__navigate('/forgot-password');
                closeModal?.();
              }
            },
            className: 'text-xs text-green-950 hover:underline'
          }, 'Forgot password?')
        )
      ),

      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', {
          type: 'button',
          onClick: goBackToEmail,
          className: 'flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-medium'
        }, '← Back'),
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          className: 'flex-1 bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
        }, loading ? 'Signing in...' : 'Sign In')
      )
    )
  );
}

window.LoginForm = LoginForm;