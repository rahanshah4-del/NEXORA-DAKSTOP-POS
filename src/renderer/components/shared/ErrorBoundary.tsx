import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center h-64 p-8">
          <div className="text-center max-w-md">
            <div className="h-14 w-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-danger" />
            </div>
            <h2 className="text-lg font-semibold text-content mb-2">Something went wrong</h2>
            <p className="text-sm text-content-secondary mb-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <p className="text-xs text-content-tertiary mb-2">
              Please try refreshing or contact support if the issue persists.
            </p>
            <p className="text-xs text-content-tertiary mb-6">
              Nexora Solution &mdash; support@nexorasolution.online
            </p>
            <Button
              variant="secondary"
              onClick={this.handleReset}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
