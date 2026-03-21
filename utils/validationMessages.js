
const ValidationMessages = {
  
  errors: {
    required: (field) => `${field} is required`,
    email: {
      invalid: "Please enter a valid email address",
      missing: "Email must include @ symbol",
      domain: "Please include a domain (e.g., .com, .ng)",
      taken: "This email is already registered"
    },
    password: {
      short: "Password must be at least 6 characters",
      weak: "Use a mix of letters and numbers",
      mismatch: "Passwords do not match",
      common: "Please choose a stronger password"
    },
    phone: {
      invalid: "Please enter a valid phone number",
      short: "Phone number is too short",
      long: "Phone number is too long",
      format: "Please enter a valid format"
    },
    name: {
      invalid: "Use only letters and spaces",
      short: "Name is too short",
      long: "Name is too long"
    },
    price: {
      invalid: "Please enter a valid amount",
      low: "Price must be at least ₦1,000",
      high: "Price seems too high. Maximum ₦100,000,000",
      format: "Use numbers only"
    },
    address: {
      invalid: "Use letters, numbers, and these symbols: , . - # / & @",
      short: "Address is too short",
      long: "Address is too long"
    },
    general: {
      network: "Network error. Please try again",
      timeout: "Request timed out",
      unknown: "Something went wrong"
    }
  },
  
  
  hints: {
    email: "Enter your email address",
    password: "Minimum 6 characters with letters and numbers",
    phone: "Select country and enter number",
    name: "Enter your full name",
    price: "Monthly rent in Naira (minimum ₦1,000)",
    address: "Street address, building name",
    description: "Describe the property (minimum 20 characters)",
    confirmPassword: "Re-enter your password",
    idNumber: "Enter your ID number without spaces"
  },
  
  
  success: {
    field: "✓ Valid",
    form: "All fields are valid",
    saved: "Draft saved"
  },
  
  
  progress: {
    password: (current, min) => `${current}/${min} characters`,
    phone: (current, target) => `${target - current} more digits`,
    description: (current, min) => current < min ? `${current}/${min} characters` : 'Good length'
  },
  
  
  get: (category, key, field = '') => {
    const message = ValidationMessages[category]?.[key];
    if (typeof message === 'string') {
      return message.replace('{field}', field);
    }
    if (typeof message === 'function') {
      return message(field);
    }
    return message || 'Invalid input';
  },
  
  
  formatError: (error, field) => {
    if (!error) return null;
    return {
      text: error,
      className: 'text-red-600'
    };
  },
  
  
  formatHint: (hint) => ({
    text: hint,
    className: 'text-blue-600'
  }),
  
  
  formatSuccess: (message) => ({
    text: message,
    className: 'text-green-600'
  })
};

window.ValidationMessages = ValidationMessages;