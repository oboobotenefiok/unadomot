
function useRequireAuth() {
  const { openModal } = window.useAuthModal();
  const user = auth.currentUser;
  
  const requireAuth = (callback, mode = 'login') => {
    if (user) {
      return callback();
    } else {
      openModal(mode, window.location.pathname);
      return null;
    }
  };
  
  return requireAuth;
}

window.useRequireAuth = useRequireAuth;