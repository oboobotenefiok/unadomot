// pages/profile/index.js
function ProfilePage({ user, navigate, initialTab = 'listings', cachedState, locationState }) {
  // ===== HOOKS =====
  const profileHook = window.useProfile(user);
  const listingsHook = window.useProfileListings(user);
  const settingsHook = window.useSettings();
  const { openModal } = window.useAuthModal();
  
  // ===== RESTORE STATE FROM CACHE =====
  const [activeTab, setActiveTab] = React.useState(() => {
    // First check cached state
    if (cachedState?.activeTab) {
      return cachedState.activeTab;
    }
    // Then check initialTab from navigation
    if (initialTab) {
      return initialTab;
    }
    return 'listings';
  });
  
  const [showEditModal, setShowEditModal] = React.useState(() => {
    return cachedState?.showEditModal || false;
  });
  
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ 
    name: profileHook.profile?.name || cachedState?.form?.name || '',
    username: profileHook.profile?.username || cachedState?.form?.username || '',
    phone: profileHook.profile?.phone || cachedState?.form?.phone || '',
    bio: profileHook.profile?.bio || cachedState?.form?.bio || '' 
  });
  const [formErrors, setFormErrors] = React.useState({});
  
  const usernameHook = window.useUsername(
    form.username,
    profileHook.profile?.username,
    profileHook.usernameEdited
  );
  
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
        name: profileHook.profile.name || '',
        username: profileHook.profile.username || '',
        phone: profileHook.profile.phone || '',
        bio: profileHook.profile.bio || ''
      });
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
      name: profileHook.profile?.name || '',
      username: profileHook.profile?.username || '',
      phone: profileHook.profile?.phone || '',
      bio: profileHook.profile?.bio || ''
    });
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
    if (field === 'username') {
      usernameHook.handleUsernameChange(value, user?.uid);
    }
  };
  
  const validateForm = async () => {
    const v = ValidationHelpers;
    const errors = {};
    
    const nameError = v.validateText(form.name, 'Name', {
      required: true,
      minLength: PROFILE_CONSTANTS.VALIDATION.NAME_MIN_LENGTH,
      maxLength: PROFILE_CONSTANTS.VALIDATION.NAME_MAX_LENGTH
    });
    if (nameError) errors.name = nameError;
    
    if (form.username !== profileHook.profile?.username) {
      if (profileHook.usernameEdited) {
        errors.username = 'Username can only be set once. Please contact admin to change it.';
      } else if (usernameHook.usernameError) {
        errors.username = usernameHook.usernameError;
      }
    }
    
    if (form.phone && form.phone.trim()) {
      const phoneError = v.validatePhone(form.phone, false);
      if (phoneError) errors.phone = phoneError;
    }
    
    if (form.bio && form.bio.trim()) {
      const bioError = v.validateText(form.bio, 'Bio', {
        required: false,
        maxLength: PROFILE_CONSTANTS.VALIDATION.BIO_MAX_LENGTH
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
      const sanitizedName = ValidationHelpers.sanitizeInput(form.name, 'text');
      const sanitizedPhone = form.phone ? ValidationHelpers.sanitizeInput(form.phone, 'phone') : '';
      const sanitizedBio = form.bio ? ValidationHelpers.sanitizeInput(form.bio, 'text') : '';
      
      const updateData = {
        name: sanitizedName,
        phone: sanitizedPhone,
        bio: sanitizedBio,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const usernameChanged = form.username && form.username !== profileHook.profile?.username;
      if (usernameChanged && !profileHook.usernameEdited) {
        const sanitizedUsername = form.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        updateData.username = sanitizedUsername;
        updateData.usernameEdited = true;
        updateData.usernameEditedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      
      await db.collection('users').doc(user.uid).update(updateData);
      
      await profileHook.refetch();
      handleEditClose();
      setFormErrors({});
      
    } catch (err) {
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
  
  const handleContactAdmin = () => {
    window.location.href = 'mailto:support@unadomot.com?subject=Username Change Request';
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
      
      React.createElement(ProfileHeader, {
        profile: profileHook.profile,
        user: user,
        onEditClick: handleEditClick,
        onAdminClick: handleAdminClick
      }),
      
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
        settingsRef: settingsRef
      })
    ),
    
    React.createElement(EditProfileModal, {
      show: showEditModal,
      onClose: handleEditClose,
      onSubmit: handleUpdate,
      form: form,
      onFormChange: handleFormChange,
      errors: formErrors,
      usernameState: {
        checking: usernameHook.checkingUsername,
        available: usernameHook.usernameAvailable,
        error: usernameHook.usernameError
      },
      isSubmitting: editing,
      isUsernameEdited: profileHook.usernameEdited,
      onContactAdmin: handleContactAdmin
    }),
    
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