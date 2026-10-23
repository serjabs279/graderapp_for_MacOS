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
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-40 flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)', right: 'calc(env(safe-area-inset-right, 0px) + 1rem)' }}
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-emerald-600" />
      <span className="tabular-nums">
        {status.isSaving ? 'Saving...' : status.lastSaveTime ? `Saved at ${status.lastSaveTime}` : 'All changes saved'}
      </span>
    </div>
  );
}
