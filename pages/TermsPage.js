
function TermsPage({ navigate }) {
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
        React.createElement('h1', { className: 'text-3xl font-bold mb-6' }, 'Terms & Conditions'),
        
        React.createElement('div', { className: 'prose prose-green max-w-none space-y-6' },
          React.createElement('p', { className: 'text-gray-600' }, 'Last updated: ' + new Date().toLocaleDateString()),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '1. Acceptance of Terms'),
            React.createElement('p', { className: 'text-gray-700' },
              'By accessing or using UnaDomot, you agree to be bound by these Terms. If you disagree with any part, you may not access our service.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '2. User Accounts'),
            React.createElement('p', { className: 'text-gray-700' },
              'When you create an account, you must provide accurate information. You are responsible for maintaining account security.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '3. Listings'),
            React.createElement('p', { className: 'text-gray-700' },
              'Users may post property listings. All listings must be accurate and not misleading. We reserve the right to remove any listing.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '4. Verification'),
            React.createElement('p', { className: 'text-gray-700' },
              'Verified badges indicate users who have completed our verification process. We do not guarantee the accuracy of user-submitted information.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '5. Prohibited Activities'),
            React.createElement('ul', { className: 'list-disc pl-6 text-gray-700 space-y-1' },
              React.createElement('li', null, 'Posting false or misleading information'),
              React.createElement('li', null, 'Harassing other users'),
              React.createElement('li', null, 'Using the platform for illegal purposes'),
              React.createElement('li', null, 'Attempting to bypass our verification system')
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '6. Limitation of Liability'),
            React.createElement('p', { className: 'text-gray-700' },
              'UnaDomot is not liable for any disputes between users. We facilitate connections but are not a party to rental agreements.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '7. Changes to Terms'),
            React.createElement('p', { className: 'text-gray-700' },
              'We may modify these terms at any time. Continued use of the platform constitutes acceptance of new terms.'
            )
          ),
          
          React.createElement('section', null,
            React.createElement('h2', { className: 'text-xl font-bold mb-3' }, '8. Contact'),
            React.createElement('p', { className: 'text-gray-700' },
              'For questions about these Terms, contact: legal@unadomot.com'
            )
          )
        )
      )
    )
  );
}

window.TermsPage = TermsPage;