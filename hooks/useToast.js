// hooks/useToast.js - Hook for toast functionality

function useToast() {
  const [toast, setToast] = React.useState({ show: false, message: '', type: 'success' });
  const timeoutRef = React.useRef(null);
  
  React.useEffect(() => {
    const handleToast = (e) => {
      show(e.detail.message, e.detail.type, e.detail.duration);
    };
    
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);
  
  const show = React.useCallback((message, type = 'success', duration = 3000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setToast({ show: true, message, type });
    
    timeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, []);
  
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  const ToastComponent = React.useMemo(() => {
    if (!toast.show) return null;
    
    const bgColor = toast.type === 'success' ? 'bg-green-600' :
      toast.type === 'error' ? 'bg-red-600' :
      toast.type === 'warning' ? 'bg-yellow-600' :
      'bg-blue-600';
    
    return React.createElement('div', {
      className: `fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-fade-in-up ${bgColor}`
    }, toast.message);
  }, [toast]);
  
  return {
    showToast: show,
    toast,
    ToastComponent
  };
}

window.useToast = useToast;