// pages/profile/utils/constants.js - ADD

const USER_TYPES = {
  USER: 'user',
  LANDLORD: 'landlord',
  AGENT: 'agent',
  AGENCY: 'agency',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const BADGE_CONFIG = {
  [USER_TYPES.USER]: null,
  [USER_TYPES.LANDLORD]: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: 'Landlord',
    icon: '✓'
  },
  [USER_TYPES.AGENT]: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Agent',
    icon: '✓'
  },
  [USER_TYPES.AGENCY]: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: 'Agency',
    icon: '✓'
  },
  [USER_TYPES.ADMIN]: {
    color: 'bg-gray-400 text-white border-gray-500',
    label: 'Admin',
    icon: '✓'
  },
  [USER_TYPES.MODERATOR]: {
    color: 'bg-gray-300 text-gray-700 border-gray-400',
    label: 'Moderator',
    icon: '✓'
  }
};

function getBadgeConfig(userType) {
  return BADGE_CONFIG[userType] || null;
}

function getUserTypeDisplay(userType) {
  if (!userType || userType === 'user') return null;
  const config = getBadgeConfig(userType);
  return config ? config.label : null;
}

// NEW: Get verification status from Firebase Auth or Firestore
function getVerificationStatus(user, profile) {
  // Check if userType is set in profile
  if (profile?.userType && profile.userType !== 'user') {
    return {
      type: profile.userType,
      verified: true,
      source: 'firestore'
    };
  }
  
  // Fallback: Check legacy verified field
  if (profile?.verified) {
    const verified = profile.verified;
    if (verified.landlord?.status === 'approved') {
      return { type: 'landlord', verified: true, source: 'legacy' };
    }
    if (verified.agent?.status === 'approved') {
      return { type: 'agent', verified: true, source: 'legacy' };
    }
  }
  
  return { type: 'user', verified: false };
}

window.PROFILE_CONSTANTS = window.PROFILE_CONSTANTS || {};
window.PROFILE_CONSTANTS.USER_TYPES = USER_TYPES;
window.PROFILE_CONSTANTS.BADGE_CONFIG = BADGE_CONFIG;
window.PROFILE_CONSTANTS.getBadgeConfig = getBadgeConfig;
window.PROFILE_CONSTANTS.getUserTypeDisplay = getUserTypeDisplay;
window.PROFILE_CONSTANTS.getVerificationStatus = getVerificationStatus;
