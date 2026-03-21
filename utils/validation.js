
const ValidationHelpers = {
  
  
  
  
  validateRequired: function(value, fieldName) {
    if (!value || value.trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  validateLength: function(value, fieldName, min = 1, max = 500) {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    if (trimmed.length > max) {
      return `${fieldName} cannot exceed ${max} characters`;
    }
    return null;
  },
  
  validateText: function(value, fieldName, options = {}) {
    const {
      required = true,
        minLength = 1,
        maxLength = 500,
        allowHtml = false,
        pattern = null
    } = options;
    
    
    if (required) {
      const requiredError = this.validateRequired(value, fieldName);
      if (requiredError) return requiredError;
    } else if (!value || value.trim() === '') {
      return null; 
    }
    
    
    const lengthError = this.validateLength(value, fieldName, minLength, maxLength);
    if (lengthError) return lengthError;
    
    
    if (!allowHtml) {
      const hasHtml = /<[^>]*>/g.test(value);
      if (hasHtml) {
        return `${fieldName} cannot contain HTML tags`;
      }
    }
    
    
    if (pattern && !pattern.test(value)) {
      return `${fieldName} contains invalid characters`;
    }
    
    
    const dangerousPatterns = [
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /onclick=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /<script/i,
      /<iframe/i,
      /<embed/i,
      /<object/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        return `${fieldName} contains invalid content`;
      }
    }
    
    return null;
  },
  
  
  
  
  
  validateEmail: function(email, required = true) {
    if (required && (!email || email.trim() === '')) {
      return 'Email is required';
    }
    
    if (!email || email.trim() === '') {
      return null; 
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    
    
    if (email.includes('<') || email.includes('>') || email.includes('script')) {
      return 'Email contains invalid characters';
    }
    
    return null;
  },
  
  
  
  
  
  validatePassword: function(password, required = true) {
    if (required && (!password || password === '')) {
      return 'Password is required';
    }
    
    if (!password || password === '') {
      return null;
    }
    
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    
    if (password.length > 50) {
      return 'Password cannot exceed 50 characters';
    }
    
    
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return 'Please choose a stronger password';
    }
    
    return null;
  },
  
  
  
  
  
  validatePhone: function(phone, required = false) {
    if (!phone || phone.trim() === '') {
      return required ? 'Phone number is required' : null;
    }
    
    
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    
    
    const patterns = [
      /^[0]?[7-9][0-1][0-9]{8}$/, 
      /^234[7-9][0-1][0-9]{8}$/ 
    ];
    
    const isValid = patterns.some(pattern => pattern.test(cleaned));
    
    if (!isValid) {
      return 'Please enter a valid Nigerian phone number (e.g., 08012345678)';
    }
    
    return null;
  },
  
  
  
  
  
  validatePrice: function(price, required = true) {
    if (required && (price === undefined || price === null || price === '')) {
      return 'Price is required';
    }
    
    if (!required && (price === undefined || price === null || price === '')) {
      return null;
    }
    
    const num = Number(price);
    
    if (isNaN(num)) {
      return 'Price must be a number';
    }
    
    if (num <= 0) {
      return 'Price must be greater than 0';
    }
    
    if (num > 100000000) { 
      return 'Price seems too high. Please verify.';
    }
    
    if (num < 1000) {
      return 'Price seems too low. Please verify.';
    }
    
    return null;
  },
  
  
  
  
  
  validateDate: function(date, required = false, options = {}) {
    const { minDate = null, maxDate = null, futureOnly = false } = options;
    
    if (!date && required) {
      return 'Date is required';
    }
    
    if (!date) {
      return null;
    }
    
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Please enter a valid date';
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (futureOnly && dateObj < now) {
      return 'Date must be in the future';
    }
    
    if (minDate && dateObj < new Date(minDate)) {
      return `Date must be after ${new Date(minDate).toLocaleDateString()}`;
    }
    
    if (maxDate && dateObj > new Date(maxDate)) {
      return `Date must be before ${new Date(maxDate).toLocaleDateString()}`;
    }
    
    return null;
  },
  
  
  
  
  
  validateState: function(state, required = true) {
    if (required && (!state || state === '')) {
      return 'Please select a state';
    }
    
    if (!state || state === '') {
      return null;
    }
    
    
    const states = window.nigeriaStates || [];
    const stateExists = states.some(s => s.name === state);
    
    if (!stateExists) {
      return 'Please select a valid Nigerian state';
    }
    
    return null;
  },
  
  validateLGA: function(lga, state, required = true) {
    if (required && (!lga || lga === '')) {
      return 'Please select an LGA';
    }
    
    if (!lga || lga === '' || !state) {
      return null;
    }
    
    
    const states = window.nigeriaStates || [];
    const selectedState = states.find(s => s.name === state);
    
    if (!selectedState || !selectedState.lgas.includes(lga)) {
      return 'Please select a valid LGA for the selected state';
    }
    
    return null;
  },
  
  
  
  
  
  validateAddress: function(address, required = true) {
    
    const result = this.validateText(address, 'Address', {
      required,
      minLength: 5,
      maxLength: 200,
      allowHtml: false,
      
      pattern: /^[a-zA-Z0-9\s\.,\-/#&@]+$/
    });
    
    
    if (result && result.includes('invalid characters')) {
      return 'Address can only contain letters, numbers, spaces, and these symbols: , . - # / & @';
    }
    
    return result;
  },
  
  
  
  
  
  validateIDNumber: function(idNumber, idType, required = true) {
    if (required && (!idNumber || idNumber.trim() === '')) {
      return 'ID number is required';
    }
    
    if (!idNumber || idNumber.trim() === '') {
      return null;
    }
    
    const cleaned = idNumber.replace(/\s/g, '');
    
    
    switch (idType) {
      case 'nin':
        
        if (!/^\d{11}$/.test(cleaned)) {
          return 'NIN must be exactly 11 digits';
        }
        break;
      case 'bvn':
        
        if (!/^\d{11}$/.test(cleaned)) {
          return 'BVN must be exactly 11 digits';
        }
        break;
      case 'drivers_license':
        
        if (cleaned.length < 8 || cleaned.length > 20) {
          return 'Please enter a valid driver\'s license number';
        }
        break;
      case 'passport':
        
        if (!/^[A-Za-z]\d{8}$/.test(cleaned)) {
          return 'Passport number should be 1 letter followed by 8 digits';
        }
        break;
      default:
        
        if (cleaned.length < 5 || cleaned.length > 30) {
          return 'ID number must be between 5 and 30 characters';
        }
    }
    
    return null;
  },
  
  
  
  
  
  validateForm: function(data, rules) {
    const errors = {};
    let isValid = true;
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const error = rule.validate(value, data);
      
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    }
    
    return { isValid, errors };
  },
  
  
  
  
  
  sanitizeInput: function(value, type = 'text') {
    if (!value) return '';
    
    
    let sanitized = String(value);
    
    
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    
    
    sanitized = sanitized.trim();
    
    
    switch (type) {
      case 'email':
        sanitized = sanitized.toLowerCase();
        
        sanitized = sanitized.replace(/[^\w.@+-]/g, '');
        break;
      case 'number':
        sanitized = sanitized.replace(/[^\d.-]/g, '');
        break;
      case 'phone':
        sanitized = sanitized.replace(/[^\d+]/g, '');
        break;
      case 'address':
        
        sanitized = sanitized.replace(/[<>{}[\]$^`|\\]/g, '');
        break;
    }
    
    return sanitized;
  },
  
  
  
  
  
  
  isValidString: function(value, allowedPattern) {
    if (!value) return true;
    return allowedPattern.test(value);
  },
  
  
  getFieldError: function(fieldName, error) {
    return error ? {
      [fieldName]: error
    } : {};
  },
  
  
  clearFieldError: function(errors, fieldName) {
    const newErrors = { ...errors };
    delete newErrors[fieldName];
    return newErrors;
  }
};

window.ValidationHelpers = ValidationHelpers;