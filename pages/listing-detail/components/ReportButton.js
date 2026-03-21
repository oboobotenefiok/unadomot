// pages/listing-detail/components/ReportButton.js
function ReportButton({ isOwner, user, onClick }) {
  if (isOwner || !user) return null;

  return React.createElement('div', { className: 'mt-4 text-center' },
    React.createElement('button', {
      onClick: onClick,
      className: 'text-red-400 hover:text-red-500 text-sm transition'
    }, '🚩 Report this listing')
  );
}

window.ReportButton = ReportButton;