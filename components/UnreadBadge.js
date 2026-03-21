
function UnreadBadge({ count, className = '' }) {

if (!count || count === 0) return null;

const displayCount = typeof count === 'number' && count > 99 ? '99+' : count;

return React.createElement('span', {
className: `absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${className}`
}, displayCount);
}

window.UnreadBadge = UnreadBadge;