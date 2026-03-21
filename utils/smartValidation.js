
const SmartValidation = {
  
  delays: {
    email: 300,
    password: 500,
    phone: 400,
    price: 300,
    text: 400,
    address: 600,
    name: 350,
    description: 500,
    idNumber: 300,
    date: 200
  },
  
  
  getDelay: (fieldType) => {
    return SmartValidation.delays[fieldType] || 400;
  },
  
  
  shouldValidate: (field, value, prevValue, touchedFields, isBlur = false) => {
    
    if (isBlur) return true;
    
    
    if (!value && !touchedFields[field]) return false;
    
    
    if (value === prevValue) return false;
    
    return true;
  },
  
  
  getProgressiveFeedback: (field, value, validator) => {
    
    if (!value || value.length === 0) {
      return {
        type: 'hint',
        message: SmartValidation.getHint(field),
        showImmediately: false
      };
    }
    
    
    if (SmartValidation.hasMinLength(field, value)) {
      const minLength = SmartValidation.getMinLength(field);
      if (value.length < minLength) {
        return {
          type: 'progress',
          message: `${value.length}/${minLength} characters`,
          progress: value.length / minLength,
          showImmediately: true
        };
      }
    }
    
    
    const result = validator(value);
    
    if (result) {
      
      return {
        type: 'error',
        message: result,
        suggestion: SmartValidation.getSuggestion(field, value),
        showImmediately: true
      };
    }
    
    
    return {
      type: 'success',
      message: '✓ Looks good!',
      showImmediately: true
    };
  },
  
  
  getHint: (field) => {
    const hints = {
      email: 'We\'ll never share your email',
      password: 'Use 6+ characters with mix of letters & numbers',
      phone: 'Nigerian number like 08012345678',
      name: 'Your full name as it appears on ID',
      price: 'Monthly rent in Naira',
      address: 'Street, building, landmark',
      description: 'Describe the property in detail',
      idNumber: 'No spaces or special characters',
      confirmPassword: 'Type your password again'
    };
    return hints[field] || 'Start typing...';
  },
  
  
  getMinLength: (field) => {
    const lengths = {
      password: 6,
      name: 2,
      phone: 11,
      idNumber: 11,
      address: 5,
      description: 20,
      title: 5
    };
    return lengths[field] || 1;
  },
  
  
  hasMinLength: (field, value) => {
    const minLength = SmartValidation.getMinLength(field);
    return minLength > 1 && value && value.length < minLength;
  },
  
  
  getSuggestion: (field, value) => {
    if (!value) return null;
    
    const suggestions = {
      email: () => {
        if (!value.includes('@')) return 'Add @ symbol';
        if (!value.includes('.')) return 'Add domain (e.g., .com)';
        if (value.includes(' ')) return 'Remove spaces';
        return null;
      },
      password: () => {
        if (value.length < 6) return 'Make it longer';
        if (!/[A-Z]/.test(value)) return 'Add an uppercase letter';
        if (!/[0-9]/.test(value)) return 'Add a number';
        if (value.toLowerCase() === 'password') return 'Choose something harder to guess';
        return null;
      },
      phone: () => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length < 11) return `Need ${11 - cleaned.length} more digits`;
        if (cleaned.length > 11) return `${cleaned.length - 11} too many digits`;
        if (!cleaned.startsWith('0')) return 'Should start with 0';
        return null;
      }
    };
    
    return suggestions[field]?.() || null;
  },
  
  
  trackValidation: (field, result, duration) => {
    if (window.analytics) {
      window.analytics.track('field_validation', {
        field,
        result: result ? 'error' : 'success',
        duration
      });
    }
  }
};

window.SmartValidation = SmartValidation;