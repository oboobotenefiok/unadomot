
const ValidationPatterns = {
  
  nigeria: {
    phone: /^(0|234)[7-9][0-1]\d{8}$/,
    lga: /^[a-zA-Z\s-]+$/,
    state: /^[a-zA-Z\s]+$/,
    nin: /^\d{11}$/,
    bvn: /^\d{11}$/
  },
  
  
  common: {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
    name: /^[a-zA-Z\s'-]+$/,
    price: /^\d{4,8}$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
    url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
  },
  
  
  dangerous: {
    html: /<[^>]*>/g,
    script: /javascript:|onerror=|onload=|onclick=/gi,
    sql: /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi,
    pathTraversal: /\.\.\/|\.\.\\/g,
    eval: /eval\(/gi,
    document: /document\./gi,
    window: /window\./gi
  },
  
  
  allowedChars: {
    address: /^[a-zA-Z0-9\s,.#\-/&@]+$/,
    name: /^[a-zA-Z\s'-]+$/,
    text: /^[a-zA-Z0-9\s.,!?-]+$/,
    description: /^[a-zA-Z0-9\s.,!?'"()\-/]+$/
  },
  
  
  validate: (value, patternName, type = 'common') => {
    const pattern = ValidationPatterns[type]?.[patternName];
    if (!pattern) return true; 
    return pattern.test(value);
  },
  
  
  isDangerous: (value) => {
    if (!value) return false;
    return Object.values(ValidationPatterns.dangerous).some(pattern =>
      pattern.test(value)
    );
  },
  
  
  sanitize: (value) => {
    if (!value) return '';
    let sanitized = String(value);
    Object.values(ValidationPatterns.dangerous).forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    return sanitized;
  }
};

window.ValidationPatterns = ValidationPatterns;