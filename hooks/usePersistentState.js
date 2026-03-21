// hooks/usePersistentState.js
// Simple hook for persisting state in sessionStorage

function usePersistentState(key, initialState) {
  
  const [state, setState] = React.useState(() => {
    try {
      const saved = sessionStorage.getItem(`persist_${key}`);
      return saved ? JSON.parse(saved) : initialState;
    } catch (e) {
      return initialState;
    }
  });
  
  
  React.useEffect(() => {
    try {
      sessionStorage.setItem(`persist_${key}`, JSON.stringify(state));
    } catch (e) {
    }
  }, [key, state]);
  
  return [state, setState];
}

window.usePersistentState = usePersistentState;