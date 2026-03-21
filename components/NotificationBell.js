// components/NotificationBell.js - UNIFIED NOTIFICATION MODAL
// Same look across grid view, map view, desktop, and mobile

function NotificationBell() {
  const [showPopover, setShowPopover] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const bellRef = React.useRef(null);
  const notificationSound = React.useRef(null); 
  
  const {
    notifications,
    unreadCount,
    preferences,
    toggleNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    updatePreferences,
    showBellPopover,
    setShowBellPopover
  } = window.useNotifications?.() || {
    notifications: [],
    unreadCount: 0,
    preferences: { enabled: false },
    toggleNotifications: () => {},
    markAsRead: () => {},
    markAllAsRead: () => {},
    clearAll: () => {},
    updatePreferences: () => {},
    showBellPopover: false,
    setShowBellPopover: () => {}
  };
  
  const { openModal } = window.useAuthModal?.() || { openModal: () => {} };
  const user = auth?.currentUser;
  
  // ===== FILTER OUT MESSAGE NOTIFICATIONS =====
  const nonMessageNotifications = React.useMemo(() => {
    return notifications.filter(n => n.type !== 'message');
  }, [notifications]);
  
  const nonMessageUnreadCount = React.useMemo(() => {
    return nonMessageNotifications.filter(n => !n.read).length;
  }, [nonMessageNotifications]);
  
  React.useEffect(() => {
    notificationSound.current = new Audio('/vault/audio/notification.mp3');
    notificationSound.current.volume = 0.5;
  }, []);
  
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && (showPopover || showSettings)) {
        setShowPopover(false);
        setShowSettings(false);
        setShowBellPopover(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showPopover, showSettings, setShowBellPopover]);
  
  React.useEffect(() => {
    if (showBellPopover) {
      setShowPopover(true);
    }
  }, [showBellPopover]);
  
  const handleBellClick = () => {
    if (!user) {
      openModal('login', window.location.pathname);
      return;
    }
    
    setShowPopover(!showPopover);
    setShowBellPopover(false);
    setShowSettings(false);
    
    if (!showPopover && nonMessageUnreadCount > 0) {
      markAllAsRead();
    }
  };
  
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'listing' && notification.listingId) {
      window.__navigate?.('/listing/' + notification.listingId);
    } else if (notification.type === 'location') {
      // Handle location notifications if needed
    }
    
    setShowPopover(false);
  };
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowPopover(false);
      setShowSettings(false);
      setShowBellPopover(false);
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString();
  };
  
  // Settings modal - UNIFIED STYLE
  if (showSettings) {
    return ReactDOM.createPortal(
      React.createElement('div', {
          className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
          onClick: handleBackdropClick
        },
        React.createElement('div', {
            className: 'relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden',
            onClick: (e) => e.stopPropagation()
          },
          React.createElement('div', {
              className: 'flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'
            },
            React.createElement('h3', { className: 'font-bold text-gray-900' }, 'Notification Settings'),
            React.createElement('button', {
              onClick: () => setShowSettings(false),
              className: 'text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200'
            }, '✕')
          ),
          
          React.createElement('div', { className: 'p-4 space-y-4 max-h-96 overflow-y-auto' },
            // Enable notifications toggle
            React.createElement('label', { className: 'flex items-center justify-between cursor-pointer' },
              React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, 'Enable Notifications'),
              React.createElement('button', {
                onClick: toggleNotifications,
                className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  preferences.enabled ? 'bg-green-950' : 'bg-gray-300'
                }`,
                role: 'switch',
                'aria-checked': preferences.enabled
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`
                })
              )
            ),
            
            // Permission prompt when not enabled
            !preferences.enabled && React.createElement('div', { 
              className: 'mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs flex items-start gap-2' 
            },
              React.createElement('span', { className: 'text-base' }, '🔔'),
              React.createElement('span', null,
                'Turn on notifications to get updates about messages and listings. ',
                React.createElement('button', {
                  onClick: toggleNotifications,
                  className: 'font-medium underline'
                }, 'Allow now')
              )
            ),
            
            preferences.enabled && React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'border-t border-gray-200 pt-4' },
                React.createElement('p', { className: 'text-xs font-medium text-gray-500 mb-3' }, 'NOTIFICATION TYPES'),
                
                React.createElement('label', { className: 'flex items-center justify-between cursor-pointer py-2' },
                  React.createElement('span', { className: 'text-sm text-gray-700' }, 'Messages'),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: preferences.messageNotifications,
                    onChange: (e) => updatePreferences({ messageNotifications: e.target.checked }),
                    className: 'w-4 h-4 accent-green-900'
                  })
                ),
                
                React.createElement('label', { className: 'flex items-center justify-between cursor-pointer py-2' },
                  React.createElement('span', { className: 'text-sm text-gray-700' }, 'Listing Updates'),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: preferences.listingNotifications,
                    onChange: (e) => updatePreferences({ listingNotifications: e.target.checked }),
                    className: 'w-4 h-4 accent-green-900'
                  })
                ),
                
                React.createElement('label', { className: 'flex items-center justify-between cursor-pointer py-2' },
                  React.createElement('span', { className: 'text-sm text-gray-700' }, 'Reminders'),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: preferences.reminderNotifications,
                    onChange: (e) => updatePreferences({ reminderNotifications: e.target.checked }),
                    className: 'w-4 h-4 accent-green-900'
                  })
                )
              ),
              
              React.createElement('div', { className: 'border-t border-gray-200 pt-4' },
                React.createElement('p', { className: 'text-xs font-medium text-gray-500 mb-3' }, 'SOUND'),
                
                React.createElement('label', { className: 'flex items-center justify-between cursor-pointer py-2' },
                  React.createElement('span', { className: 'text-sm text-gray-700' }, 'Play Sound'),
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: preferences.soundEnabled,
                    onChange: (e) => updatePreferences({ soundEnabled: e.target.checked }),
                    className: 'w-4 h-4 accent-green-900'
                  })
                )
              )
            )
          ),
          
          React.createElement('div', { className: 'p-4 border-t border-gray-200 bg-gray-50' },
            React.createElement('button', {
              onClick: () => setShowSettings(false),
              className: 'w-full py-2 bg-green-950 text-white rounded-lg hover:bg-green-800 transition text-sm font-medium'
            }, 'Done')
          )
        )
      ),
      document.body
    );
  }
  
  // Main notification button and popover
  return React.createElement(React.Fragment, null,
    // Bell button
    React.createElement('button', {
        ref: bellRef,
        onClick: handleBellClick,
        className: 'notification-bell relative p-2 text-gray-600 hover:text-green-950 rounded-full hover:bg-gray-100 transition',
        'aria-label': 'Notifications'
      },
      React.createElement('svg', {
          className: 'w-5 h-5',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '2',
          d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
        })
      ),
      nonMessageUnreadCount > 0 && React.createElement('span', {
        className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1'
      }, nonMessageUnreadCount > 99 ? '99+' : nonMessageUnreadCount)
    ),
    
    // Notifications popover - UNIFIED STYLE
    showPopover && ReactDOM.createPortal(
      React.createElement('div', {
          className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
          onClick: handleBackdropClick
        },
        React.createElement('div', {
            className: 'relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden',
            onClick: (e) => e.stopPropagation()
          },
          // Header
          React.createElement('div', {
              className: 'flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'
            },
            React.createElement('h3', { className: 'font-bold text-gray-900' }, 'Notifications'),
            
            // Settings gear and toggle
            React.createElement('div', { className: 'flex items-center gap-2' },
              // Quick toggle
              React.createElement('button', {
                onClick: toggleNotifications,
                className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  preferences.enabled ? 'bg-green-950' : 'bg-gray-300'
                }`,
                title: preferences.enabled ? 'Notifications On' : 'Notifications Off'
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`
                })
              ),
              
              // Settings button
              React.createElement('button', {
                onClick: () => setShowSettings(true),
                className: 'p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200',
                title: 'Notification Settings'
              },
                React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  }),
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  })
                )
              )
            )
          ),
          
          // Notifications list
          React.createElement('div', { className: 'p-4 max-h-96 overflow-y-auto' },
            nonMessageNotifications.length === 0 ?
            React.createElement('div', { className: 'text-center py-12 text-gray-500' },
              React.createElement('svg', { className: 'w-16 h-16 mx-auto text-gray-300 mb-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: '2',
                  d: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
                })
              ),
              React.createElement('p', { className: 'text-lg font-medium mb-1' }, 'No notifications yet'),
              React.createElement('p', { className: 'text-sm' }, 'When you get updates, they\'ll appear here')
            ) :
            nonMessageNotifications.map(notification =>
              React.createElement('div', {
                  key: notification.id,
                  onClick: () => handleNotificationClick(notification),
                  className: `p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition last:border-0 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`
                },
                React.createElement('div', { className: 'flex justify-between items-start mb-1' },
                  React.createElement('p', { className: `text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}` },
                    notification.title
                  ),
                  React.createElement('span', { className: 'text-xs text-gray-400' }, formatTime(notification.timestamp))
                ),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-2' }, notification.body),
                
                React.createElement('span', {
                  className: `inline-block text-[10px] px-2 py-0.5 rounded-full ${
                    notification.type === 'listing' ? 'bg-blue-100 text-blue-700' :
                    notification.type === 'location' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`
                }, notification.type)
              )
            )
          ),
          
          // Footer buttons
          nonMessageNotifications.length > 0 && React.createElement('div', {
              className: 'flex justify-between p-3 border-t border-gray-200 bg-gray-50'
            },
            React.createElement('button', {
              onClick: markAllAsRead,
              className: 'text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 transition'
            }, 'Mark all as read'),
            
            React.createElement('button', {
              onClick: clearAll,
              className: 'text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded hover:bg-red-50 transition'
            }, 'Clear all')
          )
        )
      ),
      document.body
    )
  );
}

window.NotificationBell = NotificationBell;