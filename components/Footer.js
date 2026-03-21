
function Footer() {
  const currentYear = new Date().getFullYear();
  
  
  const handleNavigate = (path) => (e) => {
    e.preventDefault();
    if (window.__navigate) window.__navigate(path);
  };
  
  return React.createElement('footer', {
      className: 'bg-green-950 text-green-50 mt-auto'
    },
    React.createElement('div', {
        className: 'container mx-auto px-4 py-12'
      },
      
      React.createElement('div', {
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12'
        },
        
        React.createElement('div', null,
          React.createElement('h3', {
            className: 'text-lg font-semibold mb-4 text-white'
          }, 'UnaDomot'),
          
          React.createElement('ul', { className: 'space-y-2' },
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/about'),
                className: 'hover:text-white transition-colors'
              }, 'About us')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/careers'),
                className: 'hover:text-white transition-colors'
              }, 'We are hiring!')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/contact'),
                className: 'hover:text-white transition-colors'
              }, 'Contact Us')
            ),
            React.createElement('li', { className: 'pt-2' },
              React.createElement('a', {
                href: 'mailto:placeholder@unadomot.com',
                className: 'text-green-300 hover:text-white transition-colors'
              }, 'placeholder@unadomot.com')
            )
          )
        ),
        
        
        React.createElement('div', null,
          React.createElement('h3', {
            className: 'text-lg font-semibold mb-4 text-white'
          }, 'Support'),
          
          React.createElement('ul', { className: 'space-y-2' },
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/support'),
                className: 'hover:text-white transition-colors'
              }, 'Support Center')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/faq'),
                className: 'hover:text-white transition-colors'
              }, 'FAQ')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/safety'),
                className: 'hover:text-white transition-colors'
              }, 'Safety Tips')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/resources'),
                className: 'hover:text-white transition-colors'
              }, 'Resources')
            )
          )
        ),
        
        
        React.createElement('div', null,
          React.createElement('h3', {
            className: 'text-lg font-semibold mb-4 text-white'
          }, 'Legal'),
          
          React.createElement('ul', { className: 'space-y-2' },
            React.createElement('li', null,
              React.createElement('a', {
                href: '/terms',
                onClick: handleNavigate('/terms'),
                className: 'hover:text-white transition-colors'
              }, 'Terms & Conditions')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '/privacy',
                onClick: handleNavigate('/privacy'),
                className: 'hover:text-white transition-colors'
              }, 'Privacy Policy')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/billing'),
                className: 'hover:text-white transition-colors'
              }, 'Billing Policy')
            ),
            React.createElement('li', null,
              React.createElement('a', {
                href: '#',
                onClick: handleNavigate('/cookies'),
                className: 'hover:text-white transition-colors'
              }, 'Cookie Policy')
            )
          )
        )
      )
    )
  );
}

window.Footer = Footer;