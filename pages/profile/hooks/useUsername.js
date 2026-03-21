// pages/profile/hooks/useUsername.js
function useUsername(initialUsername = '', profileUsername = '', isEdited = false) {
  const [username, setUsername] = React.useState(initialUsername);
  const [usernameAvailable, setUsernameAvailable] = React.useState(null);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState('');
  const usernameTimer = React.useRef(null);
  
  const validateUsername = React.useCallback(async (value, userId) => {
    if (!value) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }
    
    if (value === profileUsername) {
      setUsernameAvailable(true);
      setUsernameError('');
      return;
    }
    
    const formatError = window.IDGenerator?.validateUsername(value);
    if (formatError) {
      setUsernameAvailable(null);
      setUsernameError(formatError);
      return;
    }
    
    setCheckingUsername(true);
    
    try {
      const exists = await window.IDGenerator?.checkUsernameExists(value, userId);
      setUsernameAvailable(!exists);
      setUsernameError(!exists ? '' : 'Username already taken');
    } catch (err) {
      setUsernameAvailable(null);
      setUsernameError('Error checking username');
    } finally {
      setCheckingUsername(false);
    }
  }, [profileUsername]);
  
  const debouncedValidate = React.useCallback((value, userId) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    
    usernameTimer.current = setTimeout(() => {
      validateUsername(value, userId);
    }, PROFILE_CONSTANTS.VALIDATION.USERNAME_CHECK_DELAY);
  }, [validateUsername]);
  
  const handleUsernameChange = React.useCallback((value, userId) => {
    if (isEdited) return;
    
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    debouncedValidate(sanitized, userId);
  }, [isEdited, debouncedValidate]);
  
  React.useEffect(() => {
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, []);
  
  return {
    username,
    setUsername,
    usernameAvailable,
    checkingUsername,
    usernameError,
    handleUsernameChange
  };
}

window.useUsername = useUsername;