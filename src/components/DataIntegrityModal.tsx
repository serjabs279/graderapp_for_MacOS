import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { runDataIntegrityCheck, IntegrityIssue, IssueSeverity } from '../utils/dataIntegrity';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Sparkles
} from 'lucide-react';

interface DataIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataIntegrityModal({ isOpen, onClose }: DataIntegrityModalProps) {
  const { projects, adviserClasses } = useApp();
  const [filter, setFilter] = useState<'all' | IssueSeverity>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Compute live report
  const report = useMemo(() => {
    // refreshTrigger is a dependency to force re-computation
    void refreshTrigger;
    return runDataIntegrityCheck(projects, adviserClasses);
  }, [projects, adviserClasses, refreshTrigger]);

  if (!isOpen) return null;

  const handleManualRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
      setIsScanning(false);
    }, 450);
  };

  const filteredIssues = report.issues.filter((issue) => {
    if (filter === 'all') return true;
    return issue.severity === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              report.criticalCount > 0
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : report.warningCount > 0
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}>
              {report.criticalCount > 0 ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : report.warningCount > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Data Health & Corruption Monitor
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Real-time
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audits all teacher assessments, scores, adviser matrix, and calculations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRescan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title="Re-run Diagnostics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-500' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Re-scan'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Summary Banner */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/20 dark:bg-slate-950/20">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Health Status</span>
            <div className="flex items-center gap-1.5 mt-2">
              {report.isHealthy ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">Healthy</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">Needs Attention</span>
                </>
              )}
            </div>
          </div>

          <div
            onClick={() => setFilter('critical')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              filter === 'critical'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
                : 'bg-white dark:bg-slate-850/80 border-slate-200/70 dark:border-slate-800 hover:border-rose-400/40'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Issues</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {report.criticalCount}
            </span>
          </div>

          <div
            onClick={() => setFilter('warning')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              filter === 'warning'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-slate-850/80 border-slate-200/70 dark:border-slate-800 hover:border-amber-400/40'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Warnings</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {report.warningCount}
            </span>
          </div>

          <div
            onClick={() => setFilter('info')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              filter === 'info'
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                : 'bg-white dark:bg-slate-850/80 border-slate-200/70 dark:border-slate-800 hover:border-sky-400/40'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notices</span>
            <span className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1">
              {report.infoCount}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({report.totalIssues})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'critical'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              Critical ({report.criticalCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              Warnings ({report.warningCount})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'info'
                  ? 'bg-sky-600 text-white'
                  : 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
              }`}
            >
              Notices ({report.infoCount})
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            Last scan: {report.scannedAt}
          </span>
        </div>

        {/* Issue List / Healthy State */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {report.issues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
                  <span>Zero Anomalies Detected</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  All student scores, formula inputs, highest possible scores, and advisory grade matrices pass integrity verification.
                </p>
              </div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No issues matching the selected filter.
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                  issue.severity === 'critical'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                    : issue.severity === 'warning'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                    : 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40 text-sky-900 dark:text-sky-200'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {issue.severity === 'critical' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tracking-tight">{issue.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-900/60 border border-current/20">
                      {issue.location}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {issue.description}
                  </p>
                  {issue.fixSuggestion && (
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-current/10">
                      <strong className="text-slate-700 dark:text-slate-200">Recommended fix: </strong>
                      {issue.fixSuggestion}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted local storage audit. No data sent to external servers.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
