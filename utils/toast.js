// utils/toast.js - Centralized toast system

const ToastHelpers = {
  show: function(message, type = 'success', duration = 3000) {
    const toastEvent = new CustomEvent('show-toast', {
      detail: { message, type, duration }
    });
    window.dispatchEvent(toastEvent);
  },
  
  success: function(message) {
    this.show(message, 'success');
  },
  
  error: function(message) {
    this.show(message, 'error');
  },
  
  warning: function(message) {
    this.show(message, 'warning');
  },
  
  info: function(message) {
    this.show(message, 'info');
  }
};

window.ToastHelpers = ToastHelpers;