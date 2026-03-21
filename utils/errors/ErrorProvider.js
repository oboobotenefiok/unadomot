// utils/errors/ErrorProvider.js
const ErrorContext = React.createContext({
  showError: () => {},
  showToast: () => {},
  showModal: () => {},
  clearErrors: () => {},
  lastError: null
});

function ErrorProvider({ children }) {
  const [toastError, setToastError] = React.useState(null);
  const [modalError, setModalError] = React.useState(null);
  const [lastError, setLastError] = React.useState(null);

  React.useEffect(() => {
    // Subscribe to global error logger
    const unsubscribe = ErrorLogger.subscribe((logEntry) => {
      setLastError(logEntry);
      
      // Show toast for non-critical errors
      if (logEntry.level !== ERROR_LEVELS.CRITICAL) {
        showToast(logEntry);
      } else {
        showModal(logEntry);
      }
    });

    return unsubscribe;
  }, []);

  const showToast = (error) => {
    setToastError(error);
  };

  const showModal = (error) => {
    setModalError(error);
  };

  const clearErrors = () => {
    setToastError(null);
    setModalError(null);
  };

  const value = {
    showError: (error, options = {}) => {
      if (options.modal) {
        showModal(error);
      } else {
        showToast(error);
      }
    },
    showToast,
    showModal,
    clearErrors,
    lastError
  };

  return React.createElement(ErrorContext.Provider, { value },
    children,
    
    // Toast notifications
    toastError && React.createElement(ErrorToast, {
      error: toastError,
      onClose: () => setToastError(null),
      position: 'bottom-center',
      duration: 5000
    }),
    
    // Modal for critical errors
    modalError && React.createElement(ErrorModal, {
      error: modalError,
      onClose: () => setModalError(null)
    })
  );
}

const useError = () => React.useContext(ErrorContext);

window.ErrorContext = ErrorContext;
window.ErrorProvider = ErrorProvider;
window.useError = useError;