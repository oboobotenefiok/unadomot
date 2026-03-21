
const AuthModalContext = React.createContext({
  isOpen: false,
  mode: 'login', 
  redirectPath: '/',
  openModal: (mode, redirectPath) => {},
  closeModal: () => {},
  toggleMode: () => {}
});

function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState('login'); 
  const [redirectPath, setRedirectPath] = React.useState('/');
  
  const openModal = (authMode = 'login', path = window.location.pathname) => {
    setMode(authMode);
    setRedirectPath(path);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };
  
  const closeModal = () => {
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };
  
  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
  };
  
  const value = {
    isOpen,
    mode,
    redirectPath,
    openModal,
    closeModal,
    toggleMode
  };
  
  return React.createElement(AuthModalContext.Provider, { value }, children);
}

window.AuthModalContext = AuthModalContext;
window.AuthModalProvider = AuthModalProvider;
window.useAuthModal = () => React.useContext(AuthModalContext);