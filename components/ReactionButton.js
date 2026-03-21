// components/ReactionButton.js - FIXED with null safety
function ReactionButton({
  contentType,
  contentId,
  reactionType = 'helpful',
  size = 'md',
  showCount = true,
  onToggle,
  className = ''
}) {
  const {
    counts,
    userReaction,
    loading,
    toggling,
    toggleReaction
  } = window.useReactions(contentType, contentId);
  
  const isActive = userReaction === reactionType;
  
  // ===== FIXED: Safely access counts with null check =====
  const count = counts && counts[reactionType] ? counts[reactionType] : 0;
  
  const getIcon = () => {
    switch (reactionType) {
      case 'like':
        return isActive ? '👍' : '👍';
      case 'love':
        return isActive ? '❤️' : '❤️';
      case 'laugh':
        return isActive ? '😄' : '😄';
      case 'helpful':
        return isActive ? '🙏' : '🙏';
      case 'support':
        return isActive ? '🤝' : '🤝';
      default:
        return '👍';
    }
  };
  
  const getButtonClass = () => {
    const base = 'inline-flex items-center gap-1 rounded-full transition';
    const sizes = {
      xs: 'text-xs px-2 py-1',
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-5 py-2.5'
    };
    
    const state = isActive ?
      'bg-green-100 text-green-700 border border-green-200' :
      'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200';
    
    return `${base} ${sizes[size]} ${state} ${className} ${toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`;
  };
  
  const handleClick = async (e) => {
    e.stopPropagation();
    
    if (loading || toggling) return;
    
    await toggleReaction(reactionType);
    
    if (onToggle) {
      onToggle({
        isActive: !isActive,
        reactionType,
        // ===== FIXED: Safely access count here too =====
        count: isActive ? count - 1 : count + 1
      });
    }
  };
  
  if (loading) {
    return React.createElement('div', {
        className: `inline-flex items-center gap-1 rounded-full bg-gray-100 animate-pulse ${className}`
      },
      React.createElement('span', { className: 'opacity-0' }, '⋯')
    );
  }
  
  return React.createElement('button', {
      onClick: handleClick,
      disabled: toggling,
      className: getButtonClass(),
      title: isActive ? `Remove ${reactionType}` : `Add ${reactionType}`
    },
    React.createElement('span', { className: 'text-base' }, getIcon()),
    showCount && count > 0 && React.createElement('span', { className: 'font-medium' }, count)
  );
}

window.ReactionButton = ReactionButton;