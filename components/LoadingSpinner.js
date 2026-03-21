
function LoadingSpinner() {
  return React.createElement('div', {
      className: 'flex h-screen items-center justify-center'
    },
      React.createElement('img', {
    src: '/vault/img/unadomot.jpg',
    alt: 'UnaDomot — ',
    className: 'w-10 h-10 rounded-full object-cover',
    onError: function(e) {
      
      e.target.style.display = 'none';
    }
  }),
    React.createElement('div', { className: 'w-6 h-6 rounded-full bg-gray-200 animate-pulse mx-auto' })
  );
}