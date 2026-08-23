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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-amber-500" /> Override Log
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit trail of all manual adjustments and overrides in this class.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-bold text-slate-500 min-w-[140px]">Date & Time</th>
                <th className="px-6 py-4 font-bold text-slate-500 min-w-[140px]">Adviser</th>
                <th className="px-6 py-4 font-bold text-slate-500 min-w-[160px]">Student / Subject</th>
                <th className="px-6 py-4 font-bold text-slate-500">Action</th>
                <th className="px-6 py-4 font-bold text-slate-500 min-w-[160px]">Changes</th>
                <th className="px-6 py-4 font-bold text-slate-500 min-w-[140px]">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
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
                      <div className="font-bold text-slate-700 dark:text-slate-300">{date.toLocaleDateString()}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{date.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                      {log.adviserName}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      {log.studentName !== 'ALL' && (
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{log.studentName}</span>
                          <div className="text-[9px] font-mono text-slate-400">{log.studentLRN}</div>
                        </div>
                      )}
                      {log.subjectName && (
                        <div className="mt-1">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-500">{log.subjectName} ({log.quarterKey})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 dark:border-slate-800">
                      {(log.previousValue || log.newValue) ? (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          {log.previousValue && <span className="text-red-500 line-through bg-red-50 dark:bg-red-950/30 px-1 rounded truncate max-w-[100px]">{log.previousValue}</span>}
                          {log.previousValue && log.newValue && <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />}
                          {log.newValue && <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded truncate max-w-[100px]">{log.newValue}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400 text-xs italic">
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
