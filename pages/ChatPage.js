// pages/ChatPage.js - COMPLETE FIXED VERSION
function ChatPage({ user, navigate }) {
  // ===== SYNCHRONOUS DETECTION =====
  const params = new URLSearchParams(window.location.search);
  const initialChatId = params.get('chat');
  const initialMessage = params.get('message');
  
  const [selectedChat, setSelectedChat] = React.useState(null);
  const [view, setView] = React.useState(initialChatId ? 'chat' : 'list');
  const [loading, setLoading] = React.useState(true);
  const { openModal } = window.useAuthModal();
  
  // ===== DETECT DESKTOP MODE =====
  const [isDesktop, setIsDesktop] = React.useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
  });
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ===== FETCH CHAT DATA =====
  React.useEffect(function() {
    if (!user) {
      navigate('/');
      openModal('login', '/chat');
      return;
    }
    
    const chatId = initialChatId;
    
    if (chatId) {
      fetchChatById(chatId);
    }
    
    const t = setTimeout(function() { setLoading(false); }, 300);
    return function() { clearTimeout(t); };
  }, [user]);
  
  // ===== SET BODY CLASS IMMEDIATELY =====
  React.useLayoutEffect(function() {
    if (view === 'chat') {
      document.body.classList.add('chat-open', 'hide-bottom-nav');
    } else {
      document.body.classList.remove('chat-open', 'hide-bottom-nav');
    }
    return function() {
      document.body.classList.remove('chat-open', 'hide-bottom-nav');
    };
  }, [view]);
  
  const fetchChatById = async function(chatId) {
    try {
      
      const chatDoc = await db.collection('chats').doc(chatId).get();
      
      if (chatDoc.exists) {
        const chatData = { id: chatDoc.id, ...chatDoc.data() };
        const otherId = chatData.participants.find(function(id) { return id !== user.uid; });
        
        
        
        const userDoc = await db.collection('users').doc(otherId).get();
        const otherUser = userDoc.exists ? userDoc.data() : { name: 'User' };
        
        setSelectedChat({
          ...chatData,
          otherUser
        });
        
        
      } else {
        
      }
    } catch (err) {
      
    }
  };
  
  const handleSelectChat = function(chat) {
    setSelectedChat(chat);
    setView('chat');
    const url = new URL(window.location);
    url.searchParams.set('chat', chat.id);
    window.history.pushState({}, '', url);
    if (chat && user) {
      NotificationHelpers.markChatAsRead(chat.id, user.uid).catch(function() {});
    }
  };
  
  const handleBackToList = function() {
    setView('list');
    setSelectedChat(null);
    const url = new URL(window.location);
    url.searchParams.delete('chat');
    url.searchParams.delete('message');
    window.history.pushState({}, '', url);
  };
  
  React.useEffect(function() {
    const handlePop = function() {
      const params = new URLSearchParams(window.location.search);
      const chatId = params.get('chat');
      if (chatId && view === 'list') {
        setView('chat');
        fetchChatById(chatId);
      }
      else if (!chatId && view === 'chat') {
        setView('list');
        setSelectedChat(null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return function() { window.removeEventListener('popstate', handlePop); };
  }, [view]);
  
  if (!user) {
    return React.createElement('div', { className: 'min-h-screen bg-green-50' },
      React.createElement('div', { className: 'p-4 space-y-3' },
        Array.from({ length: 5 }).map(function(_, i) {
          return React.createElement('div', { key: i, className: 'bg-white rounded-lg p-4 flex gap-3 animate-pulse' },
            React.createElement('div', { className: 'w-12 h-12 rounded-full bg-gray-200 flex-shrink-0' }),
            React.createElement('div', { className: 'flex-1 space-y-2' },
              React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-1/3' }),
              React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-2/3' })
            )
          );
        })
      )
    );
  }
  
  return React.createElement('div', { className: 'min-h-screen bg-green-50' },
    React.createElement('div', {
        className: view === 'chat' ?
          isDesktop ?
          'absolute inset-0 top-0 left-0 right-0 bottom-0' :
          'fixed inset-0 z-40 bg-green-50 pt-0' :
          isDesktop ?
          'max-w-4xl mx-auto px-4 py-8' :
          'max-w-4xl mx-auto px-4 py-8'
      },
      view === 'list' ?
      (loading ?
        React.createElement('div', { className: 'pt-4 space-y-2' },
          Array.from({ length: 6 }).map(function(_, i) {
            return React.createElement('div', { key: i, className: 'bg-white rounded-lg p-4 flex gap-3 animate-pulse' },
              React.createElement('div', { className: 'w-12 h-12 rounded-full bg-gray-200 flex-shrink-0' }),
              React.createElement('div', { className: 'flex-1 space-y-2' },
                React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-1/3' }),
                React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-2/3' })
              )
            );
          })
        ) :
        React.createElement(ChatList, { userId: user.uid, onSelectChat: handleSelectChat })
      ) :
      React.createElement('div', {
          className: isDesktop ?
            'w-full max-w-4xl h-full flex flex-col mx-auto' :
            'h-full flex flex-col w-full'
        },
        React.createElement(ChatInterface, {
          chatId: selectedChat?.id,
          currentUserId: user.uid,
          otherUserId: selectedChat?.participants?.find(function(id) { return id !== user.uid; }),
          otherUserName: selectedChat?.otherUser?.name,
          otherUserPhoto: selectedChat?.otherUser?.photoURL,
          onClose: handleBackToList
        })
      )
    )
  );
}

window.ChatPage = ChatPage;