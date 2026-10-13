import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { errorLogger, LogEntry, LogLevel, LogCategory } from '../utils/errorLogger';
import {
  X,
  Bug,
  RefreshCw,
  Trash2,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
  Clock,
  Filter,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface DevErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_STYLES: Record<LogLevel, { pill: string; icon: React.ReactNode; row: string }> = {
  critical: {
    pill: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    row: 'border-l-2 border-rose-500 bg-rose-950/10',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
  },
  error: {
    pill: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
    row: 'border-l-2 border-orange-500 bg-orange-950/10',
    icon: <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
  },
  warning: {
    pill: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    row: 'border-l-2 border-amber-500 bg-amber-950/10',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
  },
  info: {
    pill: 'bg-sky-500/15 border-sky-500/40 text-sky-400',
    row: 'border-l-2 border-sky-600 bg-sky-950/10',
    icon: <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
  }
};

const CATEGORY_ICONS: Record<LogCategory, React.ReactNode> = {
  runtime: <Zap className="w-3 h-3" />,
  promise: <AlertCircle className="w-3 h-3" />,
  manual: <Bug className="w-3 h-3" />,
  calculation: <AlertTriangle className="w-3 h-3" />,
  persistence: <AlertCircle className="w-3 h-3" />,
  render: <ShieldAlert className="w-3 h-3" />,
  network: <AlertCircle className="w-3 h-3" />
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
    <div className={`rounded-lg ${style.row} font-mono text-[11px] overflow-hidden`}>
      {/* Header Row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition cursor-pointer"
      >
        {style.icon}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wide ${style.pill}`}>
              {entry.level}
            </span>
            <span className="text-slate-500 dark:text-slate-500 flex items-center gap-1">
              {CATEGORY_ICONS[entry.category]}
              {entry.category}
            </span>
            {entry.source && (
              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                {entry.source}
              </span>
            )}
          </div>
          <p className="text-slate-300 dark:text-slate-200 text-[11px] leading-snug font-sans font-medium break-words">
            {entry.message}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {entry.relativeTime}
          </span>
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5">
          {/* Timestamp & session */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-slate-500">{entry.timestamp}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600">Session: {entry.sessionId}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px] transition cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Stack Trace */}
          {entry.stack && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stack Trace</div>
              <pre className="text-[10px] text-rose-300/80 bg-black/40 rounded-lg p-2.5 overflow-x-auto max-h-48 leading-relaxed whitespace-pre-wrap break-all">
                {entry.stack}
              </pre>
            </div>
          )}

          {/* Context */}
          {entry.context && Object.keys(entry.context).length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context</div>
              <pre className="text-[10px] text-sky-300/80 bg-black/40 rounded-lg p-2.5 overflow-x-auto max-h-36 leading-relaxed">
                {JSON.stringify(entry.context, null, 2)}
              </pre>
            </div>
          )}

          {/* User Agent */}
          {entry.userAgent && (
            <div className="text-[10px] text-slate-600 break-all">{entry.userAgent}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DevErrorLogModal({ isOpen, onClose }: DevErrorLogModalProps) {
  const { authUsername, authPassword } = useApp();

  // ─── Auth gate with Universal Developer PIN ──────────────────────────────
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

  // ─── Filter State ──────────────────────────────────────────────────────────
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

  const handleDownload = () => {
    const json = errorLogger.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `srphs_dev_error_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    errorLogger.info('Dev log exported', 'DevErrorLogModal.tsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 tracking-tight">Developer Error Log</h2>
              <p className="text-[10px] text-slate-500">SRPHS App — Internal Diagnostics Console</p>
            </div>
            <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              PRIVATE
            </span>
          </div>
          <button
            onClick={() => { onClose(); setUnlocked(false); setPinInput(''); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Auth Gate ──────────────────────────────────────────────────────── */}
        {!unlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Lock className="w-7 h-7 text-rose-500" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-200">Developer Console Access</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Enter your Universal Developer PIN to view internal error traceback logs and bug reports.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter Universal Developer PIN"
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500/50 transition text-center tracking-widest"
              />
              {pinError && (
                <p className="text-xs text-rose-400 font-bold">{pinError}</p>
              )}
              <button
                onClick={handleUnlock}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black rounded-xl transition cursor-pointer"
              >
                <Terminal className="w-4 h-4" /> Access Error Console
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ─── Summary Bar ──────────────────────────────────────────────── */}
            <div className="px-5 py-3 border-b border-slate-800/80 flex items-center gap-3 flex-wrap bg-slate-950/60 shrink-0">
              {[
                { label: 'Critical', count: summary.critical, color: 'text-rose-400', filter: 'critical' as LogLevel },
                { label: 'Errors', count: summary.errors, color: 'text-orange-400', filter: 'error' as LogLevel },
                { label: 'Warnings', count: summary.warnings, color: 'text-amber-400', filter: 'warning' as LogLevel },
                { label: 'Info', count: summary.info, color: 'text-sky-400', filter: 'info' as LogLevel },
              ].map(({ label, count, color, filter }) => (
                <button
                  key={label}
                  onClick={() => setLevelFilter(levelFilter === filter ? 'all' : filter)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border ${
                    levelFilter === filter
                      ? 'bg-slate-800 border-slate-600'
                      : 'border-slate-800/60 hover:bg-slate-900'
                  }`}
                >
                  <span className={color}>{count}</span>
                  <span className="text-slate-400">{label}</span>
                </button>
              ))}
              <div className="flex-1" />
              <span className="text-[10px] text-slate-600">
                Session: <span className="font-mono text-slate-500">{summary.sessionId}</span>
              </span>
              <span className="text-[10px] text-slate-600">
                Total: <span className="text-slate-400 font-bold">{summary.total}</span>
              </span>
            </div>

            {/* ─── Filter & Search Bar ──────────────────────────────────────── */}
            <div className="px-5 py-2.5 border-b border-slate-800/80 flex items-center gap-2 flex-wrap bg-slate-950/40 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as LogCategory | 'all')}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="all">All Categories</option>
                {(['runtime', 'promise', 'manual', 'calculation', 'persistence', 'render', 'network'] as LogCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Session toggle */}
              <button
                onClick={() => setSessionOnly(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                  sessionOnly
                    ? 'bg-indigo-900/50 border-indigo-700 text-indigo-300'
                    : 'border-slate-800 text-slate-500 hover:bg-slate-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                Current Session Only
              </button>
              {/* Search */}
              <input
                type="text"
                value={expandedSearch}
                onChange={e => setExpandedSearch(e.target.value)}
                placeholder="Search message, source, stack..."
                className="flex-1 min-w-[160px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none"
              />
              {/* Actions */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-900 transition cursor-pointer"
                  title="Export JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer"
                  title="Clear All Logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ─── Log Entries ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {entries.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-300">No Log Entries Found</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {levelFilter !== 'all' || categoryFilter !== 'all' || sessionOnly
                        ? 'No entries match the current filter.'
                        : 'The error log is empty. No anomalies recorded.'}
                    </p>
                  </div>
                </div>
              ) : (
                entries.map(entry => <LogCard key={entry.id} entry={entry} />)
              )}
            </div>

            {/* ─── Footer ──────────────────────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/60 shrink-0 text-[10px] text-slate-600">
              <span>Showing {entries.length} of {summary.total} entries</span>
              <button
                onClick={() => { setUnlocked(false); setPinInput(''); }}
                className="flex items-center gap-1 text-slate-600 hover:text-rose-400 transition cursor-pointer"
              >
                <Lock className="w-3 h-3" /> Lock Console
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
