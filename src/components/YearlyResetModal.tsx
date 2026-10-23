import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Download, Trash2, CheckCircle2, ChevronRight, Shield, Calendar } from 'lucide-react';
import { exportFile } from '../utils/fileExportAdapter';
import { TypeToConfirmField } from './DangerConfirmModal';

export default function YearlyResetModal() {
  const { backupData, globalSettings, performYearlyReset } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const currentSY = globalSettings.activeSchoolYear ?? '2026-2027';
  const [startY, endY] = currentSY.split('-').map(Number);
  const nextSY = `${endY}-${endY + 1}`;

  const handleBackupDownload = async () => {
    try {
      const jsonStr = backupData();
      const filename = `srphs_archive_SY${currentSY}_${new Date().toISOString().split('T')[0]}.json`;
      const saved = await exportFile({
        filename,
        content: jsonStr,
        mimeType: 'application/json',
        title: 'Download Archive Backup',
      });
      if (saved) {
        setBackupDownloaded(true);
      }
    } catch (err) {
      console.error('Archive download failed:', err);
    }
  };

  const handleReset = async () => {
    if (confirmText.trim() !== 'INITIATE') return;
    setResetting(true);
    await new Promise(r => setTimeout(r, 600));
    performYearlyReset(nextSY);
    setResetting(false);
    setDone(true);
  };

  const handleClose = () => {
    window.location.reload();
  };

  const steps = [
    { n: 1, label: 'Review' },
    { n: 2, label: 'Archive Backup' },
    { n: 3, label: 'Reset' },
  ];

  return (
    <div className="ui-dialog-overlay z-[9999]">
      <section role="alertdialog" aria-modal="true" aria-labelledby="yearly-reset-title" aria-describedby="yearly-reset-description" className="ui-dialog max-w-lg">
        <header className="ui-dialog-header">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <Calendar aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <h2 id="yearly-reset-title" className="ui-section-title">End-of-School-Year Reset</h2>
                <p id="yearly-reset-description" className="ui-description tabular-nums">SY {currentSY} has ended — time to prepare for SY {nextSY}</p>
              </div>
            </div>
            <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label="Reset progress">
              {steps.map((s) => (
                <li key={s.n} aria-current={!done && step === s.n ? 'step' : undefined} className="ui-badge aria-[current=step]:bg-emerald-50 aria-[current=step]:text-emerald-800 dark:aria-[current=step]:bg-emerald-950/40 dark:aria-[current=step]:text-emerald-300">
                  {(done && s.n <= 3) || (!done && s.n < step) ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <span className="tabular-nums">{s.n}</span>}
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        </header>

        <div className="ui-dialog-body space-y-4">
          {done && (
            <div className="space-y-4 py-4 text-center" role="status">
              <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
              <h3 className="ui-section-title">Reset Complete!</h3>
              <p className="ui-description">The app has been reset for <span className="font-semibold text-emerald-700 dark:text-emerald-400">SY {nextSY}</span>.
                Your backup file is saved. The app will reload now.</p>
            </div>
          )}

          {!done && step === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                <div className="min-w-0 space-y-2 text-pretty text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">It is now the end of the school year.</p>
                  <p>To free up storage and prepare for <strong>SY {nextSY}</strong>, this app will
                    perform a full data reset — clearing all grading projects, adviser classes,
                    student records, and settings back to day-one defaults.</p>
                  <p className="font-semibold">⚠ This action is permanent and cannot be undone.</p>
                </div>
              </div>
              <div className="ui-notice">
                <Shield aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 space-y-2">
                  <h3 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">What happens next:</h3>
                  <ul className="list-disc space-y-2 pl-4">
                    <li>You will download a complete <strong>archive backup</strong> of SY {currentSY}</li>
                    <li>All current data will be wiped</li>
                    <li>The app restarts fresh for SY {nextSY}</li>
                  </ul>
                </div>
              </div>
              <p className="text-pretty text-xs text-slate-600 dark:text-slate-400">This reminder will appear each startup until reset is complete.</p>
            </div>
          )}

          {!done && step === 2 && (
            <div className="space-y-4">
              <p className="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">Before the reset, download your <strong>SY {currentSY}</strong> archive backup.
                Save it in a secure location (USB drive, Google Drive, etc.).
                You will not be able to proceed without downloading it.</p>
              <button type="button" onClick={handleBackupDownload} className="ui-button-primary w-full">
                {backupDownloaded ? <><CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />Archive Downloaded — Ready to Proceed</>
                  : <><Download aria-hidden="true" className="size-5 shrink-0" />Download SY {currentSY} Archive Backup</>}
              </button>
              {backupDownloaded ? <p role="status" className="text-pretty text-sm text-emerald-700 dark:text-emerald-400">✓ Backup saved. You may now proceed to the reset.</p>
                : <p className="text-pretty text-sm text-slate-600 dark:text-slate-400">The "Proceed to Reset" button will unlock after the backup is downloaded.</p>}
            </div>
          )}

          {!done && step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
                <Trash2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-700 dark:text-red-400" />
                <div className="min-w-0 space-y-2 text-pretty text-sm leading-relaxed text-red-800 dark:text-red-300">
                  <h3 className="text-balance font-semibold">Final confirmation required</h3>
                  <p>Clicking <strong>"Reset for SY {nextSY}"</strong> will permanently erase
                    all data for SY {currentSY} and reinitialize the app for the new school year.</p>
                  <p className="font-semibold">Your backup file has been saved. This cannot be undone.</p>
                </div>
              </div>
              <TypeToConfirmField value={confirmText} onChange={setConfirmText} inputId="yearly-reset-confirm" onEnter={handleReset} />
            </div>
          )}
        </div>

        <footer className="ui-dialog-footer">
          {done && <button type="button" onClick={handleClose} className="ui-button-primary">Reload App</button>}
          {!done && step === 1 && <button type="button" onClick={() => setStep(2)} className="ui-button-primary">Continue <ChevronRight aria-hidden="true" className="size-4" /></button>}
          {!done && step === 2 && <>
            <button type="button" onClick={() => setStep(1)} className="ui-button">Back</button>
            <button type="button" onClick={() => setStep(3)} disabled={!backupDownloaded} className="ui-button-primary">Proceed to Reset <ChevronRight aria-hidden="true" className="size-4" /></button>
          </>}
          {!done && step === 3 && <>
            <button type="button" onClick={() => { setStep(2); setConfirmText(''); }} className="ui-button">← Back</button>
            <button type="button" onClick={handleReset} disabled={resetting || confirmText.trim() !== 'INITIATE'} aria-busy={resetting} className="ui-button-danger">
              <Trash2 aria-hidden="true" className="size-4 shrink-0" />{resetting ? 'Resetting…' : `Reset for SY ${nextSY}`}
            </button>
          </>}
        </footer>
      </section>
    </div>
  );
}
