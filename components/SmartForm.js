
function SmartForm({
  children,
  onSubmit,
  onValidSubmit,
  validationHook,
  className = '',
  showProgress = false, 
  showDraftIndicator = false, 
  submitText = 'Submit',
  submittingText = 'Submitting...',
  resetText = 'Reset',
  showReset = false,
  disabled = false
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  
  const {
    isFormValid,
    formProgress,
    resetForm,
    clearDraft,
    data,
    setTouched
  } = validationHook || {};
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (onValidSubmit && !isFormValid) {
      
      if (setTouched && data) {
        const allTouched = {};
        Object.keys(data).forEach(key => {
          allTouched[key] = true;
        });
        setTouched(allTouched);
      }
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      if (onValidSubmit) {
        await onValidSubmit(data);
        setSubmitSuccess(true);
        if (clearDraft) clearDraft();
      } else if (onSubmit) {
        await onSubmit(e);
      }
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReset = () => {
    if (resetForm) resetForm();
    setSubmitError(null);
    setSubmitSuccess(false);
  };
  
  return React.createElement('form', {
      onSubmit: handleSubmit,
      onReset: handleReset,
      className: `space-y-6 ${className}`,
      noValidate: true
    },
    
    showProgress && formProgress !== undefined &&
    React.createElement('div', { className: 'mb-6' },
      React.createElement('div', { className: 'flex justify-between text-sm mb-1' },
        React.createElement('span', { className: 'text-gray-600' }, 'Progress'),
        React.createElement('span', { className: 'text-gray-600' }, `${formProgress}%`)
      ),
      React.createElement('div', { className: 'h-2 bg-gray-200 rounded-full overflow-hidden' },
        React.createElement('div', {
          className: 'h-full bg-green-950 transition-all duration-500',
          style: { width: `${formProgress}%` }
        })
      )
    ),
    
    
    showDraftIndicator && validationHook?.data &&
    Object.keys(validationHook.data).length > 0 &&
    localStorage.getItem(`draft_${validationHook.draftKey}`) &&
    React.createElement('div', {
        className: 'text-xs text-gray-400 bg-gray-50 p-2 rounded flex justify-between items-center'
      },
      React.createElement('span', null, 'Draft saved'),
      React.createElement('button', {
        type: 'button',
        onClick: validationHook.clearDraft,
        className: 'text-red-500 hover:text-red-700 text-xs'
      }, 'Clear')
    ),
    
    
    submitError &&
    React.createElement('div', {
        className: 'bg-red-50 border-l-4 border-red-500 p-4 rounded'
      },
      React.createElement('p', { className: 'text-red-700 text-sm' }, submitError)
    ),
    
    
    submitSuccess &&
    React.createElement('div', {
        className: 'bg-green-50 border-l-4 border-green-500 p-4 rounded'
      },
      React.createElement('p', { className: 'text-green-700 text-sm' }, 'Success!')
    ),
    
    children,
    
    
    React.createElement('div', { className: 'flex gap-4 pt-4' },
      React.createElement('button', {
          type: 'submit',
          disabled: disabled || isSubmitting || (onValidSubmit && !isFormValid),
          className: `flex-1 bg-green-950 text-white py-3 rounded-lg font-bold 
          hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed
          ${isSubmitting ? 'cursor-wait' : ''}`
        },
        isSubmitting ? submittingText : submitText
      ),
      
      showReset &&
      React.createElement('button', {
        type: 'reset',
        disabled: isSubmitting,
        className: 'px-6 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition disabled:opacity-50'
      }, resetText)
    )
  );
}

window.SmartForm = SmartForm;