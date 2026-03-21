
function SmartFormField({
  field,
  label,
  type = 'text',
  value = '',
  onChange,
  onBlur,
  onFocus,
  error = null,
  isValidating = false,
  touched = false,
  required = false,
  placeholder,
  hint,
  autoComplete,
  disabled = false,
  rows = 3,
  maxLength,
  className = '',
  inputClassName = '',
  labelClassName = '',
  errorClassName = '',
  
  
  countries = [],
  selectedCountry = '+234',
  onCountryChange
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const [showPassword, setShowPassword] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const inputId = React.useId();
  
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    
    if (onChange) {
      onChange(e);
    }
  };
  
  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };
  
  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };
  
  const handlePaste = (e) => {
    if (type === 'password') return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    
    const syntheticEvent = {
      target: {
        value: pastedText,
        name: field
      }
    };
    
    setLocalValue(pastedText);
    if (onChange) onChange(syntheticEvent);
  };
  
  const getInputType = () => {
    if (type === 'password' && showPassword) return 'text';
    return type;
  };
  
  const getFieldStyles = () => {
    let styles = 'w-full p-3 border rounded-lg outline-none transition-colors ';
    
    if (disabled) {
      styles += 'bg-gray-100 border-gray-200 cursor-not-allowed ';
    } else if (error?.type === 'error') {
      styles += 'border-red-500 bg-red-50 ';
    } else if (error?.type === 'warning') {
      styles += 'border-yellow-500 bg-yellow-50 ';
    } else if (value && touched && !error) {
      styles += 'border-green-500 bg-green-50 ';
    } else if (focused) {
      styles += 'border-green-950 ';
    } else {
      styles += 'border-gray-300 hover:border-gray-400 ';
    }
    
    return styles + inputClassName;
  };
  
  
  if (type === 'phone') {
    return React.createElement('div', {
        className: `mb-4 ${className}`
      },
      React.createElement('label', {
        htmlFor: inputId,
        className: `block text-sm font-medium mb-1 ${labelClassName}`
      }, label, required && React.createElement('span', { className: 'text-red-500 ml-1' }, '*')),
      
      React.createElement('div', { className: 'flex gap-2' },
        
        React.createElement('select', {
            value: selectedCountry,
            onChange: onCountryChange,
            className: 'w-32 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-950'
          },
          countries.map(country =>
            React.createElement('option', {
              key: country.code,
              value: country.dialCode
            }, country.dialCode)
          )
        ),
        
        
        React.createElement('div', { className: 'relative flex-1' },
          React.createElement('input', {
            id: inputId,
            type: 'tel',
            value: localValue,
            onChange: handleChange,
            onBlur: handleBlur,
            onFocus: handleFocus,
            onPaste: handlePaste,
            placeholder,
            disabled,
            autoComplete,
            className: getFieldStyles(),
            'aria-invalid': error?.type === 'error'
          })
        )
      ),
      
      (error || (hint && !localValue && !focused)) &&
      React.createElement('p', {
        className: `mt-1 text-sm ${
          error?.type === 'error' ? 'text-red-600' :
          error?.type === 'warning' ? 'text-yellow-600' :
          'text-blue-600'
        } ${errorClassName}`
      }, error?.message || hint)
    );
  }
  
  
  return React.createElement('div', {
      className: `mb-4 ${className}`
    },
    React.createElement('div', {
        className: 'flex justify-between items-center mb-1'
      },
      React.createElement('label', {
          htmlFor: inputId,
          className: `text-sm font-medium ${error?.type === 'error' ? 'text-red-700' : 'text-gray-700'} ${labelClassName}`
        },
        label,
        required && React.createElement('span', { className: 'text-red-500 ml-1' }, '*')
      )
    ),
    
    React.createElement('div', { className: 'relative' },
      type === 'textarea' ?
      React.createElement('textarea', {
        id: inputId,
        value: localValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        onPaste: handlePaste,
        placeholder,
        disabled,
        rows,
        maxLength,
        className: getFieldStyles(),
        'aria-invalid': error?.type === 'error'
      }) :
      React.createElement('input', {
        id: inputId,
        type: getInputType(),
        value: localValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        onPaste: handlePaste,
        placeholder,
        disabled,
        maxLength,
        autoComplete,
        className: getFieldStyles(),
        'aria-invalid': error?.type === 'error'
      }),
      
      type === 'password' && localValue &&
      React.createElement('button', {
        type: 'button',
        onClick: () => setShowPassword(!showPassword),
        className: 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm',
        tabIndex: -1
      }, showPassword ? 'Hide' : 'Show')
    ),
    
    (error || (hint && !localValue && !focused)) &&
    React.createElement('p', {
      className: `mt-1 text-sm ${
        error?.type === 'error' ? 'text-red-600' :
        error?.type === 'warning' ? 'text-yellow-600' :
        'text-blue-600'
      } ${errorClassName}`
    }, error?.message || hint)
  );
}

window.SmartFormField = SmartFormField;