import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { runDataIntegrityCheck, IssueSeverity } from '../utils/dataIntegrity';
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, RefreshCw, X, CheckCircle2, AlertCircle, FileCheck2 } from 'lucide-react';

interface DataIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataIntegrityModal({ isOpen, onClose }: DataIntegrityModalProps) {
  const { projects, adviserClasses } = useApp();
  const [filter, setFilter] = useState<'all' | IssueSeverity>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const report = useMemo(() => {
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
    <div className="ui-dialog-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="data-health-title" aria-describedby="data-health-description" className="ui-dialog max-w-3xl text-slate-900 dark:text-slate-100">
        <header className="ui-dialog-header items-start">
          <div className="min-w-0">
            <h2 id="data-health-title" className="ui-section-title">Data Health & Corruption Monitor</h2>
            <p id="data-health-description" className="ui-description">Audits all teacher assessments, scores, adviser matrix, and calculations.</p>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label="Close data health monitor">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="ui-dialog-body space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="ui-badge">Real-time</span>
            <button type="button" onClick={handleManualRescan} disabled={isScanning} className="ui-button" title="Re-run Diagnostics">
              <RefreshCw aria-hidden="true" className="size-4" />
              {isScanning ? 'Scanning...' : 'Re-scan'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
            <div className="ui-panel space-y-2 p-3">
              <span className="ui-label">Health Status</span>
              <div className="flex items-start gap-2 text-sm font-medium" role="status">
                {report.isHealthy ? (
                  <><CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600" /><span>Healthy</span></>
                ) : (
                  <><AlertCircle aria-hidden="true" className="size-4 shrink-0 text-red-600" /><span>Needs Attention</span></>
                )}
              </div>
            </div>
            {[
              { value: 'critical' as const, label: 'Critical Issues', count: report.criticalCount },
              { value: 'warning' as const, label: 'Warnings', count: report.warningCount },
              { value: 'info' as const, label: 'Notices', count: report.infoCount },
            ].map(({ value, label, count }) => (
              <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className="ui-panel p-3 text-left aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 dark:aria-pressed:bg-emerald-950/40">
                <span className="ui-label">{label}</span>
                <span className="mt-1 block text-xl font-semibold">{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="ui-tabs" aria-label="Issue severity">
              <button type="button" onClick={() => setFilter('all')} className="ui-tab tabular-nums" aria-pressed={filter === 'all'}>All ({report.totalIssues})</button>
              <button type="button" onClick={() => setFilter('critical')} className="ui-tab tabular-nums" aria-pressed={filter === 'critical'}>Critical ({report.criticalCount})</button>
              <button type="button" onClick={() => setFilter('warning')} className="ui-tab tabular-nums" aria-pressed={filter === 'warning'}>Warnings ({report.warningCount})</button>
              <button type="button" onClick={() => setFilter('info')} className="ui-tab tabular-nums" aria-pressed={filter === 'info'}>Notices ({report.infoCount})</button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums" role="status">Last scan: {report.scannedAt}</p>
          </div>

          <div className="space-y-3">
            {report.issues.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <FileCheck2 aria-hidden="true" className="size-8 text-emerald-600" />
                <h3 className="ui-section-title">Zero Anomalies Detected</h3>
                <p className="ui-description max-w-sm">All student scores, formula inputs, highest possible scores, and advisory grade matrices pass integrity verification.</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-pretty text-sm text-slate-600 dark:text-slate-400">No issues matching the selected filter.</p>
                <button type="button" className="ui-button" onClick={() => setFilter('all')}>Show all issues</button>
              </div>
            ) : filteredIssues.map((issue) => (
              <article key={issue.id} className="ui-panel flex items-start gap-3 p-4">
                <div aria-hidden="true" className="mt-0.5 shrink-0">
                  {issue.severity === 'critical' ? <ShieldAlert className="size-5 text-red-600 dark:text-red-400" />
                    : issue.severity === 'warning' ? <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                    : <Info className="size-5 text-slate-500 dark:text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1 space-y-2 break-words">
                  <h3 className="text-balance text-sm font-semibold">{issue.title}</h3>
                  <div className="flex flex-wrap gap-2"><span className="ui-badge">{issue.severity}</span><span className="ui-badge break-all">{issue.location}</span></div>
                  <p className="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issue.description}</p>
                  {issue.fixSuggestion && (
                    <p className="border-t border-slate-200 pt-2 text-pretty text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                      <strong className="font-medium text-slate-800 dark:text-slate-200">Recommended fix: </strong>{issue.fixSuggestion}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="flex items-start gap-2 text-pretty text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
            Encrypted local storage audit. No data sent to external servers.
          </p>
        </div>
        <footer className="ui-dialog-footer">
          <button type="button" onClick={onClose} className="ui-button-primary">Dismiss</button>
        </footer>
      </section>
    </div>
  );
}
