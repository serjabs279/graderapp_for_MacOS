import React from 'react';
import { AdviserClass } from '../../types';
import { History, ShieldAlert, ArrowRight } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
}

export default function OverrideLogTab({ adviserClass }: Props) {
  // Logs are stored directly on the adviserClass
  const classLogs = (adviserClass.overrideLog || [])
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="adviser-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="adviser-heading">
            <History className="h-5 w-5 shrink-0 text-amber-600" /> Override log
          </h2>
          <p className="adviser-description">Audit trail of all manual adjustments and overrides in this class.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-medium text-slate-500 min-w-[140px]">Date & Time</th>
                <th className="px-6 py-4 font-medium text-slate-500 min-w-[140px]">Adviser</th>
                <th className="px-6 py-4 font-medium text-slate-500 min-w-[160px]">Student / Subject</th>
                <th className="px-6 py-4 font-medium text-slate-500">Action</th>
                <th className="px-6 py-4 font-medium text-slate-500 min-w-[160px]">Changes</th>
                <th className="px-6 py-4 font-medium text-slate-500 min-w-[140px]">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500">
                    <ShieldAlert className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    No manual overrides have been recorded yet.
                  </td>
                </tr>
              ) : null}
              {classLogs.map((log, idx) => {
                const date = new Date(log.timestamp);
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{date.toLocaleDateString()}</div>
                      <div className="text-sm tabular-nums text-slate-500 mt-0.5">{date.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                      {log.adviserName}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      {log.studentName !== 'ALL' && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{log.studentName}</span>
                          <div className="text-sm tabular-nums text-slate-500">{log.studentLRN}</div>
                        </div>
                      )}
                      {log.subjectName && (
                        <div className="mt-1">
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-500">{log.subjectName} ({log.quarterKey})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      {(log.previousValue || log.newValue) ? (
                        <div className="flex items-center gap-2 text-sm tabular-nums">
                          {log.previousValue && <span className="text-red-500 line-through bg-red-50 dark:bg-red-950/30 px-1 rounded truncate max-w-[100px]">{log.previousValue}</span>}
                          {log.previousValue && log.newValue && <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />}
                          {log.newValue && <span className="text-slate-600 font-medium bg-slate-50 dark:bg-slate-950/30 px-1 rounded truncate max-w-[100px]">{log.newValue}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400 text-sm italic">
                      "{log.reason}"
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
