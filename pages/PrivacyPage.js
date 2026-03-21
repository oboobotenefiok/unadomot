
function PrivacyPage({ navigate }) {
  return React.createElement('div', { className: 'min-h-screen bg-green-50 py-12' },
    React.createElement('div', { className: 'max-w-4xl mx-auto px-4' },
      
      React.createElement('div', { className: 'mb-6' },
        React.createElement('a', {
          href: '/',
          onClick: function(e) {
            e.preventDefault();
            navigate('/');
          },
          className: 'text-green-950 hover:underline cursor-pointer inline-flex items-center gap-2'
        }, '← Back to Home')
      ),
      
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8' },
        React.createElement('h1', { className: 'text-3xl font-bold mb-6' }, 'Privacy Policy'),
        
        React.createElement('div', { className: 'space-y-6' },
          React.createElement('p', { className: 'text-gray-600' }, 'Last updated: ' + new Date().toLocaleDateString()),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'Information We Collect'),
            React.createElement('ul', { className: 'list-disc pl-6 text-gray-700 space-y-1' },
              React.createElement('li', null, 'Account information (name, email, phone)'),
              React.createElement('li', null, 'Profile information (bio, photo)'),
              React.createElement('li', null, 'Listing details you post'),
              React.createElement('li', null, 'Messages sent through our platform'),
              React.createElement('li', null, 'Verification documents (encrypted)')
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'How We Use Your Information'),
            React.createElement('ul', { className: 'list-disc pl-6 text-gray-700 space-y-1' },
              React.createElement('li', null, 'Provide and maintain our service'),
              React.createElement('li', null, 'Verify user identities'),
              React.createElement('li', null, 'Facilitate communication between users'),
              React.createElement('li', null, 'Improve our platform'),
              React.createElement('li', null, 'Prevent fraud and abuse')
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'Information Sharing'),
            React.createElement('p', { className: 'text-gray-700' },
              'We do not sell your personal information. We share information only:'
            ),
            React.createElement('ul', { className: 'list-disc pl-6 text-gray-700 mt-2 space-y-1' },
              React.createElement('li', null, 'With other users as necessary for platform functionality'),
              React.createElement('li', null, 'When required by law'),
              React.createElement('li', null, 'To protect our rights and safety')
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'Data Security'),
            React.createElement('p', { className: 'text-gray-700' },
              'We encrypt sensitive data and follow industry standards. However, no method of transmission is 100% secure.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'Your Rights'),
            React.createElement('ul', { className: 'list-disc pl-6 text-gray-700 space-y-1' },
              React.createElement('li', null, 'Access your personal data'),
              React.createElement('li', null, 'Correct inaccurate data'),
              React.createElement('li', null, 'Delete your account'),
              React.createElement('li', null, 'Export your data')
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, 'Contact Us'),
            React.createElement('p', { className: 'text-gray-700' },
              'Privacy questions: privacy@unadomot.com'
            )
          )
        )
      )
    )
  );
}

window.PrivacyPage = PrivacyPage;