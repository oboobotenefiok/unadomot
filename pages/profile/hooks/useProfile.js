// pages/profile/hooks/useProfile.js
function useProfile(user) {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  
  const fetchProfile = React.useCallback(async () => {
    if (!user) return;
    
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        let userData = { id: userDoc.id, ...userDoc.data() };
        
        // ===== BACKWARD COMPATIBILITY: Convert old 'name' to 'displayName' =====
        if (userData.name && !userData.displayName) {
          userData.displayName = userData.name;
          // Optionally update the document to new format (can be done in migration)
        }
        
        // Ensure displayName exists
        if (!userData.displayName) {
          userData.displayName = user.displayName || 'User';
        }
        
        setProfile(userData);
      } else {
        // Create new user document with proper fields
        const newUserData = {
          displayName: user.displayName || 'User',
          username: null, // Will be set during signup, but here for safety
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          replyRate: 0,
          phone: '',
          bio: '',
          isOnline: true,
          displayNameLastChanged: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(user.uid).set(newUserData);
        setProfile({ id: user.uid, ...newUserData });
      }
      setError('');
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  // Helper to check if display name can be changed (6 months cooldown)
  const canChangeDisplayName = React.useCallback(() => {
    if (!profile || !profile.displayNameLastChanged) return true;
    
    const sixMonths = 180 * 24 * 60 * 60 * 1000; // ~6 months
    const lastChanged = profile.displayNameLastChanged.seconds ?
      new Date(profile.displayNameLastChanged.seconds * 1000) :
      new Date(profile.displayNameLastChanged);
    
    const nextAvailable = new Date(lastChanged.getTime() + sixMonths);
    return nextAvailable <= new Date();
  }, [profile]);
  
  // Get next available date for display name change
  const getNextDisplayNameChangeDate = React.useCallback(() => {
    if (!profile || !profile.displayNameLastChanged) return null;
    
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    const lastChanged = profile.displayNameLastChanged.seconds ?
      new Date(profile.displayNameLastChanged.seconds * 1000) :
      new Date(profile.displayNameLastChanged);
    
    return new Date(lastChanged.getTime() + sixMonths);
  }, [profile]);
  
  return {
    profile,
    setProfile,
    loading,
    error,
    setError,
    refetch: fetchProfile,
    canChangeDisplayName,
    getNextDisplayNameChangeDate
  };
}

window.useProfile = useProfile;