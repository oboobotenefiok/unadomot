// pages/profile/utils/constants.js
const PROFILE_CONSTANTS = {
  SUPPORT_OPTIONS: [
    'Support Center',
    'FAQs',
    'Safety Tips',
    'Our Resources',
    'Academy'
  ],
  
  LEGAL_OPTIONS: [
    'Terms & Conditions',
    'Privacy Policy',
    'Billing Policy',
    'Cookie Policy',
    'Copyright'
  ],
  
  VERSION: {
    CURRENT: window.APP_VERSION || '1.0.0',
    LATEST: '1.0.1'
  },
  
  VALIDATION: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    BIO_MAX_LENGTH: 500,
    USERNAME_CHECK_DELAY: 500
  },
  
  POPUP_CONTENTS: {
    support_center: {
      title: 'Support Center',
      email: 'support@unadomot.com',
      phone: '+234 (0) 800 000 0000'
    },
    faqs: {
      title: 'Frequently Asked Questions'
    },
    safety_tips: {
      title: 'Safety Tips'
    },
    our_resources: {
      title: 'Our Resources'
    },
    academy: {
      title: 'UnaDomot Academy'
    },
    about_us: {
      title: 'About UnaDomot',
      email: 'hello@unadomot.com'
    },
    terms_conditions: {
      title: 'Terms & Conditions'
    },
    privacy_policy: {
      title: 'Privacy Policy'
    },
    billing_policy: {
      title: 'Billing Policy'
    },
    cookie_policy: {
      title: 'Cookie Policy'
    },
    copyright: {
      title: 'Copyright'
    }
  }
};

window.PROFILE_CONSTANTS = PROFILE_CONSTANTS;