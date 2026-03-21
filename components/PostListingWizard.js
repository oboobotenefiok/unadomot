// components/PostListingWizard.js - With Email Verification Check
// Listings go to pending_review for admin approval

function PostListingWizard({ modal = false, onSuccess, onClose, listingId = null }) {
  const user = auth.currentUser;
  const { openModal } = window.useAuthModal();
  
  // ===== USE VERIFICATION HOOK =====
  const { checkVerification, resendVerification } = window.useVerification?.() || {
    checkVerification: () => true,
    resendVerification: async () => false
  };
  
  const [showVerificationWarning, setShowVerificationWarning] = React.useState(false);

  const CLOUD_NAME = 'djddnda47';
  const UPLOAD_PRESET = 'unadomot';
  const CLOUDINARY_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 4; // Basic Info, Location, Details, Photos
  
  const [form, setForm] = React.useState({
    title:       '',
    description: '',
    price:       '',
    address:     '',
    state:       '',
    lga:         '',
    propertyType:'',
    bedrooms:    '',
    bathrooms:   '',
    size:        '',
    furnishing:  ''
  });
  
  // Coordinates state
  const [coordinates, setCoordinates] = React.useState(null);
  const [geocodingStatus, setGeocodingStatus] = React.useState(null); // 'loading', 'success', 'error'
  const [geocodingSource, setGeocodingSource] = React.useState(null); // which service worked
  const [geocodingMessage, setGeocodingMessage] = React.useState(''); // user-friendly message
  const [geocodingAccuracy, setGeocodingAccuracy] = React.useState(null); // 'lga-level', 'state-level', 'precise'
  
  const [existingImages, setExistingImages] = React.useState([]);
  const [uploadingImages, setUploadingImages] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [warnings, setWarnings] = React.useState({});
  const [shakeFields, setShakeFields] = React.useState({}); // Track which fields should shake
  const [lgas, setLgas] = React.useState([]);
  const [lgasList, setLgasList] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [touched, setTouched] = React.useState({});
  const [loading, setLoading] = React.useState(!!listingId);
  const [notFound, setNotFound] = React.useState(false);
  const [forbidden, setForbidden] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [cloudinaryLoaded, setCloudinaryLoaded] = React.useState(false);
  
  const [currentUserData, setCurrentUserData] = React.useState(null);

  React.useEffect(function() {
    if (!user && modal) {
      openModal('signup', listingId ? '/edit/' + listingId : '/post');
      if (onClose) onClose();
    }
  }, [user, modal, openModal, onClose, listingId]);

  React.useEffect(function() {
    if (document.querySelector('script[src*="cloudinary"]')) {
      setCloudinaryLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Cloudinary Widget loaded');
      setCloudinaryLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load Cloudinary Widget');
    };
    document.head.appendChild(script);
  }, []);

  React.useEffect(function() {
    if (!user) return;
    
    const fetchUserData = async () => {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setCurrentUserData(data);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, [user]);

  React.useEffect(function() {
    if (!listingId || !user) return;

    async function loadListing() {
      setLoading(true);
      setLoadError('');
      
      try {
        const doc = await db.collection('listings').doc(listingId).get();

        if (!doc.exists) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = doc.data();

        if (data.userId !== user.uid) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        setForm({
          title:        data.title        || '',
          description:  data.description  || '',
          price:        data.price != null ? String(data.price) : '',
          address:      data.address      || '',
          state:        data.state        || '',
          lga:          data.lga          || '',
          propertyType: data.propertyType || '',
          bedrooms:     data.bedrooms     || '',
          bathrooms:    data.bathrooms    || '',
          size:         data.size         || '',
          furnishing:   data.furnishing   || ''
        });

        // Load coordinates if they exist
        if (data.lat && data.lng) {
          setCoordinates({ lat: data.lat, lng: data.lng });
          setGeocodingStatus('success');
          setGeocodingSource(data.geocodeSource || 'existing');
          setGeocodingAccuracy(data.geocodeAccuracy || null);
        }

        setExistingImages(data.images || []);
        setLoading(false);

      } catch (err) {
        console.error('Error loading listing for edit:', err);
        setLoadError('Failed to load listing. Please try again.');
        setLoading(false);
      }
    }

    loadListing();
  }, [listingId, user]);

  // Handle state selection and LGA loading
  React.useEffect(function() {
    if (form.state) {
      const stateData = window.nigeriaStates?.find(function(s) { return s.name === form.state; });
      
      setLgas(stateData ? stateData.lgas : []);
      
      const lgaNames = stateData ? stateData.lgas.map(lga => lga.name) : [];
      setLgasList(lgaNames);
      
      if (form.lga && stateData) {
        const isValid = stateData.lgas.some(lga => lga.name === form.lga);
        if (!isValid) {
          setForm(function(prev) { return { ...prev, lga: '' }; });
        }
      }
    } else {
      setLgas([]);
      setLgasList([]);
    }
  }, [form.state]);

  // Trigger shake animation for a field
  function triggerShake(field) {
    setShakeFields(prev => ({ ...prev, [field]: true }));
    // Remove shake after animation completes
    setTimeout(() => {
      setShakeFields(prev => ({ ...prev, [field]: false }));
    }, 500);
  }

  function handleChange(field) {
    return function(e) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm(function(prev) { return { ...prev, [field]: value }; });
      
      // Clear error when user types
      if (errors[field]) {
        setErrors(function(prev) { return { ...prev, [field]: null }; });
      }
      
      // Generate friendly warning when user types (only if field has value)
      if (value) {
        const warning = getFriendlyWarning(field, value);
        setWarnings(prev => ({ ...prev, [field]: warning }));
      } else {
        setWarnings(prev => ({ ...prev, [field]: null }));
      }
      
      // Clear geocoding status when address fields change
      if (field === 'address' || field === 'state' || field === 'lga') {
        setGeocodingStatus(null);
        setGeocodingSource(null);
        setGeocodingMessage('');
        setGeocodingAccuracy(null);
      }
    };
  }

  function handleBlur(field) {
    return function() {
      setTouched(prev => ({ ...prev, [field]: true }));
      
      // Check if field is required and empty
      const requiredFields = ['title', 'description', 'price', 'address', 'state', 'lga', 'propertyType', 'bedrooms', 'bathrooms', 'furnishing'];
      if (requiredFields.includes(field) && !form[field]) {
        setErrors(prev => ({ ...prev, [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` }));
        triggerShake(field);
      } else {
        const error = validateField(field, form[field]);
        if (error) {
          setErrors(prev => ({ ...prev, [field]: error }));
          triggerShake(field);
        } else if (form[field]) {
          // If no error, show friendly warning
          const warning = getFriendlyWarning(field, form[field]);
          setWarnings(prev => ({ ...prev, [field]: warning }));
        }
      }
      
      // Auto-geocode when user finishes LGA field
      if (field === 'lga' && form.address && form.state && form.lga && !coordinates) {
        geocodeCurrentAddress();
      }
    };
  }

  // Generate user-friendly warnings for each field
  function getFriendlyWarning(field, value) {
    if (!value) return null;
    
    switch(field) {
      case 'title':
        if (value.length < 10) return '💡 Tip: A more descriptive title gets more views';
        if (value.length > 80) return '📝 Tip: Try to keep titles concise for better visibility';
        return null;
        
      case 'description':
        if (value.length < 50) return '💡 Tip: Add more details about the property condition, neighborhood, and unique features';
        if (value.length < 100) return '👍 Good start! Adding amenities and nearby attractions helps tenants decide';
        if (value.length > 3000) return '📝 Your description is quite long - consider breaking it into paragraphs';
        return null;
        
      case 'price':
        const numPrice = Number(value);
        if (numPrice < 5000) return '💰 This seems very low for Nigerian rent - double-check the amount';
        if (numPrice > 1000000 && !form.bedrooms) return '💡 For high-value properties, detailed bedroom info helps attract serious tenants';
        if (numPrice > 5000000) return '🏠 Premium property! Consider highlighting luxury features in your description';
        return null;
        
      case 'address':
        if (value.length < 10) return '📍 Include street name and landmark for easier location';
        if (!value.includes(',')) return '📍 Consider adding neighborhood or landmark after a comma';
        return null;
        
      case 'state':
        if (value && !form.lga) return '🗺️ Don\'t forget to select the Local Government Area';
        return null;
        
      case 'lga':
        if (value && form.state) return '📍 Great! Your listing will be shown to people searching in ' + value;
        return null;
        
      case 'propertyType':
        if (value === 'Self Contain') return '🏠 Self-contain is popular with singles and students';
        if (value === 'Apartment') return '🏢 Apartments are great for families and professionals';
        if (value === 'Duplex') return '🏡 Duplexes attract families looking for more space';
        return null;
        
      case 'bedrooms':
        if (value === 'Self-contain') return '🛏️ Self-contain means bedroom with private bath - perfect for singles';
        if (value === '1') return '🛏️ 1-bedroom units are ideal for couples or single professionals';
        if (value === '2' || value === '3') return '👪 This size is popular with small to medium families';
        if (value === '4' || value === '5+') return '🏠 Large family home - mention if compound or estate';
        return null;
        
      case 'bathrooms':
        if (value === '1' && form.bedrooms === 'Self-contain') return '🚿 Standard for self-contain';
        if (Number(value) < Number(form.bedrooms) && form.bedrooms && !isNaN(Number(form.bedrooms))) {
          return '💡 Properties with at least as many bathrooms as bedrooms are highly sought after';
        }
        if (Number(value) > Number(form.bedrooms) && form.bedrooms && !isNaN(Number(form.bedrooms))) {
          return '✨ Extra bathrooms are a great selling point!';
        }
        return null;
        
      case 'furnishing':
        if (value === 'Furnished') return '🛋️ Furnished properties rent faster - mention what\'s included';
        if (value === 'Semi-furnished') return '🪑 List the major furniture items in your description';
        if (value === 'Unfurnished') return '🏺 Many tenants prefer unfurnished to use their own furniture';
        return null;
        
      case 'size':
        if (value && Number(value) < 30) return '📐 Compact space - ideal for singles or students';
        if (value && Number(value) > 200) return '🏰 Spacious property! Emphasize the room sizes in description';
        return null;
        
      default:
        return null;
    }
  }

  function removeExistingImage(index) {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  }

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return data.public_id;
  };

  const openCloudinaryWidget = () => {
    if (!cloudinaryLoaded) {
      alert('Loading uploader... Please try again in a moment.');
      return;
    }
    
    if (existingImages.length >= 5) {
      alert('Maximum 5 photos allowed');
      return;
    }
    
    const cloudinaryApi = window.cloudinary || window.CloudinaryWidget || window.Cloudinary;
    
    if (!cloudinaryApi || typeof cloudinaryApi.createUploadWidget !== 'function') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length + existingImages.length > 5) {
          alert(`Maximum 5 photos total. You have ${existingImages.length} already.`);
          document.body.removeChild(input);
          return;
        }
        
        setUploadingImages(true);
        
        for (const file of files) {
          try {
            const publicId = await uploadToCloudinary(file);
            setExistingImages(prev => [...prev, publicId]);
          } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload: ' + err.message);
          }
        }
        
        setUploadingImages(false);
        document.body.removeChild(input);
      };
      
      input.click();
      return;
    }
    
    setUploadingImages(true);
    
    const widget = cloudinaryApi.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 5 - existingImages.length,
        maxFileSize: 10000000,
        folder: 'unadomot/listings',
        showPoweredBy: false,
        text: {
          en: {
            or: "",
            drop: "Select photos",
            local: { browse: "Choose from gallery" }
          }
        },
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#14532d",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#14532d",
            action: "#14532d",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#14532d",
            complete: "#20B832",
            sourceBg: "#E4EDF2"
          }
        }
      },
      (error, result) => {
        if (error) {
          console.error('❌ Widget error:', error);
          setUploadingImages(false);
          alert('Upload failed: ' + (error.message || 'Unknown error'));
          return;
        }
        
        if (result.event === 'success') {
          const publicId = result.info.public_id;
          setExistingImages(prev => [...prev, publicId]);
        }
        
        if (result.event === 'close' || result.event === 'queues-end') {
          setUploadingImages(false);
        }
      }
    );
    
    if (widget && widget.open) {
      widget.open();
    } else {
      alert('Failed to open upload widget');
      setUploadingImages(false);
    }
  };

  const getImageUrl = (publicId, transformation = '') => {
    return `${CLOUDINARY_URL}${transformation}/${publicId}`;
  };

  function validateField(field, value) {
    // First check if it's a required field and empty
    const requiredFields = ['title', 'description', 'price', 'address', 'state', 'lga', 'propertyType', 'bedrooms', 'bathrooms', 'furnishing'];
    if (requiredFields.includes(field) && !value) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    
    switch(field) {
      case 'title':
        if (value.trim().length < 5) return 'Title must be at least 5 characters';
        if (value.trim().length > 100) return 'Title is too long (max 100)';
        break;
      case 'description':
        if (value.trim().length < 20) return 'Description must be at least 20 characters';
        if (value.trim().length > 5000) return 'Description is too long';
        break;
      case 'price':
        if (isNaN(Number(value))) return 'Enter a valid number';
        if (Number(value) < 1000) return 'Price must be at least ₦1,000';
        if (Number(value) > 100000000) return 'Price cannot exceed ₦100,000,000';
        break;
      case 'address':
        if (value.trim().length < 5) return 'Address must be at least 5 characters';
        break;
    }
    return null;
  }

  function validateStep(step) {
    const stepErrors = {};
    let hasErrors = false;
    
    if (step === 1) {
      // Title validation
      if (!form.title.trim()) {
        stepErrors.title = 'Title is required';
        triggerShake('title');
        hasErrors = true;
      } else if (form.title.trim().length < 5) {
        stepErrors.title = 'Title must be at least 5 characters';
        triggerShake('title');
        hasErrors = true;
      }
      
      // Price validation
      if (!form.price) {
        stepErrors.price = 'Price is required';
        triggerShake('price');
        hasErrors = true;
      } else if (isNaN(Number(form.price))) {
        stepErrors.price = 'Enter a valid number';
        triggerShake('price');
        hasErrors = true;
      } else if (Number(form.price) < 1000) {
        stepErrors.price = 'Price must be at least ₦1,000';
        triggerShake('price');
        hasErrors = true;
      }
    }
    else if (step === 2) {
      if (!form.address.trim()) {
        stepErrors.address = 'Address is required';
        triggerShake('address');
        hasErrors = true;
      }
      if (!form.state) {
        stepErrors.state = 'Please select a state';
        triggerShake('state');
        hasErrors = true;
      }
      if (!form.lga) {
        stepErrors.lga = 'Please select an LGA';
        triggerShake('lga');
        hasErrors = true;
      }
    }
    else if (step === 3) {
      if (!form.propertyType) {
        stepErrors.propertyType = 'Please select property type';
        triggerShake('propertyType');
        hasErrors = true;
      }
      if (!form.bedrooms) {
        stepErrors.bedrooms = 'Please select number of bedrooms';
        triggerShake('bedrooms');
        hasErrors = true;
      }
      if (!form.bathrooms) {
        stepErrors.bathrooms = 'Please select number of bathrooms';
        triggerShake('bathrooms');
        hasErrors = true;
      }
      if (!form.furnishing) {
        stepErrors.furnishing = 'Please select furnishing status';
        triggerShake('furnishing');
        hasErrors = true;
      }
    }
    else if (step === 4) {
      if (existingImages.length === 0) {
        stepErrors.images = 'Please add at least one photo';
        // Visual feedback for photos section
        const photosSection = document.querySelector('.photos-section');
        if (photosSection) {
          photosSection.classList.add('shake', 'border-red-500', 'border', 'rounded-lg', 'p-2');
          setTimeout(() => {
            photosSection.classList.remove('shake', 'border-red-500', 'border', 'rounded-lg', 'p-2');
          }, 500);
        }
        hasErrors = true;
      }
    }
    
    setErrors(prev => ({ ...prev, ...stepErrors }));
    
    // Mark all fields in this step as touched to show errors
    if (step === 1) {
      setTouched(prev => ({ ...prev, title: true, price: true }));
    } else if (step === 2) {
      setTouched(prev => ({ ...prev, address: true, state: true, lga: true }));
    } else if (step === 3) {
      setTouched(prev => ({ ...prev, propertyType: true, bedrooms: true, bathrooms: true, furnishing: true, description: true }));
    }
    
    // If there are errors, scroll to the first error
    if (hasErrors) {
      const firstErrorField = Object.keys(stepErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    return !hasErrors;
  }

  function goToNextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }

  function goToPrevStep() {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }

  // ===== Get coordinates from local nigeria-states.js =====
  const getLocalCoordinates = (lga, state) => {
    if (!window.nigeriaStates) {
      console.warn('⚠️ nigeriaStates not loaded');
      return null;
    }
    
    const stateData = window.nigeriaStates.find(s => s.name === state);
    if (!stateData) {
      console.warn(`⚠️ State not found: ${state}`);
      return null;
    }
    
    if (lga) {
      const lgaData = stateData.lgas?.find(l => l.name === lga);
      if (lgaData && lgaData.lat && lgaData.lng) {
        return {
          lat: lgaData.lat,
          lng: lgaData.lng,
          source: 'local',
          accuracy: 'lga-level'
        };
      }
    }
    
    if (stateData.lat && stateData.lng) {
      return {
        lat: stateData.lat,
        lng: stateData.lng,
        source: 'local',
        accuracy: 'state-level'
      };
    }
    
    return null;
  };

  // ===== Geocoding function with local only =====
  async function geocodeCurrentAddress() {
    if (!form.address || !form.state || !form.lga) {
      setGeocodingMessage('Please fill in address, state, and LGA first');
      return null;
    }

    setGeocodingStatus('loading');
    setGeocodingSource(null);
    setGeocodingAccuracy(null);
    setGeocodingMessage('Searching for coordinates...');
    
    try {
      // ONLY use local coordinates from nigeria-states.js
      const localCoords = getLocalCoordinates(form.lga, form.state);
      
      if (localCoords) {
        setCoordinates(localCoords);
        setGeocodingStatus('success');
        setGeocodingSource(localCoords.source);
        setGeocodingAccuracy(localCoords.accuracy);
        
        let accuracyMsg = localCoords.accuracy === 'lga-level' 
          ? '✓ Location found (LGA center)'
          : '✓ Location found (State center)';
        setGeocodingMessage(accuracyMsg);
        
        const toastEvent = new CustomEvent('show-toast', {
          detail: { message: `📍 ${accuracyMsg}`, type: 'success' }
        });
        window.dispatchEvent(toastEvent);
        
        return localCoords;
      } else {
        setGeocodingStatus('error');
        setGeocodingMessage('⚠ Could not find coordinates. Listing will save without map pin.');
        
        const toastEvent = new CustomEvent('show-toast', {
          detail: { message: '⚠ Location not found - listing will save without map pin', type: 'warning' }
        });
        window.dispatchEvent(toastEvent);
        
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingStatus('error');
      setGeocodingMessage('⚠ Geocoding service error. Try again later.');
      return null;
    }
  }

  // Manual retry geocoding
  async function handleRetryGeocode() {
    setCoordinates(null);
    await geocodeCurrentAddress();
  }

  // ===== UPDATED: Use centralized resend function =====
  const handleResendVerification = async function() {
    const success = await resendVerification(auth.currentUser);
    if (success) {
      ToastHelpers?.success('Verification email sent! Please check your inbox.');
    } else {
      ToastHelpers?.error('Failed to send verification email. Please try again.');
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    const currentUser = auth.currentUser;
    if (!currentUser) { 
      openModal('signup', listingId ? '/edit/' + listingId : '/post'); 
      return; 
    }
    
    // ===== UPDATED: Use centralized verification check =====
    if (!checkVerification(currentUser, 'post listings')) {
      setShowVerificationWarning(true);
      setTimeout(() => setShowVerificationWarning(false), 5000);
      return;
    }
    
    // Validate all steps
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // Geocode address if we don't have coordinates yet
      let finalCoordinates = coordinates;
      if (!finalCoordinates && form.address && form.state && form.lga) {
        finalCoordinates = await geocodeCurrentAddress();
      }

      const sanitize = ValidationHelpers?.sanitizeInput || (function(v) { return v; });

      const listingData = {
        title:       sanitize(form.title.trim(), 'text'),
        description: sanitize(form.description.trim(), 'text'),
        price:       Number(form.price),
        address:     sanitize(form.address.trim(), 'address'),
        state:       form.state,
        lga:         form.lga,
        propertyType: form.propertyType,
        bedrooms:    form.bedrooms,
        bathrooms:   form.bathrooms,
        furnishing:  form.furnishing,
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
      };

      // Add coordinates if available
      if (finalCoordinates) {
        listingData.lat = finalCoordinates.lat;
        listingData.lng = finalCoordinates.lng;
        listingData.geocodedAt = firebase.firestore.FieldValue.serverTimestamp();
        listingData.geocodeSource = finalCoordinates.source || null;
        listingData.geocodeAccuracy = finalCoordinates.accuracy || null;
      }

      if (form.size) listingData.size = form.size;
      listingData.images = existingImages;
      
      if (listingId) {
        // ===== EDIT: Keep existing status (don't change to pending) =====
        await db.collection('listings').doc(listingId).update(listingData);
        
        if (window.AppCache) {
          AppCache.clear('listings', listingId);
        }
        
        // Notify user that edits are submitted for review
        const notificationRef = db.collection('users').doc(currentUser.uid)
          .collection('notifications').doc();
        await notificationRef.set({
          type: 'listing_updated',
          title: 'Listing Updated ✏️',
          body: `Your listing "${listingData.title}" has been updated and is pending admin review.`,
          listingId: listingId,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
      } else {
        // ===== NEW LISTING: Set status to pending_review =====
        listingData.userId = currentUser.uid;
        listingData.userName = currentUser.displayName || 'Property Owner';
        listingData.userType = currentUserData?.userType || 'user';
        
        if (currentUserData?.username) {
          listingData.userUsername = currentUserData.username;
        }
        
        // ===== CHANGED: New listings go to pending_review =====
        listingData.status = 'pending_review';
        listingData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        try {
          if (!window.IDGenerator) {
            throw new Error('IDGenerator not available');
          }
          
          const shortCode = await window.IDGenerator.generateUniqueListingCode();
          listingData.shortCode = shortCode;
          
        } catch (codeErr) {
          console.error('Error generating short code:', codeErr);
          setSubmitError('Failed to generate unique listing code. Please try again.');
          setSubmitting(false);
          return;
        }
        
        const docRef = await db.collection('listings').add(listingData);
        
        // Notify user that listing is pending review
        const notificationRef = db.collection('users').doc(currentUser.uid)
          .collection('notifications').doc();
        await notificationRef.set({
          type: 'listing_submitted',
          title: 'Listing Submitted for Review 📋',
          body: `Your listing "${listingData.title}" has been submitted and is pending admin approval. You'll be notified once it's live.`,
          listingId: docRef.id,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      if (onSuccess) {
        onSuccess(listingId);
      }

    } catch (err) {
      console.error('❌ Error saving listing:', err);
      setSubmitError(err.message || 'Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function inputClass(field) {
    const hasError = errors[field];
    const shouldShake = shakeFields[field];
    return `w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-950 focus:border-transparent 
      ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}
      ${shouldShake ? 'shake' : ''}`;
  }

  // Add shake animation CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }
      .shake {
        animation: shake 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const stepTitles = {
    1: 'Basic Info',
    2: 'Location',
    3: 'Details',
    4: 'Photos'
  };

  if (loading) {
    return React.createElement('div', { className: 'p-8 text-center' },
      React.createElement('div', { className: 'loading-spinner mx-auto mb-4' }),
      React.createElement('p', { className: 'text-gray-600' }, 'Loading listing...')
    );
  }

  if (loadError) {
    return React.createElement('div', { className: 'p-8 text-center' },
      React.createElement('div', { className: 'text-5xl mb-4' }, '❌'),
      React.createElement('h3', { className: 'font-bold text-lg mb-2' }, 'Error Loading Listing'),
      React.createElement('p', { className: 'text-gray-600 mb-4' }, loadError),
      React.createElement('button', {
        onClick: onClose,
        className: 'bg-green-950 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition'
      }, 'Close')
    );
  }

  if (notFound) {
    return React.createElement('div', { className: 'p-8 text-center' },
      React.createElement('div', { className: 'text-6xl mb-4' }, '😕'),
      React.createElement('h3', { className: 'font-bold text-lg mb-2' }, 'Listing Not Found'),
      React.createElement('p', { className: 'text-gray-600 mb-4' }, 'This listing does not exist or has been removed.'),
      React.createElement('button', {
        onClick: onClose,
        className: 'bg-green-950 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition'
      }, 'Close')
    );
  }

  if (forbidden) {
    return React.createElement('div', { className: 'p-8 text-center' },
      React.createElement('div', { className: 'text-6xl mb-4' }, '🔒'),
      React.createElement('h3', { className: 'font-bold text-lg mb-2' }, 'Not Authorised'),
      React.createElement('p', { className: 'text-gray-600 mb-4' }, 'You can only edit your own listings.'),
      React.createElement('button', {
        onClick: onClose,
        className: 'bg-green-950 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition'
      }, 'Close')
    );
  }

  if (!user && modal) return null;

  const modalTitle = listingId ? 'Edit Listing' : 'Post a Listing';
  const submitButtonText = submitting 
    ? (listingId ? 'Saving...' : 'Submitting...') 
    : (listingId ? 'Save Changes' : 'Submit for Review');

  function renderStep() {
    switch(currentStep) {
      case 1: return React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Title *'),
          React.createElement('input', {
            type: 'text',
            value: form.title,
            onChange: handleChange('title'),
            onBlur: handleBlur('title'),
            placeholder: 'e.g., 3-Bedroom Flat in Ikeja',
            className: inputClass('title'),
            maxLength: 100,
            name: 'title',
            id: 'title'
          }),
          errors.title && 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.title),
          warnings.title && !errors.title && form.title && 
            React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
              React.createElement('span', null, warnings.title)
            )
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Monthly Rent (₦) *'),
          React.createElement('input', {
            type: 'number',
            value: form.price,
            onChange: handleChange('price'),
            onBlur: handleBlur('price'),
            placeholder: '150000',
            min: '1000',
            className: inputClass('price'),
            name: 'price',
            id: 'price'
          }),
          errors.price ? 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.price) :
            React.createElement('p', { className: 'text-xs text-gray-400 mt-1' }, 'Min ₦1,000'),
          warnings.price && !errors.price && form.price && 
            React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
              React.createElement('span', null, warnings.price)
            )
        )
      );

      // ===== SIMPLE STEP 2 - NO AUTOCOMPLETE =====
      case 2: return React.createElement('div', { className: 'space-y-3' },
        // Simple address input (no autocomplete)
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Address *'),
          React.createElement('input', {
            type: 'text',
            value: form.address,
            onChange: handleChange('address'),
            onBlur: handleBlur('address'),
            placeholder: 'Street, building, landmark',
            className: inputClass('address'),
            name: 'address',
            id: 'address'
          }),
          errors.address && 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.address),
          warnings.address && !errors.address && form.address && 
            React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
              React.createElement('span', null, warnings.address)
            )
        ),
        
        // State and LGA dropdowns
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'State *'),
            React.createElement('select', {
              value: form.state,
              onChange: handleChange('state'),
              onBlur: handleBlur('state'),
              className: inputClass('state'),
              name: 'state',
              id: 'state'
            },
              React.createElement('option', { value: '' }, 'Select'),
              (window.nigeriaStates || []).map(function(s) {
                return React.createElement('option', { key: s.name, value: s.name }, s.name);
              })
            ),
            errors.state && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.state),
            warnings.state && !errors.state && form.state && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.state)
              )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'LGA *'),
            React.createElement('select', {
              value: form.lga,
              onChange: handleChange('lga'),
              onBlur: handleBlur('lga'),
              disabled: !form.state,
              className: inputClass('lga') + (!form.state ? ' bg-gray-100 cursor-not-allowed' : ''),
              name: 'lga',
              id: 'lga'
            },
              React.createElement('option', { value: '' }, 'Select'),
              lgasList.map(function(lga) {
                return React.createElement('option', { key: lga, value: lga }, lga);
              })
            ),
            errors.lga && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.lga),
            warnings.lga && !errors.lga && form.lga && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.lga)
              )
          )
        ),

        // Geocoding status section
        (form.address && form.state && form.lga) && React.createElement('div', { 
          className: 'mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200' 
        },
          React.createElement('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
            React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
              geocodingStatus === 'loading' ? 
                React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'w-4 h-4 border-2 border-green-950 border-t-transparent rounded-full animate-spin' }),
                  React.createElement('span', { className: 'text-xs text-gray-600' }, geocodingMessage || 'Finding coordinates...')
                ) : 
              geocodingStatus === 'success' ?
                React.createElement(React.Fragment, null,
                  React.createElement('span', { className: 'text-green-600' }, '✓'),
                  React.createElement('span', { className: 'text-xs text-green-700 font-medium' }, geocodingMessage || 'Location found'),
                  geocodingSource && React.createElement('span', { className: 'text-xs text-gray-400 ml-1' },
                    `(via ${geocodingSource})`
                  ),
                  geocodingAccuracy && React.createElement('span', { 
                    className: `text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${
                      geocodingAccuracy === 'lga-level' ? 'bg-green-100 text-green-700' : 
                      geocodingAccuracy === 'state-level' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-blue-100 text-blue-700'
                    }` 
                  },
                    geocodingAccuracy === 'lga-level' ? 'LGA center' :
                    geocodingAccuracy === 'state-level' ? 'State center' : 'Precise'
                  )
                ) :
              geocodingStatus === 'error' ?
                React.createElement(React.Fragment, null,
                  React.createElement('span', { className: 'text-amber-600' }, '⚠'),
                  React.createElement('span', { className: 'text-xs text-amber-700' }, geocodingMessage || 'Could not get coordinates')
                ) :
                React.createElement('span', { className: 'text-xs text-gray-500' },
                  '📍 Coordinates will be fetched automatically'
                )
            ),
            
            geocodingStatus === 'error' && !coordinates &&
              React.createElement('button', {
                type: 'button',
                onClick: handleRetryGeocode,
                className: 'text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition'
              }, 'Retry')
          ),
          
          coordinates && React.createElement('div', { className: 'mt-2 text-xs text-gray-500 bg-white p-2 rounded border border-gray-100' },
            React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
              React.createElement('span', { className: 'font-mono' },
                `📍 ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
              )
            )
          )
        )
      );

      case 3: return React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Type *'),
            React.createElement('select', {
              value: form.propertyType,
              onChange: handleChange('propertyType'),
              onBlur: handleBlur('propertyType'),
              className: inputClass('propertyType'),
              name: 'propertyType',
              id: 'propertyType'
            },
              React.createElement('option', { value: '' }, 'Select'),
              ['Apartment', 'House', 'Self Contain', 'Room', 'Duplex'].map(function(t) {
                return React.createElement('option', { key: t, value: t }, t);
              })
            ),
            errors.propertyType && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.propertyType),
            warnings.propertyType && !errors.propertyType && form.propertyType && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.propertyType)
              )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Bedrooms *'),
            React.createElement('select', {
              value: form.bedrooms,
              onChange: handleChange('bedrooms'),
              onBlur: handleBlur('bedrooms'),
              className: inputClass('bedrooms'),
              name: 'bedrooms',
              id: 'bedrooms'
            },
              React.createElement('option', { value: '' }, 'Select'),
              ['Self-contain', '1', '2', '3', '4', '5+'].map(function(b) {
                return React.createElement('option', { key: b, value: b }, b);
              })
            ),
            errors.bedrooms && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.bedrooms),
            warnings.bedrooms && !errors.bedrooms && form.bedrooms && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.bedrooms)
              )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Bathrooms *'),
            React.createElement('select', {
              value: form.bathrooms,
              onChange: handleChange('bathrooms'),
              onBlur: handleBlur('bathrooms'),
              className: inputClass('bathrooms'),
              name: 'bathrooms',
              id: 'bathrooms'
            },
              React.createElement('option', { value: '' }, 'Select'),
              ['1', '2', '3', '4', '5+'].map(function(b) {
                return React.createElement('option', { key: b, value: b }, b);
              })
            ),
            errors.bathrooms && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.bathrooms),
            warnings.bathrooms && !errors.bathrooms && form.bathrooms && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.bathrooms)
              )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Furnishing *'),
            React.createElement('select', {
              value: form.furnishing,
              onChange: handleChange('furnishing'),
              onBlur: handleBlur('furnishing'),
              className: inputClass('furnishing'),
              name: 'furnishing',
              id: 'furnishing'
            },
              React.createElement('option', { value: '' }, 'Select'),
              ['Furnished', 'Semi-furnished', 'Unfurnished'].map(function(f) {
                return React.createElement('option', { key: f, value: f }, f);
              })
            ),
            errors.furnishing && 
              React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.furnishing),
            warnings.furnishing && !errors.furnishing && form.furnishing && 
              React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
                React.createElement('span', null, warnings.furnishing)
              )
          )
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Size (sqm)'),
          React.createElement('input', {
            type: 'text',
            value: form.size,
            onChange: handleChange('size'),
            onBlur: handleBlur('size'),
            placeholder: 'e.g., 120',
            className: 'w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-950',
            name: 'size',
            id: 'size'
          }),
          warnings.size && form.size && 
            React.createElement('p', { className: 'text-blue-600 text-xs mt-1 flex items-center gap-1' },
              React.createElement('span', null, warnings.size)
            )
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Description *'),
          React.createElement('textarea', {
            value: form.description,
            onChange: handleChange('description'),
            onBlur: handleBlur('description'),
            placeholder: 'Describe the property...',
            rows: 3,
            maxLength: 5000,
            className: inputClass('description') + ' resize-none',
            name: 'description',
            id: 'description'
          }),
          React.createElement('div', { className: 'flex justify-between mt-1' },
            React.createElement('div', { className: 'flex-1' },
              errors.description ?
                React.createElement('p', { className: 'text-red-500 text-xs' }, errors.description) :
                warnings.description && !errors.description && form.description ?
                  React.createElement('p', { className: 'text-blue-600 text-xs flex items-center gap-1' },
                    React.createElement('span', null, warnings.description)
                  ) :
                  React.createElement('p', { className: 'text-xs text-gray-400' }, 'Min 20 characters')
            ),
            React.createElement('p', { className: 'text-xs text-gray-400' }, form.description.length + ' / 5000')
          )
        )
      );

      case 4: return React.createElement('div', { className: 'space-y-3 photos-section' },
        existingImages.length > 0 && React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-2' }, 
            listingId ? 'Current Photos' : 'Uploaded Photos'
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            existingImages.map(function(publicId, i) {
              const thumbUrl = `${CLOUDINARY_URL}c_thumb,g_faces,w_100,h_100/${publicId}`;
              
              return React.createElement('div', {
                  key: i,
                  className: 'relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group'
                },
                React.createElement('img', {
                  src: thumbUrl,
                  alt: 'Property photo',
                  className: 'w-full h-full object-cover',
                  onError: (e) => {
                    e.target.src = '/vault/img/no-image.jpg';
                  }
                }),
                React.createElement('button', {
                  type: 'button',
                  onClick: function() { removeExistingImage(i); },
                  className: 'absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs'
                }, '✕')
              );
            })
          ),
          existingImages.length === 1 && React.createElement('p', { className: 'text-blue-600 text-xs mb-2 flex items-center gap-1' },
            React.createElement('span', null, '📸 This will be your cover photo')
          ),
          existingImages.length >= 3 && React.createElement('p', { className: 'text-blue-600 text-xs mb-2 flex items-center gap-1' },
            React.createElement('span', null, '✨ Great variety! Multiple photos increase interest')
          )
        ),
        
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-2' }, 
            existingImages.length === 0 ? 'Photos *' : 'Add More Photos'
          ),
          
          React.createElement('div', { className: 'mt-2' },
            React.createElement('button', {
              type: 'button',
              onClick: openCloudinaryWidget,
              disabled: uploadingImages || existingImages.length >= 5,
              className: `inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-950 rounded-lg hover:bg-green-200 transition ${
                (uploadingImages || existingImages.length >= 5) ? 'opacity-50 cursor-not-allowed' : ''
              }`
            },
              React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4v16m8-8H4' })
              ),
              uploadingImages ? 'Uploading...' : 'Upload Photos'
            ),
            
            React.createElement('span', { className: 'ml-2 text-xs text-gray-500' },
              existingImages.length + '/5 photos'
            )
          ),
          
          uploadingImages && React.createElement('div', { className: 'mt-3' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('div', { className: 'loading-spinner w-5 h-5' }),
              React.createElement('span', { className: 'text-xs text-gray-600' }, 'Uploading...')
            )
          ),
          
          errors.images && 
            React.createElement('p', { className: 'text-red-500 text-xs mt-1' }, errors.images),
          
          React.createElement('p', { className: 'text-xs text-gray-400 mt-2' },
            'Upload up to 5 photos. First photo will be the cover.'
          ),
          
          existingImages.length === 0 && React.createElement('p', { className: 'text-blue-600 text-xs mt-2 flex items-center gap-1' },
            React.createElement('span', null, '📷 Properties with photos get 10x more views!')
          )
        ),
        
        !listingId && React.createElement('div', { className: 'mt-4 p-3 bg-green-50 rounded-lg border border-green-200' },
          React.createElement('p', { className: 'text-xs text-green-800 flex items-center gap-1' },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
            ),
            'Your listing will be reviewed by admin before going live.'
          )
        )
      );

      default: return null;
    }
  }

  return React.createElement('div', null,
    // ===== VERIFICATION WARNING =====
    showVerificationWarning && React.createElement(VerificationWarning, {
      message: 'Please verify your email to post listings.',
      onResend: handleResendVerification,
      show: showVerificationWarning,
      onClose: () => setShowVerificationWarning(false)
    }),
    
    modal && React.createElement('div', { className: 'flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('h3', { className: 'font-bold text-base text-gray-900' }, modalTitle),
        React.createElement('span', { className: 'text-xs text-gray-500' }, 
          currentStep + ' / ' + totalSteps
        )
      ),
      React.createElement('button', {
        onClick: onClose,
        className: 'text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-200'
      },
        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
        )
      )
    ),

    submitError && React.createElement('div', {
        className: 'bg-red-50 text-red-600 p-2 text-xs border-b border-red-200'
      }, submitError),

    React.createElement('div', { className: modal ? 'p-3 max-h-[50vh] overflow-y-auto' : 'p-6' },
      renderStep()
    ),

    React.createElement('div', { className: modal ? 'flex gap-2 p-3 border-t border-gray-200 bg-gray-50' : 'flex gap-4 pt-4' },
      currentStep > 1 ?
        React.createElement('button', {
          onClick: goToPrevStep,
          className: modal ? 
            'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-xs' :
            'px-6 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition'
        }, '← Back') :
        React.createElement('div', { className: modal ? 'flex-1' : 'flex-1' }),
      
      currentStep < totalSteps ?
        React.createElement('button', {
          onClick: goToNextStep,
          disabled: uploadingImages,
          className: modal ?
            'flex-1 bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition font-bold text-xs disabled:opacity-50' :
            'flex-1 bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
        }, uploadingImages ? 'Uploading...' : 'Next →') :
        React.createElement('button', {
          onClick: handleSubmit,
          disabled: submitting || uploadingImages,
          className: modal ?
            'flex-1 bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition font-bold text-xs disabled:opacity-50' :
            'flex-1 bg-green-950 text-white py-3 rounded-lg font-bold hover:bg-green-800 transition disabled:opacity-50'
        }, submitButtonText)
    )
  );
}

window.PostListingWizard = PostListingWizard;