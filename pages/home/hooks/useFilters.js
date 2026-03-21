// pages/home/hooks/useFilters.js
function useFilters(initialFilters = null) {
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState(
    initialFilters || HOME_CONSTANTS.DEFAULT_FILTERS
  );
  const [tempFilters, setTempFilters] = React.useState({ ...filters });
  const [availableLgas, setAvailableLgas] = React.useState([]);
  
  // Update LGAs when state changes
  React.useEffect(function() {
    if (tempFilters.state) {
      const s = (window.nigeriaStates || []).find(function(x) {
        return x.name === tempFilters.state;
      });
      setAvailableLgas(s ? s.lgas.map(lga => lga.name) : []);
      
      if (tempFilters.lga && s && !s.lgas.some(lga => lga.name === tempFilters.lga)) {
        setTempFilters(function(p) { return { ...p, lga: '' }; });
      }
    } else {
      setAvailableLgas([]);
    }
  }, [tempFilters.state, tempFilters.lga]);
  
  const activeFilterCount = React.useMemo(function() {
    let c = 0;
    if (filters.minPrice) c++;
    if (filters.maxPrice) c++;
    if (filters.state) c++;
    if (filters.lga) c++;
    if (filters.bedrooms) c++;
    if (filters.propertyType) c++;
    if (filters.furnishing) c++;
    if (filters.agentOnly) c++;
    if (filters.noAgentFees) c++;
    return c;
  }, [filters]);
  
  const openFilterModal = React.useCallback(function() {
    setTempFilters({ ...filters });
    setShowFilters(true);
    document.body.style.overflow = 'hidden';
  }, [filters]);
  
  const closeFilterModal = React.useCallback(function() {
    setShowFilters(false);
    document.body.style.overflow = 'unset';
  }, []);
  
  const applyFilters = React.useCallback(function() {
    setFilters({ ...tempFilters });
    closeFilterModal();
  }, [tempFilters, closeFilterModal]);
  
  const clearAllFilters = React.useCallback(function() {
    setTempFilters(HOME_CONSTANTS.DEFAULT_FILTERS);
  }, []);
  
  const updateFilter = React.useCallback(function(key, value) {
    setTempFilters(function(prev) {
      if (key === 'state') {
        return { ...prev, [key]: value, lga: '' };
      }
      if (key === 'agentOnly' && value) {
        return { ...prev, agentOnly: true, noAgentFees: false };
      }
      if (key === 'noAgentFees' && value) {
        return { ...prev, noAgentFees: true, agentOnly: false };
      }
      return { ...prev, [key]: value };
    });
  }, []);
  
  return {
    filters,
    setFilters,
    tempFilters,
    setTempFilters,
    showFilters,
    setShowFilters,
    availableLgas,
    activeFilterCount,
    openFilterModal,
    closeFilterModal,
    applyFilters,
    clearAllFilters,
    updateFilter
  };
}

window.useFilters = useFilters;