// pages/profile/components/PopupModal.js
function PopupModal({ popupName, onClose, onBackdropClick }) {
  const getContent = () => {
    const contents = {
      support_center: {
        title: 'Support Center',
        content: React.createElement('div', { className: 'space-y-4' },
          React.createElement('p', null, 'Need help? We\'re here for you 24/7.'),
          React.createElement('div', { className: 'bg-gray-50 p-4 rounded-lg' },
            React.createElement('p', { className: 'font-medium' }, 'Founding Developer:'),
            React.createElement('a', { href: 'mailto: oboobotenefiok@gmail.com', className: 'text-green-950' }, 
              'Click to send mail'
            )
          ),
          React.createElement('div', { className: 'bg-gray-50 p-4 rounded-lg' },
            React.createElement('p', { className: 'font-medium' }, 'Phone:'),
            React.createElement('p', null, '+234 (0) 813 133 1742')
          )
        )
      },
      
      faqs: {
        title: 'Frequently Asked Questions',
        content: React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', null,
            React.createElement('p', { className: 'font-bold' }, 'How do I post a listing?'),
            React.createElement('p', { className: 'text-sm text-gray-600' }, 'Click the + button in the bottom or side bar, and follow the wizard.')
          ),
          React.createElement('div', null,
            React.createElement('p', { className: 'font-bold' }, 'Is it really free?'),
            React.createElement('p', { className: 'text-sm text-gray-600' }, 'Yes! FOR NOW, UnaDomot is completely free for tenants and landlords.')
          ),
          React.createElement('div', null,
            React.createElement('p', { className: 'font-bold' }, 'How do I get verified?'),
            React.createElement('p', { className: 'text-sm text-gray-600' }, 'Go to your profile and click "Get Verified" to start the process. Verification is free.')
          )
        )
      },
      
      safety_tips: {
        title: 'Safety Tips',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('span', { className: 'text-xl' }, '🔒'),
            React.createElement('p', { className: 'text-sm' }, 'Never send money before viewing a property')
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('span', { className: 'text-xl' }, '👀'),
            React.createElement('p', { className: 'text-sm' }, 'Always view the property in person')
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('span', { className: 'text-xl' }, '📝'),
            React.createElement('p', { className: 'text-sm' }, 'Get everything in writing')
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('span', { className: 'text-xl' }, '🚨'),
            React.createElement('p', { className: 'text-sm' }, 'Report suspicious listings immediately')
          )
        )
      },
      
      our_resources: {
        title: 'Our Resources',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('a', { href: '#', className: 'block p-3 bg-gray-50 rounded-lg hover:bg-gray-100' },
            React.createElement('p', { className: 'font-medium' }, 'Complete Guide'),
            React.createElement('p', { className: 'text-xs text-gray-500' }, 'Coming Soon...')
          ),
       
          
        )
      },
      
      academy: {
        title: 'UnaDomot Academy',
        content: React.createElement('div', { className: 'space-y-4' },
          React.createElement('p', null, ' Coming Soon...'),
      /*    React.createElement('div', { className: 'grid gap-2' },
            ['Getting Started', 'Advanced Features', 'Tips for Landlords', 'Safety & Security'].map(course =>
              React.createElement('button', {
                key: course,
                className: 'text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm'
              }, course)
            )
          )*/
        )
      },
      
      about_us: {
        title: 'About UnaDomot',
        content: React.createElement('div', { className: 'space-y-4' },
          React.createElement('p', { className: 'text-lg font-bold' }, '🏠 UnaDomot'),
          React.createElement('p', null, 
            'UnaDomot is a platform connecting tenants directly with landlords, ' +
            'eliminating extortionate agent fees and making rental housing more accessible for everyone.'
          ),
          React.createElement('p', null,
            'Founded in 2026, we\'re helping Nigerians find their ' +
            'perfect homes without the stress and cost of middlemen.'
          ),
          
        )
      },
      
      terms_conditions: {
        title: 'Terms & Conditions',
        content: React.createElement('div', { className: 'prose prose-sm max-w-none' },
          React.createElement('p', null, 'By using UnaDomot, you agree to these terms...')
        )
      },
      
      privacy_policy: {
        title: 'Privacy Policy',
        content: React.createElement('div', { className: 'prose prose-sm max-w-none' },
          React.createElement('p', null, 'We respect your privacy...')
        )
      },
      
      billing_policy: {
        title: 'Billing Policy',
        content: React.createElement('div', { className: 'prose prose-sm max-w-none' },
          React.createElement('p', null, 'UnaDomot is currently free...')
        )
      },
      
      cookie_policy: {
        title: 'Cookie Policy',
        content: React.createElement('div', { className: 'prose prose-sm max-w-none' },
          React.createElement('p', null, 'We use cookies to improve your experience...')
        )
      },
      
      copyright: {
        title: 'Copyright',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('p', null, '© 2026 UnaDomot. All rights reserved.'),
          React.createElement('p', { className: 'text-sm text-gray-600' },
            'All content, logos, and designs are the property of UnaDomot.'
          )
        )
      }
    };
    
    return contents[popupName] || {
      title: 'Information',
      content: React.createElement('p', null, 'Content coming soon.')
    };
  };
  
  const { title, content } = getContent();
  
  return React.createElement('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
    onClick: onBackdropClick
  },
    React.createElement('div', {
      className: 'bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden',
      onClick: e => e.stopPropagation()
    },
      
      React.createElement('div', { className: 'flex items-center justify-between p-4 border-b border-gray-200' },
        React.createElement('h3', { className: 'font-bold text-lg' }, title),
        React.createElement('button', {
          onClick: onClose,
          className: 'text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100'
        }, '✕')
      ),
      
      React.createElement('div', { className: 'p-4 overflow-y-auto max-h-[60vh]' },
        content
      ),
      
      React.createElement('div', { className: 'p-4 border-t border-gray-200 bg-gray-50' },
        React.createElement('button', {
          onClick: onClose,
          className: 'w-full bg-green-950 text-white py-2 rounded-lg hover:bg-green-800 transition'
        }, 'Close')
      )
    )
  );
}

window.PopupModal = PopupModal;