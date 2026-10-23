import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { errorLogger, LogEntry, LogLevel, LogCategory } from '../utils/errorLogger';
import { exportFile } from '../utils/fileExportAdapter';
import { X, Bug, RefreshCw, Trash2, Download, Copy, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, Zap, Clock, Terminal, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface DevErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_STYLES: Record<LogLevel, { pill: string; icon: React.ReactNode; row: string }> = {
  critical: {
    pill: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300',
    row: 'border-l-2 border-l-red-600',
    icon: <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-400" />
  },
  error: {
    pill: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300',
    row: 'border-l-2 border-l-red-600',
    icon: <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-400" />
  },
  warning: {
    pill: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
    row: 'border-l-2 border-l-amber-600',
    icon: <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
  },
  info: {
    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    row: 'border-l-2 border-l-slate-400',
    icon: <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-600 dark:text-slate-400" />
  }
};

const CATEGORY_ICONS: Record<LogCategory, React.ReactNode> = {
  runtime: <Zap aria-hidden="true" className="size-3.5" />,
  promise: <AlertCircle aria-hidden="true" className="size-3.5" />,
  manual: <Bug aria-hidden="true" className="size-3.5" />,
  calculation: <AlertTriangle aria-hidden="true" className="size-3.5" />,
  persistence: <AlertCircle aria-hidden="true" className="size-3.5" />,
  render: <ShieldAlert aria-hidden="true" className="size-3.5" />,
  network: <AlertCircle aria-hidden="true" className="size-3.5" />
};

function LogCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const style = LEVEL_STYLES[entry.level];
  const [copied, setCopied] = useState(false);

  const fullText = [
    `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`,
    `Message: ${entry.message}`,
    entry.source ? `Source: ${entry.source}` : '',
    entry.stack ? `\nStack Trace:\n${entry.stack}` : '',
    entry.context ? `\nContext: ${JSON.stringify(entry.context, null, 2)}` : '',
    `Session: ${entry.sessionId} | App: v${entry.appVersion}`
  ].filter(Boolean).join('\n');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className={`ui-panel min-w-0 overflow-hidden ${style.row}`}>
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} className="flex w-full min-w-0 cursor-pointer items-start gap-2 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
        {style.icon}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-md px-2 py-1 font-medium ${style.pill}`}>{entry.level}</span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">{CATEGORY_ICONS[entry.category]}{entry.category}</span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 tabular-nums"><Clock aria-hidden="true" className="size-3.5" />{entry.relativeTime}</span>
          </div>
          {entry.source && <p className="break-all font-mono text-xs text-slate-600 dark:text-slate-400">{entry.source}</p>}
          <p className="break-words text-pretty text-sm leading-relaxed text-slate-800 dark:text-slate-200">{entry.message}</p>
        </div>
        {expanded ? <ChevronDown aria-hidden="true" className="mt-1 size-4 shrink-0 text-slate-500" /> : <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-slate-500" />}
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="tabular-nums">{entry.timestamp}</span>
            <span className="break-all font-mono">Session: {entry.sessionId}</span>
            <button type="button" onClick={handleCopy} className="ui-button">
              {copied ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> : <Copy aria-hidden="true" className="size-4" />}
              <span role="status">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          {entry.stack && <div className="space-y-2">
            <h3 className="text-balance text-sm font-medium text-slate-800 dark:text-slate-200">Stack Trace</h3>
            <pre tabIndex={0} aria-label="Stack trace" className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">{entry.stack}</pre>
          </div>}
          {entry.context && Object.keys(entry.context).length > 0 && <div className="space-y-2">
            <h3 className="text-balance text-sm font-medium text-slate-800 dark:text-slate-200">Context</h3>
            <pre tabIndex={0} aria-label="Log context" className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">{JSON.stringify(entry.context, null, 2)}</pre>
          </div>}
          {entry.userAgent && <p className="break-all font-mono text-xs text-slate-600 dark:text-slate-400">{entry.userAgent}</p>}
        </div>
      )}
    </article>
  );
}

export default function DevErrorLogModal({ isOpen, onClose }: DevErrorLogModalProps) {
  const { authUsername, authPassword } = useApp();

  const UNIVERSAL_DEV_PIN = '12345';
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleUnlock = () => {
    if (pinInput === UNIVERSAL_DEV_PIN) {
      setUnlocked(true);
      setPinError('');
      errorLogger.info('Dev Log accessed via Universal PIN', 'DevErrorLogModal.tsx');
    } else {
      setPinError('Invalid Developer PIN. Access denied.');
    }
  };

  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');
  const [sessionOnly, setSessionOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSearch, setExpandedSearch] = useState('');

  const summary = useMemo(() => errorLogger.getSummary(), [refreshKey]);

  const entries = useMemo(() => {
    let all = errorLogger.getAll();
    if (sessionOnly) all = all.filter(e => e.sessionId === summary.sessionId);
    if (levelFilter !== 'all') all = all.filter(e => e.level === levelFilter);
    if (categoryFilter !== 'all') all = all.filter(e => e.category === categoryFilter);
    if (expandedSearch.trim()) {
      const q = expandedSearch.toLowerCase();
      all = all.filter(e =>
        e.message.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q) ||
        e.stack?.toLowerCase().includes(q)
      );
    }
    return all;
  }, [refreshKey, levelFilter, categoryFilter, sessionOnly, expandedSearch]);

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleClearAll = () => {
    if (confirm('Clear all error logs? This cannot be undone.')) {
      errorLogger.clearAll();
      handleRefresh();
    }
  };

  const handleDownload = async () => {
    const json = errorLogger.exportJSON();
    const filename = `srphs_dev_error_log_${new Date().toISOString().slice(0, 10)}.json`;
    const saved = await exportFile({ filename, content: json, mimeType: 'application/json', title: 'Export Dev Error Log' });
    if (saved) {
      errorLogger.info('Dev log exported', 'DevErrorLogModal.tsx');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-dialog-overlay z-[999]">
      <section role="dialog" aria-modal="true" aria-labelledby="developer-log-title" className="ui-dialog max-w-4xl">
        <header className="ui-dialog-header items-start">
          <div className="min-w-0">
            <h2 id="developer-log-title" className="ui-section-title">Developer Error Log</h2>
            <p className="ui-description">SRPHS App — Internal Diagnostics Console</p>
          </div>
          <button type="button" onClick={() => { onClose(); setUnlocked(false); setPinInput(''); }} className="ui-icon-button" aria-label="Close developer error log"><X aria-hidden="true" className="size-5" /></button>
        </header>

        <div className="ui-dialog-body space-y-5">
          <span className="ui-badge"><Lock aria-hidden="true" className="size-3.5" />Private</span>
          {!unlocked ? (
            <div className="mx-auto max-w-sm space-y-4 py-3">
              <h3 className="ui-section-title">Developer Console Access</h3>
              <p className="ui-description">Enter your Universal Developer PIN to view internal error traceback logs and bug reports.</p>
              <div className="space-y-2">
                <label htmlFor="developer-pin" className="ui-label">Universal Developer PIN</label>
                <input id="developer-pin" type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="Enter Universal Developer PIN" autoFocus aria-invalid={!!pinError} aria-describedby={pinError ? 'developer-pin-error' : undefined} className="ui-field" />
                {pinError && <p id="developer-pin-error" role="alert" className="text-sm text-red-700 dark:text-red-400">{pinError}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="ui-tabs" aria-label="Log level">
                <button type="button" onClick={() => setLevelFilter('all')} aria-pressed={levelFilter === 'all'} className="ui-tab tabular-nums">All ({summary.total})</button>
                {[
                  { label: 'Critical', count: summary.critical, filter: 'critical' as LogLevel },
                  { label: 'Errors', count: summary.errors, filter: 'error' as LogLevel },
                  { label: 'Warnings', count: summary.warnings, filter: 'warning' as LogLevel },
                  { label: 'Info', count: summary.info, filter: 'info' as LogLevel },
                ].map(({ label, count, filter }) => (
                  <button key={label} type="button" onClick={() => setLevelFilter(levelFilter === filter ? 'all' : filter)} aria-pressed={levelFilter === filter} className="ui-tab tabular-nums">{label} ({count})</button>
                ))}
              </div>
              <p className="break-all text-xs text-slate-600 dark:text-slate-400">Session: <span className="font-mono">{summary.sessionId}</span></p>
              <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <label htmlFor="log-category" className="ui-label">Category</label>
                  <select id="log-category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as LogCategory | 'all')} className="ui-field">
                    <option value="all">All Categories</option>
                    {(['runtime', 'promise', 'manual', 'calculation', 'persistence', 'render', 'network'] as LogCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="log-search" className="ui-label">Search logs</label>
                  <input id="log-search" type="text" value={expandedSearch} onChange={e => setExpandedSearch(e.target.value)} placeholder="Search message, source, stack..." className="ui-field" />
                </div>
                <button type="button" onClick={() => setSessionOnly(v => !v)} aria-pressed={sessionOnly} className="ui-tab justify-self-start"><Clock aria-hidden="true" className="size-4" />Current Session Only</button>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button type="button" onClick={handleRefresh} className="ui-icon-button" title="Refresh" aria-label="Refresh error logs"><RefreshCw aria-hidden="true" className="size-4" /></button>
                  <button type="button" onClick={handleClearAll} className="ui-button" title="Clear All Logs"><Trash2 aria-hidden="true" className="size-4 text-red-700 dark:text-red-400" />Clear All Logs</button>
                </div>
              </div>
              <div className="space-y-3">
                {entries.length === 0 ? (
                  <div className="space-y-3 py-8 text-center">
                    <CheckCircle2 aria-hidden="true" className="mx-auto size-8 text-emerald-600" />
                    <h3 className="ui-section-title">No Log Entries Found</h3>
                    <p className="ui-description">{levelFilter !== 'all' || categoryFilter !== 'all' || sessionOnly ? 'No entries match the current filter.' : 'The error log is empty. No anomalies recorded.'}</p>
                  </div>
                ) : entries.map(entry => <LogCard key={entry.id} entry={entry} />)}
              </div>
              <p role="status" className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">Showing {entries.length} of {summary.total} entries</p>
            </>
          )}
        </div>
        <footer className="ui-dialog-footer">
          {!unlocked ? <button type="button" onClick={handleUnlock} className="ui-button-primary"><Terminal aria-hidden="true" className="size-4" />Access Error Console</button> : <>
            <button type="button" onClick={() => { setUnlocked(false); setPinInput(''); }} className="ui-button"><Lock aria-hidden="true" className="size-4" />Lock Console</button>
            <button type="button" onClick={handleDownload} className="ui-button-primary"><Download aria-hidden="true" className="size-4" />Export JSON</button>
          </>}
        </footer>
      </section>
    </div>
  );
}
