// pages/listing-detail/components/Lightbox.js
function Lightbox({ 
  show, 
  image, 
  onClose, 
  onPrev, 
  onNext, 
  hasMultiple,
  title 
}) {
  if (!show || !image) return null;

  return React.createElement('div', {
    className: 'fixed inset-0 bg-black/95 z-50 flex items-center justify-center',
    onClick: onClose
  },
    React.createElement('button', {
      onClick: onClose,
      className: 'absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 z-10'
    }, '✕'),
    
    React.createElement('img', {
      src: window.CloudinaryHelpers.getUrl(image, { 
        width: LISTING_DETAIL_CONSTANTS.IMAGE.LIGHTBOX_WIDTH, 
        quality: LISTING_DETAIL_CONSTANTS.IMAGE.LIGHTBOX_QUALITY 
      }),
      alt: title,
      className: 'max-w-full max-h-full object-contain p-4'
    }),
    
    hasMultiple && React.createElement(React.Fragment, null,
      React.createElement('button', {
        onClick: function(e) { e.stopPropagation(); onPrev(); },
        className: 'absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-4'
      }, '←'),
      React.createElement('button', {
        onClick: function(e) { e.stopPropagation(); onNext(); },
        className: 'absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-4'
      }, '→')
    )
  );
}

window.Lightbox = Lightbox;