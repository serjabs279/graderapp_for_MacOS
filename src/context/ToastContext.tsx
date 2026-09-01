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
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
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
      border: 'border-emerald-500/30 dark:border-emerald-500/40',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-950 dark:text-emerald-200',
      barBg: 'bg-emerald-500',
      badge: isExport ? 'EXPORT COMPLETE' : isImport ? 'IMPORT COMPLETE' : 'SUCCESS',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: isExport ? <Download className="h-5 w-5" /> : isImport ? <Upload className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />,
    },
    error: {
      border: 'border-rose-500/30 dark:border-rose-500/40',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
      titleColor: 'text-rose-950 dark:text-rose-200',
      barBg: 'bg-rose-500',
      badge: 'FAILED',
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: <AlertCircle className="h-5 w-5" />,
    },
    warning: {
      border: 'border-amber-500/30 dark:border-amber-500/40',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-950 dark:text-amber-200',
      barBg: 'bg-amber-500',
      badge: 'ATTENTION',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    info: {
      border: 'border-indigo-500/30 dark:border-indigo-500/40',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
      titleColor: 'text-indigo-950 dark:text-indigo-200',
      barBg: 'bg-indigo-500',
      badge: 'NOTICE',
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      icon: <Info className="h-5 w-5" />,
    },
    loading: {
      border: 'border-cyan-500/30 dark:border-cyan-500/40',
      bg: 'bg-white/95 dark:bg-slate-900/95',
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
      titleColor: 'text-cyan-950 dark:text-cyan-200',
      barBg: 'bg-cyan-500',
      badge: 'IN PROGRESS',
      badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
    },
  }[item.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex flex-col rounded-2xl border shadow-xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 transition-all ${config.bg} ${config.border}`}
    >
      <div className="p-4 flex items-start gap-3.5">
        <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${config.badgeColor}`}>
              {config.badge}
            </span>
            {item.title && (
              <h4 className={`text-xs font-black truncate ${config.titleColor}`}>
                {item.title}
              </h4>
            )}
          </div>
          <p className="text-xs text-slate-650 dark:text-slate-300 font-medium leading-snug break-words">
            {item.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(item.id)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {item.duration && item.duration > 0 && (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full ${config.barBg} transition-all`}
            style={{
              animation: `toast-progress ${item.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}
