// pages/home/components/map/MapGeolocation.js

window.useGeolocation = function(mapInstance, onLocationFound) {
  const [userLocation, setUserLocation] = React.useState(null);
  const [locationStatus, setLocationStatus] = React.useState('idle');
  const [locationError, setLocationError] = React.useState('');
  
  const getUserLocation = (showToast) => {
    setLocationStatus('loading');
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your browser');
      showToast?.('📍 GPS not supported on this device', 'error');
      return;
    }
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setUserLocation(location);
        setLocationStatus('success');
        
        if (mapInstance) {
          mapInstance.setView([location.lat, location.lng], 15);
          
          const userMarker = window.L.circleMarker([location.lat, location.lng], {
            radius: 8,
            color: '#3b82f6',
            weight: 2,
            fillColor: '#60a5fa',
            fillOpacity: 0.6,
            className: 'pulse-dot'
          }).addTo(mapInstance);
          
          userMarker.bindPopup(`
            <div class="text-center">
              <strong>You are here</strong><br/>
              <span class="text-[10px]">Accuracy: ±${Math.round(location.accuracy)}m</span>
            </div>
          `).openPopup();
        }
        
        if (onLocationFound) onLocationFound(location);
        showToast?.('📍 Found your location!', 'success');
      },
      (error) => {
        setLocationStatus('error');
        
        let userMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage = 'Please allow location access in your browser settings';
            break;
          case error.POSITION_UNAVAILABLE:
            userMessage = 'GPS signal not found. Try moving to an open area.';
            break;
          case error.TIMEOUT:
            userMessage = 'GPS taking too long. Check your connection and try again.';
            break;
          default:
            userMessage = 'Could not determine your location';
        }
        
        setLocationError(userMessage);
        showToast?.(`📍 Location error: ${userMessage}`, 'error');
        
      },
      options
    );
  };
  
  return {
    userLocation: userLocation,
    locationStatus: locationStatus,
    locationError: locationError,
    getUserLocation: getUserLocation
  };
};