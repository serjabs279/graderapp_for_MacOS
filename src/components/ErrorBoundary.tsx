import React from 'react';
import { errorLogger } from '../utils/errorLogger';

interface ErrorBoundaryState {
  error: Error | null;
}

const DATA_KEYS = ['srphs_projects_p2', 'srphs_adviser_classes', 'srphs_settings_p2'];

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    errorLogger.renderError(error.message, info.componentStack ?? undefined, { stack: error.stack });
  }

  private downloadRecoveryData = (): void => {
    const payload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      reason: 'crash-recovery',
    };
    for (const key of DATA_KEYS) {
      const raw = localStorage.getItem(key);
      try {
        payload[key] = raw ? JSON.parse(raw) : null;
      } catch {
        payload[key] = raw;
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `srphs-emergency-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-ui min-h-dvh flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6">
        <section aria-labelledby="application-error-title" className="ui-panel w-full min-w-0 max-w-lg p-4 sm:p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Application Error</p>
            <h1 id="application-error-title" className="ui-heading text-balance">Something went wrong while rendering this screen.</h1>
            <p className="ui-description text-pretty">
              Your saved data is still on this device. Download a recovery copy before reloading, then open the app again.
            </p>
          </div>

          <pre tabIndex={0} aria-label="Error details" className="max-h-40 overflow-auto rounded-lg bg-slate-100 dark:bg-slate-950 p-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>

          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={this.downloadRecoveryData} className="ui-button-primary flex-1">
              Download Recovery Data
            </button>
            <button type="button" onClick={() => window.location.reload()} className="ui-button flex-1">
              Reload App
            </button>
          </div>
        </section>
      </main>
    );
  }
}
