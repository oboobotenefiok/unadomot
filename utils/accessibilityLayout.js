
const AccessibilityLayout = {
  
  getGridCols: (fontSize, type = 'listings') => {
    const grids = {
      listings: {
        small: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        normal: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        'x-large': 'grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2'
      },
      favorites: {
        small: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        normal: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        'x-large': 'grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2'
      },
      profile: {
        small: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        normal: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        'x-large': 'grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2'
      },
      chat: {
        small: 'max-w-3xl',
        normal: 'max-w-3xl',
        large: 'max-w-2xl',
        'x-large': 'max-w-xl'
      }
    };
    
    return grids[type]?.[fontSize] || grids.listings.normal;
  },
  
  
  getContainerPadding: (fontSize) => {
    const paddings = {
      small: 'px-4 py-4',
      normal: 'px-4 py-4',
      large: 'px-6 py-6',
      'x-large': 'px-8 py-8'
    };
    return paddings[fontSize] || paddings.normal;
  },
  
  
  getCardSize: (fontSize) => {
    const sizes = {
      small: {
        image: 'h-40',
        title: 'text-sm',
        price: 'text-sm',
        address: 'text-xs',
        badge: 'text-[10px]',
        button: 'text-xs'
      },
      normal: {
        image: 'h-40',
        title: 'text-sm',
        price: 'text-sm',
        address: 'text-xs',
        badge: 'text-[10px]',
        button: 'text-xs'
      },
      large: {
        image: 'h-48',
        title: 'text-base',
        price: 'text-base',
        address: 'text-sm',
        badge: 'text-xs',
        button: 'text-sm'
      },
      'x-large': {
        image: 'h-56',
        title: 'text-lg',
        price: 'text-lg',
        address: 'text-base',
        badge: 'text-sm',
        button: 'text-base'
      }
    };
    return sizes[fontSize] || sizes.normal;
  },
  
  
  getBodyTextSize: (fontSize) => {
    const sizes = {
      small: 'text-sm',
      normal: 'text-base',
      large: 'text-lg',
      'x-large': 'text-xl'
    };
    return sizes[fontSize] || sizes.normal;
  },
  
  
  getHeadingSize: (fontSize, level = 'h2') => {
    const headings = {
      h1: {
        small: 'text-2xl',
        normal: 'text-3xl',
        large: 'text-4xl',
        'x-large': 'text-5xl'
      },
      h2: {
        small: 'text-xl',
        normal: 'text-2xl',
        large: 'text-3xl',
        'x-large': 'text-4xl'
      },
      h3: {
        small: 'text-lg',
        normal: 'text-xl',
        large: 'text-2xl',
        'x-large': 'text-3xl'
      }
    };
    return headings[level]?.[fontSize] || headings.h2.normal;
  },
  
  
  getSpacing: (fontSize) => {
    const spacings = {
      small: 'space-y-2',
      normal: 'space-y-3',
      large: 'space-y-4',
      'x-large': 'space-y-6'
    };
    return spacings[fontSize] || spacings.normal;
  },
  
  
  shouldStack: (fontSize) => {
    return fontSize === 'large' || fontSize === 'x-large';
  },
  
  
  getTouchTargetSize: (fontSize) => {
    const sizes = {
      small: 'min-h-[40px] min-w-[40px]',
      normal: 'min-h-[44px] min-w-[44px]',
      large: 'min-h-[48px] min-w-[48px]',
      'x-large': 'min-h-[56px] min-w-[56px]'
    };
    return sizes[fontSize] || sizes.normal;
  },
  
  
  getLineHeight: (fontSize) => {
    const heights = {
      small: 'leading-normal',
      normal: 'leading-relaxed',
      large: 'leading-loose',
      'x-large': 'leading-loose'
    };
    return heights[fontSize] || heights.normal;
  }
};

window.AccessibilityLayout = AccessibilityLayout;