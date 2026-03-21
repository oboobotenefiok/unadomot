// pages/profile/hooks/useProfile.js
function useProfile(user) {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [usernameEdited, setUsernameEdited] = React.useState(false);
  
  const fetchProfile = React.useCallback(async () => {
    if (!user) return;
    
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        setProfile(userData);
        setUsernameEdited(userData.usernameEdited || false);
      } else {
        const newUserData = {
          name: user.displayName || 'User',
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          replyRate: 0,
          phone: '',
          bio: '',
          usernameEdited: false
        };
        await db.collection('users').doc(user.uid).set(newUserData);
        setProfile({ id: user.uid, ...newUserData });
        setUsernameEdited(false);
      }
      setError('');
    } catch (error) {
      setError('Failed to load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  return {
    profile,
    setProfile,
    loading,
    error,
    setError,
    usernameEdited,
    setUsernameEdited,
    refetch: fetchProfile
  };
}

window.useProfile = useProfile;