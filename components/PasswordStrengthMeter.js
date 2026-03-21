
function PasswordStrengthMeter({ password }) {
  const [strength, setStrength] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  
  React.useEffect(() => {
    if (!password) {
      setStrength(0);
      setFeedback('');
      return;
    }
    
    let score = 0;
    const feedbacks = [];
    
    
    if (password.length >= 8) {
      score += 25;
    } else if (password.length >= 6) {
      score += 15;
      feedbacks.push('Make it longer for better security');
    } else {
      feedbacks.push('Use at least 6 characters');
    }
    
    
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedbacks.push('Add uppercase letters');
    }
    
    
    if (/[0-9]/.test(password)) {
      score += 25;
    } else {
      feedbacks.push('Add numbers');
    }
    
    
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 25;
    } else {
      feedbacks.push('Add special characters (!@#$%^&*)');
    }
    
    setStrength(score);
    setFeedback(feedbacks[0] || 'Strong password!');
  }, [password]);
  
  
  const getStrengthColor = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };
  
  
  const getStrengthLabel = () => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };
  
  if (!password) return null;
  
  return React.createElement('div', { className: 'mt-2 space-y-1' },
    
    React.createElement('div', { className: 'flex gap-1 h-1.5' },
      [1, 2, 3, 4].map(segment =>
        React.createElement('div', {
          key: segment,
          className: `flex-1 h-full rounded transition-all duration-300 ${
            strength >= segment * 25 ? getStrengthColor() : 'bg-gray-200'
          }`
        })
      )
    ),
    
    
    React.createElement('div', { className: 'flex justify-between text-xs' },
      React.createElement('span', {
        className: `font-medium ${
          strength < 30 ? 'text-red-600' :
          strength < 60 ? 'text-yellow-600' :
          strength < 80 ? 'text-blue-600' :
          'text-green-600'
        }`
      }, getStrengthLabel()),
      
      React.createElement('span', { className: 'text-gray-500' }, feedback)
    )
  );
}

window.PasswordStrengthMeter = PasswordStrengthMeter;