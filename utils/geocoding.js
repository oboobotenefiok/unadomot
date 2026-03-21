// utils/geocoding.js - SIMPLE VERSION (only local dataset)
// Ready for LLM migration later

const GeocodingHelpers = {
  // Simple geocoding using only local dataset (nigeria-states.js)
  geocodeAddress: async (address, state, lga) => {
    if (!address || !state || !lga) {
      console.warn('Missing required fields for geocoding');
      return null;
    }
    
    
    
    // ONLY use local dataset (nigeria-states.js)
    if (window.nigeriaStates) {
      const stateData = window.nigeriaStates.find(s => s.name === state);
      if (stateData) {
        // Try to find LGA coordinates first (best accuracy)
        const lgaData = stateData.lgas?.find(l => l.name === lga);
        if (lgaData && lgaData.lat && lgaData.lng) {
          
          return {
            lat: lgaData.lat,
            lng: lgaData.lng,
            source: 'local',
            accuracy: 'lga-level'
          };
        }
        
        // Fallback to state coordinates
        if (stateData.lat && stateData.lng) {
          
          return {
            lat: stateData.lat,
            lng: stateData.lng,
            source: 'local',
            accuracy: 'state-level'
          };
        }
      }
    }
    
    // No coordinates found - return null
    
    return null;
  },
  
  // Batch geocode multiple addresses
  batchGeocode: async (addresses) => {
    const results = [];
    for (const addr of addresses) {
      const result = await GeocodingHelpers.geocodeAddress(addr.address, addr.state, addr.lga);
      results.push({ ...addr, ...result });
    }
    return results;
  },
  
  // Placeholder for future LLM integration
  migrateToLLM: function() {
    
    // When you're ready to add LLM, you'll replace this file
    // with your LLM-powered version
  }
};

window.GeocodingHelpers = GeocodingHelpers;
