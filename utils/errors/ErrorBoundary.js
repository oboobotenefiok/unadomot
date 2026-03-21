// utils/errors/ErrorBoundary.js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error beautifully
    ErrorLogger.critical(error, {
      component: this.props.componentName || 'Unknown',
      errorInfo,
      ...this.props.context
    });

    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return React.createElement(ErrorFallback, {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        resetError: this.handleReset,
        fallback: this.props.fallback
      });
    }

    return this.props.children;
  }
}

window.ErrorBoundary = ErrorBoundary;