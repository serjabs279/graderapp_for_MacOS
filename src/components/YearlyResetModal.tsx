import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Download, Trash2, CheckCircle2, ChevronRight, Shield, Calendar } from 'lucide-react';

/**
 * YearlyResetModal
 *
 * Shown automatically on April 30+ when the current school year's data
 * has not yet been archived for the year.
 *
 * Flow:
 *   Step 1 — Warning / explanation
 *   Step 2 — Force backup download (Proceed button locked until downloaded)
 *   Step 3 — Confirm full reset → execute → dismiss
 */
export default function YearlyResetModal() {
  const { backupData, globalSettings, performYearlyReset } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  // Compute next school year label from current (e.g. "2026-2027" → "2027-2028")
  const currentSY = globalSettings.activeSchoolYear ?? '2026-2027';
  const [startY, endY] = currentSY.split('-').map(Number);
  const nextSY = `${endY}-${endY + 1}`;

  const handleBackupDownload = () => {
    try {
      const jsonStr = backupData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `srphs_archive_SY${currentSY}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    } catch (err) {
      console.error('Archive download failed:', err);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    // Small delay so the user sees the spinner
    await new Promise(r => setTimeout(r, 600));
    performYearlyReset(nextSY);
    setResetting(false);
    setDone(true);
  };

  const handleClose = () => {
    // Reload so the fresh state is reflected everywhere
    window.location.reload();
  };

  // ── Step indicators ──────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Review' },
    { n: 2, label: 'Archive Backup' },
    { n: 3, label: 'Reset' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-b border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight">
                End-of-School-Year Reset
              </h2>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                SY {currentSY} has ended — time to prepare for SY {nextSY}
              </p>
            </div>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-1 mt-4">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  done || (step === 3 && s.n === 3)
                    ? s.n <= (done ? 3 : step) ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : s.n < step ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : s.n === step ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {(done && s.n <= 3) || (!done && s.n < step) ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span>{s.n}</span>
                  )}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1">

          {/* ── DONE ── */}
          {done && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">Reset Complete!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  The app has been reset for <span className="font-bold text-emerald-600 dark:text-emerald-400">SY {nextSY}</span>.
                  Your backup file is saved. The app will reload now.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm cursor-pointer transition-colors"
              >
                Reload App
              </button>
            </div>
          )}

          {/* ── STEP 1: Warning ── */}
          {!done && step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1.5">
                  <p className="font-bold">It is now the end of the school year.</p>
                  <p className="font-medium leading-relaxed">
                    To free up storage and prepare for <strong>SY {nextSY}</strong>, this app will
                    perform a full data reset — clearing all grading projects, adviser classes,
                    student records, and settings back to day-one defaults.
                  </p>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    ⚠ This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <Shield className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">What happens next:</p>
                  <ul className="list-disc list-inside space-y-1 font-medium">
                    <li>You will download a complete <strong>archive backup</strong> of SY {currentSY}</li>
                    <li>All current data will be wiped</li>
                    <li>The app restarts fresh for SY {nextSY}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Backup ── */}
          {!done && step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Before the reset, download your <strong>SY {currentSY}</strong> archive backup.
                Save it in a secure location (USB drive, Google Drive, etc.).
                You will not be able to proceed without downloading it.
              </p>

              <button
                onClick={handleBackupDownload}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm transition-all cursor-pointer border-2 ${
                  backupDownloaded
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700 text-white shadow-md shadow-amber-500/20'
                }`}
              >
                {backupDownloaded ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Archive Downloaded — Ready to Proceed
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download SY {currentSY} Archive Backup
                  </>
                )}
              </button>

              {backupDownloaded && (
                <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in duration-300">
                  ✓ Backup saved. You may now proceed to the reset.
                </p>
              )}

              {!backupDownloaded && (
                <p className="text-xs text-center text-slate-400 font-medium">
                  The "Proceed to Reset" button will unlock after the backup is downloaded.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirm Reset ── */}
          {!done && step === 3 && (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl">
                <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  <p className="font-black">Final confirmation required</p>
                  <p className="font-medium leading-relaxed">
                    Clicking <strong>"Reset for SY {nextSY}"</strong> will permanently erase
                    all data for SY {currentSY} and reinitialize the app for the new school year.
                  </p>
                  <p className="font-bold">Your backup file has been saved. This cannot be undone.</p>
                </div>
              </div>

              <button
                onClick={handleReset}
                disabled={resetting}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-2xl font-black text-sm cursor-pointer transition-all shadow-md shadow-red-500/20"
              >
                {resetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Reset for SY {nextSY}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3">
            {step === 1 && (
              <>
                <p className="text-[11px] text-slate-400 font-medium">This reminder will appear each startup until reset is complete.</p>
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
                >
                  Continue <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!backupDownloaded}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white disabled:text-slate-500 text-xs font-black rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  Proceed to Reset <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl cursor-pointer transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
