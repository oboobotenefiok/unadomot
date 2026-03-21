

function ProfileRedirectPage({ user, navigate }) {
const [loading, setLoading] = React.useState(true);
const [error, setError] = React.useState('');

const profileUserId = window.location.pathname.split('/')[2];

React.useEffect(() => {
if (!profileUserId) {
navigate('/profile'); 
return;
}

if (user && user.uid === profileUserId) {
navigate('/profile'); 
return;
}

navigate('/public-profile/' + profileUserId);

}, [profileUserId, user, navigate]);

return React.createElement('div', { className: 'min-h-screen bg-green-50 flex items-center justify-center' },
React.createElement('div', { className: 'text-center' },
React.createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-200 animate-pulse mx-auto mb-4' }),
React.createElement('p', { className: 'text-gray-600' }, 'Redirecting...')
)
);
}

window.ProfileRedirectPage = ProfileRedirectPage;