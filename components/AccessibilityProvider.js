

function AccessibilityProvider({ children }) {
  
  const [settings, setSettings] = React.useState({
    fontSize: localStorage.getItem('a11y-fontSize') || 'normal',
    highContrast: localStorage.getItem('a11y-highContrast') === 'true',
    reduceMotion: localStorage.getItem('a11y-reduceMotion') === 'true',
    dyslexicFont: localStorage.getItem('a11y-dyslexicFont') === 'true',
    showLinks: localStorage.getItem('a11y-showLinks') === 'true',
    darkMode: localStorage.getItem('darkMode') === 'true'
  });

  
  const updateSetting = React.useCallback((key, value) => {
    setSettings(prev => {
      if (prev[key] === value) return prev;
      
      const newSettings = { ...prev, [key]: value };
      
      
      Object.entries(newSettings).forEach(([k, v]) => {
        localStorage.setItem(k === 'darkMode' ? 'darkMode' : `a11y-${k}`, v);
      });
      
      return newSettings;
    });
  }, []);

  
  React.useEffect(() => {
    
    document.body.classList.remove(
      'text-small', 'text-normal', 'text-large', 'text-x-large',
      'high-contrast', 'reduce-motion', 'dyslexic-font', 'show-links',
      'dark-mode'
    );
    
    
    document.body.classList.add(`text-${settings.fontSize}`);
    
    
    if (settings.highContrast) document.body.classList.add('high-contrast');
    if (settings.reduceMotion) document.body.classList.add('reduce-motion');
    if (settings.dyslexicFont) document.body.classList.add('dyslexic-font');
    if (settings.showLinks) document.body.classList.add('show-links');
    if (settings.darkMode) document.body.classList.add('dark-mode');
    
  }, [settings]); 

  
  const resetSettings = React.useCallback(() => {
    const defaultSettings = {
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,
      dyslexicFont: false,
      showLinks: false,
      darkMode: false
    };
    
    setSettings(defaultSettings);
    
    
    Object.keys(defaultSettings).forEach(key => {
      localStorage.removeItem(key === 'darkMode' ? 'darkMode' : `a11y-${key}`);
    });
  }, []);

  
  const contextValue = React.useMemo(() => ({
    settings,
    updateSetting,
    resetSettings
  }), [settings, updateSetting, resetSettings]);

  return React.createElement(
    AccessibilityContext.Provider,
    { value: contextValue },
    children
  );
}

window.AccessibilityProvider = AccessibilityProvider;