import React, { Component } from 'react';
import ErrorFallback from './ErrorFallback';
import { captureError } from '../../services/monitoringService';
import { sanitizeLogArgs } from '../../utils/logSanitizer';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      ...sanitizeLogArgs(['ErrorBoundary caught:', error, errorInfo])
    );
    captureError(error, {
      tags: { component: 'ErrorBoundary' },
      extra: { componentStack: errorInfo?.componentStack },
    });
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
