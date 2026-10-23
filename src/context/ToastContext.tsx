import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, X, Download, Upload } from 'lucide-react';
import { toastEmitter, globalToast, ToastType, ToastItem } from './toastEmitter';

export { globalToast };
export type { ToastType, ToastItem };

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
    loading: (message: string, title?: string) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration = 4000): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const item: ToastItem = { id, type, title, message, duration, createdAt: Date.now() };
    setToasts(prev => [item, ...prev.slice(0, 4)]);
    return id;
  }, []);

  useEffect(() => {
    return toastEmitter.subscribe(
      (item) => setToasts(prev => [item, ...prev.slice(0, 4)]),
      (id) => setToasts(prev => prev.filter(t => t.id !== id))
    );
  }, []);

  const toastMethods = {
    success: (message: string, title = 'Success', duration = 4000) => showToast('success', message, title, duration),
    error: (message: string, title = 'Error', duration = 5000) => showToast('error', message, title, duration),
    info: (message: string, title = 'Information', duration = 4000) => showToast('info', message, title, duration),
    warning: (message: string, title = 'Warning', duration = 4500) => showToast('warning', message, title, duration),
    loading: (message: string, title = 'Loading...') => showToast('loading', message, title, 0),
    dismiss: dismissToast,
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast: toastMethods }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      showToast: globalToast.show,
      dismissToast: globalToast.dismiss,
      toast: globalToast,
    };
  }
  return ctx;
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="ui-toast-container"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return () => {};
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  const isExport = item.title?.toLowerCase().includes('export') || item.message.toLowerCase().includes('export') || item.message.toLowerCase().includes('download');
  const isImport = item.title?.toLowerCase().includes('import') || item.message.toLowerCase().includes('import') || item.message.toLowerCase().includes('upload');

  const config = {
    success: {
      icon: isExport ? <Download className="size-5" /> : isImport ? <Upload className="size-5" /> : <CheckCircle2 className="size-5" />,
      accent: 'text-emerald-600 dark:text-emerald-400',
      edge: 'border-l-emerald-500',
    },
    error: {
      icon: <AlertCircle className="size-5" />,
      accent: 'text-rose-600 dark:text-rose-400',
      edge: 'border-l-rose-500',
    },
    warning: {
      icon: <AlertTriangle className="size-5" />,
      accent: 'text-amber-600 dark:text-amber-400',
      edge: 'border-l-amber-500',
    },
    info: {
      icon: <Info className="size-5" />,
      accent: 'text-slate-600 dark:text-slate-300',
      edge: 'border-l-slate-400',
    },
    loading: {
      icon: <Loader2 className="size-5 animate-spin" />,
      accent: 'text-slate-600 dark:text-slate-300',
      edge: 'border-l-slate-400',
    },
  }[item.type];

  const isUrgent = item.type === 'error' || item.type === 'warning';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-900 ${config.edge}`}
    >
      <span className={`shrink-0 ${config.accent}`} aria-hidden="true">
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        {item.title && (
          <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.title}
          </h4>
        )}
        <p className="text-pretty text-sm leading-snug break-words text-slate-600 dark:text-slate-300">
          {item.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="ui-icon-button size-8 shrink-0 rounded-md p-0"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
