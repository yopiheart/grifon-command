import React from 'react';
import { GlassPanel } from './GlassPanel';
import { GoldButton } from './GoldButton';

type FallbackRenderer = (error: Error, reset: () => void) => React.ReactNode;

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name?: string;
  fallback?: FallbackRenderer;
  onReset?: () => void;
  resetKey?: string | number;
  resetLabel?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function reportError(name: string, error: Error, info: React.ErrorInfo) {
  // Single seam for future error reporting (Sentry, etc.). Swap body only.
  console.error(`[ErrorBoundary:${name}]`, error, info.componentStack);
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(this.props.name ?? 'unnamed', error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-screen bg-zinc-950 font-sans flex items-center justify-center p-4">
        <GlassPanel className="w-full max-w-md p-8 text-white">
          <h2 className="text-[10px] font-mono text-[#FFCC00] tracking-[0.4em] uppercase mb-4">
            // SYSTEM_FAULT_DETECTED
          </h2>
          <p className="text-sm font-medium mb-2">A module has crashed.</p>
          <p className="text-xs font-mono text-zinc-400 break-words border border-red-900/50 bg-red-900/20 p-3 rounded-xl mb-6">
            {error.message || 'Unknown error'}
          </p>
          <GoldButton onClick={this.reset} className="w-full justify-center py-3">
            {this.props.resetLabel ?? 'RETURN'}
          </GoldButton>
          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
              FAULT_LOGGED // STATE_PRESERVED
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }
}
