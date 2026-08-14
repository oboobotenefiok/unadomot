// pages/profile/index.js - COMPLETE REFACTORED VERSION
// All changes integrated: Badges, SettingsTab, Verification moved, Info icon

function ProfilePage({ user, navigate, initialTab = 'listings', cachedState, locationState }) {
  // ===== HOOKS =====
  const profileHook = window.useProfile(user);
  const listingsHook = window.useProfileListings(user);
  const settingsHook = window.useSettings();
  const { openModal } = window.useAuthModal();
  
  // ===== RESTORE STATE FROM CACHE =====
  const [activeTab, setActiveTab] = React.useState(() => {
    if (cachedState?.activeTab) {
      return cachedState.activeTab;
    }
    if (initialTab) {
      return initialTab;
    }
    return 'listings';
  });
  
  const [showEditModal, setShowEditModal] = React.useState(() => {
    return cachedState?.showEditModal || false;
  });
  
  const [editing, setEditing] = React.useState(false);
  
  // ===== FORM STATE (displayName, not username) =====
  const [form, setForm] = React.useState({ 
    displayName: profileHook.profile?.displayName || cachedState?.form?.displayName || '',
    username: profileHook.profile?.username || cachedState?.form?.username || '',
    phone: profileHook.profile?.phone || cachedState?.form?.phone || '',
    bio: profileHook.profile?.bio || cachedState?.form?.bio || '' 
  });
  const [formErrors, setFormErrors] = React.useState({});
  const [originalDisplayName, setOriginalDisplayName] = React.useState('');
  
  const settingsRef = React.useRef(null);
  const pageRef = React.useRef(null);
  
  // ===== EFFECTS =====
  React.useEffect(() => {
    if (!user) {
      navigate('/');
      openModal('login', '/profile');
    }
  }, [user, navigate, openModal]);
  
  React.useEffect(() => {
    if (profileHook.profile) {
      setForm({
        displayName: profileHook.profile.displayName || '',
        username: profileHook.profile.username || '',
        phone: profileHook.profile.phone || '',
        bio: profileHook.profile.bio || ''
      });
      setOriginalDisplayName(profileHook.profile.displayName || '');
    }
  }, [profileHook.profile]);
  
  // Click outside for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        settingsHook.closeAllDropdowns();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsHook]);
  
  // Restore scroll position after mount
  React.useEffect(() => {
    if (cachedState?.scrollPosition && pageRef.current) {
      setTimeout(() => {
        pageRef.current.scrollTop = cachedState.scrollPosition;
      }, 50);
    }
  }, [cachedState]);
  
  // ===== HANDLERS =====
  const handleEditClick = () => {
    setForm({
      displayName: profileHook.profile?.displayName || '',
      username: profileHook.profile?.username || '',
      phone: profileHook.profile?.phone || '',
      bio: profileHook.profile?.bio || ''
    });
    setOriginalDisplayName(profileHook.profile?.displayName || '');
    setFormErrors({});
    setShowEditModal(true);
    document.body.style.overflow = 'hidden';
  };
  
  const handleAdminClick = () => {
    navigate('/admin');
  };
  
  const handleEditClose = () => {
    setShowEditModal(false);
    document.body.style.overflow = 'unset';
  };
  
  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // ===== VERIFICATION HANDLER (MOVED TO SETTINGS) =====
  const handleVerify = () => {
    navigate('/verify');
  };
  
  // ===== DISPLAY NAME VALIDATION =====
  const validateDisplayName = (value) => {
    const v = ValidationHelpers;
    if (!value || value.trim() === '') return 'Display name is required';
    if (value.length < 2) return 'Display name must be at least 2 characters';
    if (value.length > 60) return 'Display name is too long';
    if (!/^[a-zA-Z\s'-]+$/.test(value)) {
      return 'Display name can only contain letters, spaces, hyphens and apostrophes';
    }
    return null;
  };
  
  const validateForm = async () => {
    const errors = {};
    
    // Validate display name
    const displayNameError = validateDisplayName(form.displayName);
    if (displayNameError) errors.displayName = displayNameError;
    
    // Check cooldown for display name change
    const displayNameChanged = form.displayName !== originalDisplayName;
    if (displayNameChanged && !profileHook.canChangeDisplayName()) {
      const nextDate = profileHook.getNextDisplayNameChangeDate();
      errors.displayName = `You can only change your display name once every 6 months. Next available: ${nextDate?.toLocaleDateString() || 'later'}`;
    }
    
    // Phone validation (optional)
    if (form.phone && form.phone.trim()) {
      const phoneError = ValidationHelpers.validatePhone(form.phone, false);
      if (phoneError) errors.phone = phoneError;
    }
    
    // Bio validation (optional)
    if (form.bio && form.bio.trim()) {
      const bioError = ValidationHelpers.validateText(form.bio, 'Bio', {
        required: false,
        maxLength: 500
      });
      if (bioError) errors.bio = bioError;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    
    if (!await validateForm()) return;
    
    setEditing(true);
    
    try {
      const updateData = {
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Update display name if changed
      const displayNameChanged = form.displayName !== originalDisplayName;
      if (displayNameChanged) {
        updateData.displayName = ValidationHelpers.sanitizeInput(form.displayName.trim(), 'text');
        updateData.displayNameLastChanged = firebase.firestore.FieldValue.serverTimestamp();
      }
      
      // Update phone and bio
      if (form.phone !== profileHook.profile?.phone) {
        updateData.phone = form.phone ? ValidationHelpers.sanitizeInput(form.phone, 'phone') : '';
      }
      
      if (form.bio !== profileHook.profile?.bio) {
        updateData.bio = form.bio ? ValidationHelpers.sanitizeInput(form.bio, 'text') : '';
      }
      
      await db.collection('users').doc(user.uid).update(updateData);
      
      await profileHook.refetch();
      handleEditClose();
      setFormErrors({});
      
      // Show success toast
      if (displayNameChanged) {
        ToastHelpers?.success('Display name updated! Next change available in 6 months.');
      } else {
        ToastHelpers?.success('Profile updated successfully!');
      }
      
    } catch (err) {
      console.error('Update error:', err);
      profileHook.setError(err.code === 'unavailable' ?
        'Network error. Please check your connection.' :
        'Failed to update profile. Please try again.');
    } finally {
      setEditing(false);
    }
  };
  
  const handleDeleteListing = async (listingId) => {
    if (!confirm('Delete this listing? It will be hidden from others but remain in your history.')) return;
    
    const success = await listingsHook.deleteListing(listingId);
    if (!success) {
      profileHook.setError('Failed to delete listing. Please try again.');
    }
  };
  
  const handleEditListing = (listingId) => {
    openModal('post', { listingId });
  };
  
  // ===== SAVE STATE BEFORE UNLOAD =====
  React.useEffect(() => {
    const saveState = () => {
      const scrollPosition = pageRef.current?.scrollTop || 0;
      
      window.__profilePageState = {
        activeTab,
        showEditModal,
        form,
        scrollPosition,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('profile_state', JSON.stringify({
          activeTab,
          timestamp: Date.now()
        }));
      } catch (e) {}
    };
    
    window.addEventListener('beforeunload', saveState);
    
    return () => {
      saveState(); // Save when component unmounts
      window.removeEventListener('beforeunload', saveState);
      delete window.__profilePageState;
    };
  }, [activeTab, showEditModal, form]);
  
  // ===== LOADING STATE =====
  if (profileHook.loading && !profileHook.profile) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
        React.createElement(SkeletonLoader.ProfileCard),
        React.createElement('div', { className: 'mb-6 border-b border-gray-200' },
          React.createElement('div', { className: 'flex gap-8' },
            React.createElement('div', { className: 'h-8 bg-gray-200 rounded w-24 animate-pulse' })
          )
        ),
        React.createElement(SkeletonLoader.ListingGrid, { count: 8, cols: 4 })
      )
    );
  }
  
  // ===== RENDER =====
  return React.createElement('div', { 
    ref: pageRef,
    className: 'min-h-screen bg-green-50 overflow-y-auto' 
  },
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      
      profileHook.error && React.createElement('div', {
        className: 'bg-red-50 text-red-700 p-4 rounded mb-6 border border-red-200'
      }, profileHook.error),
      
      // ===== UPDATED: ProfileHeader without verification section =====
      React.createElement(ProfileHeader, {
        profile: profileHook.profile,
        user: user,
        onEditClick: handleEditClick,
        onAdminClick: handleAdminClick
        // NOTE: onVerifyLandlord and onVerifyAgent REMOVED - moved to SettingsTab
      }),
      
      // ===== UPDATED: ProfileTabs with Info icon =====
      React.createElement(ProfileTabs, {
        activeTab: activeTab,
        onTabChange: setActiveTab
      }),
      
      activeTab === 'listings' &&
      React.createElement(ListingsTab, {
        listings: listingsHook.listings,
        user: user,
        navigate: navigate,
        onDelete: handleDeleteListing,
        onEdit: handleEditListing,
        loading: listingsHook.listingsLoading,
        usingIndex: listingsHook.usingIndex
      }),
      
      // ===== UPDATED: SettingsTab with Get Verified option =====
      activeTab === 'settings' &&
      React.createElement(SettingsTab, {
        openDropdowns: settingsHook.openDropdowns,
        toggleDropdown: settingsHook.toggleDropdown,
        openPopup: settingsHook.openPopup,
        versionInfo: settingsHook.versionInfo,
        checkForUpdates: settingsHook.checkForUpdates,
        handleLogout: async () => {
          try {
            await auth.signOut();
            navigate('/');
          } catch (err) {
            profileHook.setError('Failed to log out. Please try again.');
          }
        },
        settingsRef: settingsRef,
        onVerify: handleVerify // ← NEW: Pass verification handler
      })
    ),
    
    // ===== Edit Profile Modal (unchanged) =====
    React.createElement(EditProfileModal, {
      show: showEditModal,
      onClose: handleEditClose,
      onSubmit: handleUpdate,
      form: form,
      onFormChange: handleFormChange,
      errors: formErrors,
      isSubmitting: editing,
      displayNameLastChanged: profileHook.profile?.displayNameLastChanged,
      canChangeDisplayName: profileHook.canChangeDisplayName(),
      nextChangeDate: profileHook.getNextDisplayNameChangeDate()
    }),
    
    // ===== Popup Modal (unchanged) =====
    settingsHook.activePopup && React.createElement(PopupModal, {
      popupName: settingsHook.activePopup,
      onClose: settingsHook.closePopup,
      onBackdropClick: (e) => {
        if (e.target === e.currentTarget) settingsHook.closePopup();
      }
    })
  );
}

window.ProfilePage = ProfilePage;
