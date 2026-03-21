
const FormDraftContext = React.createContext({
  drafts: {},
  saveDraft: () => {},
  loadDraft: () => {},
  clearDraft: () => {},
  clearAllDrafts: () => {}
});

function FormDraftProvider({ children }) {
  const [drafts, setDrafts] = React.useState({});
  
  
  React.useEffect(() => {
    const loadedDrafts = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('draft_')) {
        try {
          loadedDrafts[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
        }
      }
    }
    setDrafts(loadedDrafts);
  }, []);
  
  
  const saveDraft = React.useCallback((key, data) => {
    const draftKey = `draft_${key}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
      setDrafts(prev => ({ ...prev, [draftKey]: data }));
      
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: draftKey,
        newValue: JSON.stringify(data)
      }));
    } catch (e) {
    }
  }, []);
  
  
  const loadDraft = React.useCallback((key) => {
    const draftKey = `draft_${key}`;
    return drafts[draftKey] || null;
  }, [drafts]);
  
  
  const clearDraft = React.useCallback((key) => {
    const draftKey = `draft_${key}`;
    localStorage.removeItem(draftKey);
    setDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[draftKey];
      return newDrafts;
    });
  }, []);
  
  
  const clearAllDrafts = React.useCallback(() => {
    Object.keys(drafts).forEach(key => {
      localStorage.removeItem(key);
    });
    setDrafts({});
  }, [drafts]);
  
  
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key?.startsWith('draft_')) {
        if (e.newValue) {
          try {
            setDrafts(prev => ({
              ...prev,
              [e.key]: JSON.parse(e.newValue)
            }));
          } catch (err) {
          }
        } else {
          setDrafts(prev => {
            const newDrafts = { ...prev };
            delete newDrafts[e.key];
            return newDrafts;
          });
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const value = {
    drafts,
    saveDraft,
    loadDraft,
    clearDraft,
    clearAllDrafts
  };
  
  return React.createElement(FormDraftContext.Provider, { value }, children);
}

window.FormDraftProvider = FormDraftProvider;
window.FormDraftContext = FormDraftContext;
window.useFormDraft = () => React.useContext(FormDraftContext);