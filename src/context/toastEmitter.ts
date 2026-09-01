export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, 0 = infinite
  createdAt: number;
}

type ToastListener = (toast: ToastItem) => void;
type DismissListener = (id: string) => void;

const toastListeners = new Set<ToastListener>();
const dismissListeners = new Set<DismissListener>();

export const toastEmitter = {
  subscribe: (onToast: ToastListener, onDismiss: DismissListener) => {
    toastListeners.add(onToast);
    dismissListeners.add(onDismiss);
    return () => {
      toastListeners.delete(onToast);
      dismissListeners.delete(onDismiss);
    };
  },
  emit: (item: ToastItem) => {
    toastListeners.forEach(fn => fn(item));
  },
  dismiss: (id: string) => {
    dismissListeners.forEach(fn => fn(id));
  },
};

export const globalToast = {
  show: (type: ToastType, message: string, title?: string, duration = 4000): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const item: ToastItem = { id, type, title, message, duration, createdAt: Date.now() };
    toastEmitter.emit(item);
    return id;
  },
  success: (message: string, title = 'Operation Successful', duration = 4000) => globalToast.show('success', message, title, duration),
  error: (message: string, title = 'Operation Failed', duration = 5000) => globalToast.show('error', message, title, duration),
  info: (message: string, title = 'Information', duration = 4000) => globalToast.show('info', message, title, duration),
  warning: (message: string, title = 'Attention Required', duration = 4500) => globalToast.show('warning', message, title, duration),
  loading: (message: string, title = 'Processing...') => globalToast.show('loading', message, title, 0),
  dismiss: (id: string) => toastEmitter.dismiss(id),
};
