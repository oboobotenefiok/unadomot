// pages/profile/hooks/useSettings.js
function useSettings() {
  const [openDropdowns, setOpenDropdowns] = React.useState({
    support: false,
    legal: false,
    version: false
  });
  const [activePopup, setActivePopup] = React.useState(null);
  const [versionInfo, setVersionInfo] = React.useState({
    current: PROFILE_CONSTANTS.VERSION.CURRENT,
    latest: null,
    updateAvailable: false,
    checking: false
  });
  
  const toggleDropdown = React.useCallback((dropdownName) => {
    setOpenDropdowns(prev => {
      if (prev[dropdownName]) {
        return { support: false, legal: false, version: false };
      }
      return {
        support: dropdownName === 'support',
        legal: dropdownName === 'legal',
        version: dropdownName === 'version'
      };
    });
  }, []);
  
  const closeAllDropdowns = React.useCallback(() => {
    setOpenDropdowns({ support: false, legal: false, version: false });
  }, []);
  
  const openPopup = React.useCallback((popupName) => {
    setActivePopup(popupName);
    document.body.style.overflow = 'hidden';
  }, []);
  
  const closePopup = React.useCallback(() => {
    setActivePopup(null);
    document.body.style.overflow = 'unset';
  }, []);
  
  const checkForUpdates = React.useCallback(async () => {
    setVersionInfo(prev => ({ ...prev, checking: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const latestVersion = PROFILE_CONSTANTS.VERSION.LATEST;
      const current = versionInfo.current;
      
      setVersionInfo(prev => ({
        ...prev,
        latest: latestVersion,
        updateAvailable: latestVersion !== current,
        checking: false
      }));
    } catch (err) {
      setVersionInfo(prev => ({ ...prev, checking: false }));
    }
  }, [versionInfo.current]);
  
  return {
    openDropdowns,
    activePopup,
    versionInfo,
    toggleDropdown,
    closeAllDropdowns,
    openPopup,
    closePopup,
    checkForUpdates
  };
}

window.useSettings = useSettings;