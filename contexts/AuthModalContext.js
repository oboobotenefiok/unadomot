/* Auth modal global state */
const AuthModalContext = React.createContext({
  isOpen: false,
  mode: 'login',
  redirectPath: '/',
  modalProps: {},
  openModal: () => {},
  closeModal: () => {},
  toggleMode: () => {}
});

function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState('login');
  const [redirectPath, setRedirectPath] = React.useState('/');
  const [modalProps, setModalProps] = React.useState({});

  /* openPostAfterLogin triggers post flow */
  const openModal = function(authMode, options) {
    authMode = authMode || 'login';
    options = options || {};
    setMode(authMode);

    if (typeof options === 'string') {
      /* Sanitize: never redirect to /index.html or blank */
      const path = (options === '/index.html' || options === '' || options === '/index') ? '/' : options;
      setRedirectPath(path);
      setModalProps({});
    } else {
      const rawPath = options.path || window.location.pathname;
      const path = (rawPath === '/index.html' || rawPath === '' || rawPath === '/index') ? '/' : rawPath;
      setRedirectPath(path);
      setModalProps(options);
    }

    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  /* Expose for use outside React components (e.g. setTimeout callbacks) */
  window.__openAuthModal = openModal;

  const closeModal = function() {
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  const toggleMode = function() {
    setMode(function(prev) { return prev === 'login' ? 'signup' : 'login'; });
  };

  return React.createElement(AuthModalContext.Provider, {
    value: { isOpen, mode, redirectPath, modalProps, openModal, closeModal, toggleMode }
  }, children);
}

window.AuthModalContext = AuthModalContext;
window.AuthModalProvider = AuthModalProvider;
window.useAuthModal = function() { return React.useContext(AuthModalContext); };
