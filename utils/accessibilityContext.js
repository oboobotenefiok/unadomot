
const AccessibilityContext = React.createContext({
settings: {
fontSize: 'normal',
highContrast: false,
reduceMotion: false,
dyslexicFont: false,
showLinks: false
},
updateSetting: (key, value) => {},
resetSettings: () => {}
});

window.AccessibilityContext = AccessibilityContext;