import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

class ChartErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.warn('Chart render failed, fallback to placeholder:', error.message);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--text-tertiary)',
            fontSize: 13,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>{this.props.fallbackLabel ?? '图表暂不可用'}</div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid var(--border-ink)',
              background: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChartErrorBoundary;
