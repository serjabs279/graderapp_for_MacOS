/**
 * SRPHS Error & Anomaly Logger
 * 
 * Captures runtime errors, promise rejections, and manual log entries.
 * Stores traceback logs in localStorage with full stack traces, timestamps,
 * component context, and severity levels.
 * 
 * This is a DEVELOPER-ONLY utility. Logs are hidden behind credentials in Settings.
 */

import { APP_VERSION } from '../types';

export type LogLevel = 'error' | 'warning' | 'info' | 'critical';
export type LogCategory = 'runtime' | 'promise' | 'manual' | 'calculation' | 'persistence' | 'render' | 'network';

export interface LogEntry {
  id: string;
  level: LogLevel;
  category: LogCategory;
  timestamp: string;        // ISO string
  relativeTime: string;     // e.g., "5 minutes ago"
  message: string;
  source?: string;          // file/component name
  stack?: string;           // full stack trace
  context?: Record<string, unknown>; // extra key/value data
  userAgent?: string;
  appVersion: string;
  sessionId: string;
}

const STORAGE_KEY = 'srphs_dev_error_log';
const MAX_LOG_ENTRIES = 200;
const MAX_MESSAGE_CHARS = 2000;
const MAX_STACK_CHARS = 6000;
const MAX_CONSOLE_ARG_CHARS = 500;

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated]`;
}

function describeArg(arg: unknown): string {
  if (arg instanceof Error) return arg.message;
  if (typeof arg === 'object') {
    try { return truncate(JSON.stringify(arg), MAX_CONSOLE_ARG_CHARS) ?? String(arg); } catch { return String(arg); }
  }
  return truncate(String(arg), MAX_CONSOLE_ARG_CHARS) ?? String(arg);
}

// Unique session ID per page load
const SESSION_ID = `sess_${Date.now().toString(36)}`;

function generateId(): string {
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const ts = new Date(isoTimestamp).getTime();
  const diffMs = now - ts;

  if (diffMs < 1000) return 'just now';
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

class ErrorLogger {
  private _entries: LogEntry[] = [];
  private _isInstalled = false;

  constructor() {
    this._load();
  }

  // ─── Load & Save ──────────────────────────────────────────────────────────

  private _load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._entries = JSON.parse(raw) as LogEntry[];
      }
    } catch {
      this._entries = [];
    }
  }

  private _save(): void {
    try {
      // Trim to max entries (keep most recent)
      if (this._entries.length > MAX_LOG_ENTRIES) {
        this._entries = this._entries.slice(-MAX_LOG_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
    } catch {
      // Quota exhausted: keep a short tail so logging never blocks app data.
      try {
        this._entries = this._entries.slice(-50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
      } catch {
        // localStorage unavailable — silent fail
      }
    }
  }

  // ─── Install Global Listeners ─────────────────────────────────────────────

  install(): void {
    if (this._isInstalled) return;
    this._isInstalled = true;

    // Capture uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this._push({
        level: 'critical',
        category: 'runtime',
        message: event.message || 'Unknown runtime error',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
        stack: event.error?.stack,
        context: {
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename,
          type: event.type
        }
      });
    });

    // Capture unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled Promise rejection';

      this._push({
        level: 'critical',
        category: 'promise',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        context: {
          reasonType: typeof reason,
          reasonString: String(reason)
        }
      });
    });

    // Override console.error to capture error logs from libraries
    const originalConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      const message = args.map(describeArg).join(' ');

      // Avoid duplicate tracking of our own logger calls
      if (message.includes('[ErrorLogger]')) return;

      const stack = args.find(a => a instanceof Error) as Error | undefined;

      this._push({
        level: 'error',
        category: 'runtime',
        message: `[console.error] ${message}`,
        stack: stack?.stack,
        context: { consoleArgs: args.map(String) }
      });
    };

    // Override console.warn to optionally capture warnings
    const originalConsoleWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
      originalConsoleWarn(...args);
      const message = args.map(describeArg).join(' ');
      if (message.includes('[ErrorLogger]')) return;

      this._push({
        level: 'warning',
        category: 'runtime',
        message: `[console.warn] ${message}`,
        context: { consoleArgs: args.map(String) }
      });
    };

    this.info('ErrorLogger installed & active', 'errorLogger.ts', { sessionId: SESSION_ID });
  }

  // ─── Core Push ─────────────────────────────────────────────────────────────

  private _push(options: {
    level: LogLevel;
    category: LogCategory;
    message: string;
    source?: string;
    stack?: string;
    context?: Record<string, unknown>;
  }): void {
    const now = new Date().toISOString();
    const entry: LogEntry = {
      id: generateId(),
      level: options.level,
      category: options.category,
      timestamp: now,
      relativeTime: 'just now',
      message: truncate(options.message, MAX_MESSAGE_CHARS) ?? options.message,
      source: options.source,
      stack: truncate(options.stack, MAX_STACK_CHARS),
      context: options.context,
      userAgent: navigator.userAgent,
      appVersion: APP_VERSION,
      sessionId: SESSION_ID
    };
    this._entries.push(entry);
    this._save();
  }

  // ─── Public Logging API ───────────────────────────────────────────────────

  /** Log a critical error with optional stack trace */
  error(message: string, source?: string, context?: Record<string, unknown>, stack?: string): void {
    this._push({ level: 'error', category: 'manual', message, source, stack, context });
  }

  /** Log a critical crash / unrecoverable error */
  critical(message: string, source?: string, context?: Record<string, unknown>, stack?: string): void {
    this._push({ level: 'critical', category: 'manual', message, source, stack, context });
  }

  /** Log a calculation anomaly (e.g. NaN grade, impossible score) */
  calcAnomaly(message: string, source?: string, context?: Record<string, unknown>): void {
    this._push({ level: 'warning', category: 'calculation', message, source, context });
  }

  /** Log a data persistence issue (localStorage read/write failure) */
  persistError(message: string, source?: string, context?: Record<string, unknown>, stack?: string): void {
    this._push({ level: 'error', category: 'persistence', message, source, stack, context });
  }

  /** Log a general warning */
  warn(message: string, source?: string, context?: Record<string, unknown>): void {
    this._push({ level: 'warning', category: 'manual', message, source, context });
  }

  /** Log an info event (navigation, user actions, milestones) */
  info(message: string, source?: string, context?: Record<string, unknown>): void {
    this._push({ level: 'info', category: 'manual', message, source, context });
  }

  /** Log a render error (React error boundary or suspense failure) */
  renderError(message: string, componentStack?: string, context?: Record<string, unknown>): void {
    this._push({ level: 'critical', category: 'render', message, source: 'React Renderer', stack: componentStack, context });
  }

  // ─── Query & Management ───────────────────────────────────────────────────

  /** Return all log entries (most recent first), with relative times updated */
  getAll(): LogEntry[] {
    return [...this._entries]
      .reverse()
      .map(e => ({ ...e, relativeTime: formatRelativeTime(e.timestamp) }));
  }

  /** Return entries filtered by level */
  getByLevel(level: LogLevel): LogEntry[] {
    return this.getAll().filter(e => e.level === level);
  }

  /** Return entries filtered by category */
  getByCategory(category: LogCategory): LogEntry[] {
    return this.getAll().filter(e => e.category === category);
  }

  /** Return entries for the current session only */
  getCurrentSession(): LogEntry[] {
    return this.getAll().filter(e => e.sessionId === SESSION_ID);
  }

  /** Return total count by severity */
  getSummary() {
    const all = this._entries;
    return {
      total: all.length,
      critical: all.filter(e => e.level === 'critical').length,
      errors: all.filter(e => e.level === 'error').length,
      warnings: all.filter(e => e.level === 'warning').length,
      info: all.filter(e => e.level === 'info').length,
      sessionId: SESSION_ID,
      oldestEntry: all[0]?.timestamp,
      newestEntry: all[all.length - 1]?.timestamp
    };
  }

  /** Export all logs as formatted JSON string */
  exportJSON(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      sessionId: SESSION_ID,
      summary: this.getSummary(),
      logs: this.getAll()
    }, null, 2);
  }

  /** Clear all stored logs */
  clearAll(): void {
    this._entries = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    this.info('Log history cleared by developer', 'errorLogger.ts');
  }

  /** Clear logs older than N days */
  clearOlderThan(days: number): number {
    const cutoff = Date.now() - days * 86_400_000;
    const before = this._entries.length;
    this._entries = this._entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    this._save();
    return before - this._entries.length;
  }
}

// Singleton export — import this anywhere in the app
export const errorLogger = new ErrorLogger();
