
function useAccessibility() {
const context = React.useContext(window.AccessibilityContext);
if (!context) {
return {
settings: {
fontSize: 'normal',
highContrast: false,
reduceMotion: false,
dyslexicFont: false,
showLinks: false
},
updateSetting: () => {},
resetSettings: () => {}
};
}
return context;
}

window.useAccessibility = useAccessibility;