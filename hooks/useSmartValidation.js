
function useSmartValidation(initialData, validators, options = {}) {
  const {
    validateOnChange = true,
      validateOnBlur = true,
      debounceMs = 300,
      autoSave = true,
      draftKey = null
  } = options;
  
  const [data, setData] = React.useState(() => {
    if (autoSave && draftKey) {
      try {
        const saved = localStorage.getItem(`draft_${draftKey}`);
        return saved ? JSON.parse(saved) : initialData;
      } catch (e) {
        return initialData;
      }
    }
    return initialData;
  });
  
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [isValidating, setIsValidating] = React.useState({});
  const [isFormValid, setIsFormValid] = React.useState(false);
  
  const validationTimers = React.useRef({});
  
  
  React.useEffect(() => {
    
    const requiredFields = Object.keys(validators);
    const allFieldsFilled = requiredFields.every(field => {
      const value = data[field];
      return value && value.toString().trim().length > 0;
    });
    
    const noErrors = Object.values(errors).every(error => error === null || error === undefined);
    
    setIsFormValid(allFieldsFilled && noErrors);
  }, [data, errors, validators]);
  
  
  React.useEffect(() => {
    if (autoSave && draftKey && Object.keys(data).length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`draft_${draftKey}`, JSON.stringify(data));
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [data, autoSave, draftKey]);
  
  
  const validateField = React.useCallback((field, value, isBlur = false) => {
    
    if (validationTimers.current[field]) {
      clearTimeout(validationTimers.current[field]);
      delete validationTimers.current[field];
    }
    
    
    if (!validateOnChange && !isBlur) return;
    if (!validateOnBlur && isBlur) return;
    
    const validator = validators[field];
    if (!validator) return;
    
    
    if (value && window.ValidationPatterns?.isDangerous(value)) {
      setErrors(prev => ({
        ...prev,
        [field]: { type: 'error', message: 'Invalid content detected' }
      }));
      setIsValidating(prev => ({ ...prev, [field]: false }));
      return;
    }
    
    
    setIsValidating(prev => ({ ...prev, [field]: true }));
    
    
    validationTimers.current[field] = setTimeout(() => {
      const result = validator(value, data);
      
      
      setErrors(prev => ({
        ...prev,
        [field]: result || null
      }));
      
      
      setIsValidating(prev => ({ ...prev, [field]: false }));
      
      
      delete validationTimers.current[field];
    }, isBlur ? 0 : debounceMs);
  }, [validators, data, validateOnChange, validateOnBlur, debounceMs]);
  
  
  const handleChange = React.useCallback((field) => (e) => {
    const value = e.target.value;
    
    setData(prev => ({ ...prev, [field]: value }));
    
    
    if (!value && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    
    
    if (touched[field]) {
      validateField(field, value);
    }
  }, [touched, errors, validateField]);
  
  
  const handleBlur = React.useCallback((field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, data[field], true);
  }, [data, validateField]);
  
  
  const handleFocus = React.useCallback((field) => () => {
    
    if (errors[field]?.type === 'hint' || errors[field]?.type === 'warning') {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);
  
  
  const getFieldProps = React.useCallback((field, type = 'text') => {
    return {
      name: field,
      type,
      value: data[field] || '',
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      onFocus: handleFocus(field),
      error: errors[field],
      isValidating: isValidating[field],
      touched: touched[field]
    };
  }, [data, errors, isValidating, touched, handleChange, handleBlur, handleFocus]);
  
  
  const resetForm = React.useCallback((newData = initialData) => {
    setData(newData);
    setErrors({});
    setTouched({});
    setIsValidating({});
    
    
    Object.keys(validationTimers.current).forEach(key => {
      clearTimeout(validationTimers.current[key]);
    });
    validationTimers.current = {};
    
    if (autoSave && draftKey) {
      localStorage.removeItem(`draft_${draftKey}`);
    }
  }, [initialData, autoSave, draftKey]);
  
  
  const clearDraft = React.useCallback(() => {
    if (draftKey) {
      localStorage.removeItem(`draft_${draftKey}`);
      setData(initialData);
      setErrors({});
      setTouched({});
    }
  }, [draftKey, initialData]);
  
  return {
    data,
    errors,
    touched,
    isValidating,
    isFormValid,
    handleChange,
    handleBlur,
    handleFocus,
    validateField,
    resetForm,
    clearDraft,
    getFieldProps,
    setData,
    setTouched
  };
}

window.useSmartValidation = useSmartValidation;