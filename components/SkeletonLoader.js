

function ListingCardSkeleton() {
  return React.createElement('div', {
      className: 'bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full animate-pulse'
    },
    
    React.createElement('div', {
      className: 'h-40 bg-gray-200 flex-shrink-0'
    }),
    
    
    React.createElement('div', { className: 'p-3 flex-1 space-y-2' },
      
      React.createElement('div', {
        className: 'h-5 bg-gray-200 rounded w-3/4'
      }),
      
      React.createElement('div', {
        className: 'h-4 bg-gray-200 rounded w-full'
      }),
      
      React.createElement('div', {
        className: 'h-5 bg-gray-200 rounded w-1/2'
      }),
      
      React.createElement('div', {
          className: 'flex gap-1 pt-1'
        },
        React.createElement('div', {
          className: 'h-5 bg-gray-200 rounded w-16'
        })
      ),
      
      React.createElement('div', {
          className: 'flex items-center justify-between mt-2 pt-2 border-t border-gray-100'
        },
        React.createElement('div', {
          className: 'h-6 bg-gray-200 rounded w-16'
        }),
        React.createElement('div', {
          className: 'h-6 bg-gray-200 rounded w-16'
        })
      )
    )
  );
}

function ListingGridSkeleton({ count = 8, cols = 4 }) {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(React.createElement(ListingCardSkeleton, { key: i }));
  }
  
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  };
  
  return React.createElement('div', {
      className: `grid ${gridCols[cols] || gridCols[4]} gap-4`
    },
    ...skeletons
  );
}

function ProfileCardSkeleton() {
  return React.createElement('div', {
      className: 'bg-white rounded-lg shadow-md p-6 mb-8 animate-pulse'
    },
    React.createElement('div', { className: 'flex justify-between items-start' },
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('div', { className: 'h-8 bg-gray-200 rounded w-48' }),
        React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-32' })
      ),
      React.createElement('div', { className: 'h-8 bg-gray-200 rounded w-16' })
    ),
    React.createElement('div', { className: 'mt-4 space-y-2' },
      React.createElement('div', { className: 'h-5 bg-gray-200 rounded w-64' }),
      React.createElement('div', { className: 'h-5 bg-gray-200 rounded w-48' })
    )
  );
}

function ChatMessageSkeleton() {
  return React.createElement('div', {
      className: 'flex justify-start mb-4 animate-pulse'
    },
    React.createElement('div', {
        className: 'max-w-[70%] rounded-lg px-4 py-2 bg-gray-200'
      },
      React.createElement('div', { className: 'h-4 bg-gray-300 rounded w-48 mb-2' }),
      React.createElement('div', { className: 'h-3 bg-gray-300 rounded w-16' })
    )
  );
}

function ChatInterfaceSkeleton() {
  return React.createElement('div', {
      className: 'flex flex-col h-[500px] bg-white rounded-lg shadow-md animate-pulse'
    },
    
    React.createElement('div', {
        className: 'bg-gray-200 px-6 py-4 rounded-t-lg flex items-center gap-3'
      },
      React.createElement('div', {
        className: 'w-10 h-10 rounded-full bg-gray-300'
      }),
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('div', { className: 'h-4 bg-gray-300 rounded w-32' }),
        React.createElement('div', { className: 'h-3 bg-gray-300 rounded w-16' })
      )
    ),
    
    
    React.createElement('div', { className: 'flex-1 overflow-y-auto p-6 bg-gray-50' },
      React.createElement('div', { className: 'space-y-4' },
        React.createElement(ChatMessageSkeleton),
        React.createElement(ChatMessageSkeleton),
        React.createElement(ChatMessageSkeleton)
      )
    ),
    
    
    React.createElement('div', { className: 'p-4 border-t' },
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('div', {
          className: 'flex-1 h-12 bg-gray-200 rounded-lg'
        }),
        React.createElement('div', {
          className: 'w-20 h-12 bg-gray-200 rounded-lg'
        })
      )
    )
  );
}

function ChatListItemSkeleton() {
  return React.createElement('div', {
      className: 'p-4 flex items-center gap-3 animate-pulse'
    },
    React.createElement('div', {
      className: 'w-12 h-12 rounded-full bg-gray-200 flex-shrink-0'
    }),
    React.createElement('div', { className: 'flex-1' },
      React.createElement('div', { className: 'flex justify-between items-start mb-1' },
        React.createElement('div', { className: 'h-5 bg-gray-200 rounded w-24' }),
        React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-12' })
      ),
      React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' })
    )
  );
}

function ChatListSkeleton() {
  return React.createElement('div', {
      className: 'bg-white rounded-lg shadow-md divide-y'
    },
    React.createElement(ChatListItemSkeleton),
    React.createElement(ChatListItemSkeleton),
    React.createElement(ChatListItemSkeleton),
    React.createElement(ChatListItemSkeleton),
    React.createElement(ChatListItemSkeleton)
  );
}

function ListingDetailSkeleton() {
  return React.createElement('div', {
      className: 'min-h-screen bg-green-50 animate-pulse'
    },
    
    React.createElement('div', { className: 'bg-white border-b' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-4' },
        React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-32' })
      )
    ),
    
    
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-lg overflow-hidden' },
        
        React.createElement('div', {
          className: 'relative aspect-[16/9] md:aspect-[21/9] bg-gray-200'
        }),
        
        
        React.createElement('div', { className: 'p-8 space-y-6' },
          
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('div', { className: 'h-8 bg-gray-200 rounded w-64' }),
              React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-48' })
            ),
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('div', { className: 'h-8 bg-gray-200 rounded w-32' }),
              React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-24' })
            )
          ),
          
          
          React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
            React.createElement('div', { className: 'h-20 bg-gray-200 rounded' }),
            React.createElement('div', { className: 'h-20 bg-gray-200 rounded' }),
            React.createElement('div', { className: 'h-20 bg-gray-200 rounded' }),
            React.createElement('div', { className: 'h-20 bg-gray-200 rounded' })
          ),
          
          
          React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-32' }),
            React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-full' }),
            React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-full' }),
            React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' })
          )
        )
      )
    )
  );
}

function FavoritesGridSkeleton({ count = 8 }) {
  return React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
    Array.from({ length: count }).map((_, i) =>
      React.createElement('div', {
          key: i,
          className: 'bg-white rounded-lg shadow-md overflow-hidden animate-pulse'
        },
        React.createElement('div', { className: 'h-40 bg-gray-200' }),
        React.createElement('div', { className: 'p-3 space-y-2' },
          React.createElement('div', { className: 'h-5 bg-gray-200 rounded w-3/4' }),
          React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-full' }),
          React.createElement('div', { className: 'h-5 bg-gray-200 rounded w-1/2' }),
          React.createElement('div', { className: 'flex justify-between pt-2' },
            React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-16' }),
            React.createElement('div', { className: 'h-6 bg-gray-200 rounded w-16' })
          )
        )
      )
    )
  );
}

window.SkeletonLoader = {
  ListingCard: ListingCardSkeleton,
  ListingGrid: ListingGridSkeleton,
  ProfileCard: ProfileCardSkeleton,
  ChatInterface: ChatInterfaceSkeleton,
  ChatList: ChatListSkeleton,
  ChatMessage: ChatMessageSkeleton,
  ListingDetail: ListingDetailSkeleton,
  FavoritesGrid: FavoritesGridSkeleton 
};

