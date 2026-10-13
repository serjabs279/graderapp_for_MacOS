import React, { useState, useEffect } from 'react';
import { autoSaver, AutoSaveStatus } from '../utils/autoSave';

export default function AutoSaveIndicator() {
  const [status, setStatus] = useState<AutoSaveStatus>(() => autoSaver.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(autoSaver.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // If there hasn't been any save and not currently saving, remain hidden or show initial state
  if (!status.isSaving && !status.lastSaveTime && !status.hasPendingChanges) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-lg pointer-events-none select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      {status.isSaving ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Saving...
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {status.lastSaveTime ? `Saved at ${status.lastSaveTime}` : 'All changes saved'}
          </span>
        </>
      )}
    </div>
  );
}
