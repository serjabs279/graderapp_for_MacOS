import React, { useMemo, useState } from 'react';
import { Project } from '../types';
import { useApp } from '../context/AppContext';
import { globalToast } from '../context/ToastContext';
import { pickJsonBackupFile } from '../utils/fileImportAdapter';
import {
  ParsedGradebookBackup,
  RestoreMode,
  RestorePreview,
  applyGradebookRestore,
  buildRestorePreview,
  checkRestoreIdentity,
  clearRestoreCheckpoint,
  loadRestoreCheckpoint,
  parseGradebookBackupText,
  saveRestoreCheckpoint,
} from '../utils/gradebookBackup';
import { AlertCircle, AlertTriangle, ArrowRightLeft, CheckCircle2, Database, FileCode, FileUp, RefreshCw, ShieldCheck, X } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onRestored?: () => void;
}

type Step = 'select' | 'preview' | 'confirm' | 'done';

function formatCount(value: number): string {
  return value.toLocaleString();
}

function IdentityLine({ project }: { project: Project }) {
  return (
    <div className="text-sm text-slate-600 dark:text-slate-400 break-words">
      {project.subject} · {project.gradeLevel} - {project.section} · S.Y. {project.schoolYear}
    </div>
  );
}

export default function GradebookRestoreModal({ project, onClose, onRestored }: Props) {
  const { saveProject } = useApp();

  const [step, setStep] = useState<Step>('select');
  const [fileName, setFileName] = useState('');
  const [backup, setBackup] = useState<ParsedGradebookBackup | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mode, setMode] = useState<RestoreMode>('replace');
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [checkpointSaved, setCheckpointSaved] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(() => loadRestoreCheckpoint(project.id) !== null);

  const backupInfo = useMemo(() => {
    if (!backup) return null;
    const exported = new Date(backup.snapshot.exportedAt || backup.file.exportTimestamp);
    return {
      exportedLabel: Number.isNaN(exported.getTime()) ? 'Unknown date' : exported.toLocaleString(),
      teacher: backup.project.teacherName || backup.file.teacherName || 'Not recorded',
    };
  }, [backup]);

  const handleChooseFile = async () => {
    setError(null);
    setIsReading(true);
    try {
      const picked = await pickJsonBackupFile();
      if (!picked) return;

      const parsed = parseGradebookBackupText(picked.text);
      const identity = checkRestoreIdentity(project, parsed.project);
      if (identity.blockers.length > 0) {
        throw new Error(`This backup does not match this gradebook. ${identity.blockers.join(' ')}`);
      }

      setFileName(picked.name);
      setBackup(parsed);
      setPreview(buildRestorePreview(project, parsed.project));
      setWarnings(identity.warnings);
      setMode('replace');
      setStep('preview');
    } catch (err: any) {
      setBackup(null);
      setPreview(null);
      setWarnings([]);
      setError(err?.message || 'Could not read that backup file.');
    } finally {
      setIsReading(false);
    }
  };

  const handleApply = () => {
    if (!backup || !preview) return;
    setIsApplying(true);
    try {
      const saved = saveRestoreCheckpoint(project);
      setCheckpointSaved(saved);
      const restored = applyGradebookRestore(project, backup.project, mode);
      saveProject(restored);
      onRestored?.();
      setUndoAvailable(saved);
      setStep('done');
      globalToast.success(
        mode === 'replace'
          ? `Gradebook replaced from "${fileName}".`
          : `Backup merged into this gradebook from "${fileName}".`,
        'Gradebook Restored'
      );
    } catch (err: any) {
      globalToast.error(err?.message || 'Could not restore the gradebook.', 'Restore Failed');
      setError(err?.message || 'Could not restore the gradebook.');
      setStep('preview');
    } finally {
      setIsApplying(false);
    }
  };

  const handleUndoCheckpoint = () => {
    const checkpoint = loadRestoreCheckpoint(project.id);
    if (!checkpoint) {
      setUndoAvailable(false);
      globalToast.error('The pre-restore checkpoint is no longer available.', 'Undo Unavailable');
      return;
    }
    saveProject(checkpoint);
    onRestored?.();
    clearRestoreCheckpoint(project.id);
    setUndoAvailable(false);
    globalToast.info('The gradebook was returned to its state before the restore.', 'Restore Undone');
    onClose();
  };

  const resetSelection = () => {
    setBackup(null);
    setPreview(null);
    setWarnings([]);
    setError(null);
    setFileName('');
    setStep('select');
  };

  return (
    <div className="ui-dialog-overlay z-[100]">
      <section role={step === 'confirm' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="gradebook-restore-title" aria-describedby={step === 'confirm' ? 'gradebook-restore-warning' : undefined} className="ui-dialog max-w-2xl">
        <header className="ui-dialog-header items-start">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <h3 id="gradebook-restore-title" className="ui-section-title">Restore Gradebook Backup</h3>
              <p className="ui-description break-words">{project.subject} · {project.gradeLevel} - {project.section}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label="Close gradebook restore"><X aria-hidden="true" className="size-5" /></button>
        </header>

        <div className="ui-dialog-body space-y-5 break-words">
          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-5">
              <section className="ui-panel p-4">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">What counts as a backup?</h4>
                <p className="ui-description">
                  Any JSON exported from this gradebook with <strong>Export for Adviser (JSON)</strong> after this feature was added.
                  It carries a full snapshot of all quarters, assessments, and raw scores. Only this gradebook is changed —
                  other projects, sections, and settings stay untouched.
                </p>
              </section>
              {undoAvailable && (
                <div className="ui-notice flex-wrap">
                  <RefreshCw aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p className="min-w-0 flex-1">A pre-restore checkpoint is saved for this gradebook.</p>
                  <button type="button" onClick={handleUndoCheckpoint} className="ui-button">Undo Last Restore</button>
                </div>
              )}
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <FileCode aria-hidden="true" className="mx-auto mb-3 size-8 text-emerald-600" />
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">Select a gradebook JSON file</h4>
                <p className="ui-description">The app checks that it belongs to this subject, grade level, section, and school year.</p>
              </div>
            </div>
          )}

          {step === 'preview' && backup && preview && backupInfo && (
            <div className="space-y-4">
              <div className="ui-panel space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 break-all text-sm font-semibold text-slate-800 dark:text-slate-200">{fileName}</span>
                  <span className="ui-badge">Valid backup</span>
                </div>
                <IdentityLine project={backup.project} />
                <p className="text-pretty text-sm text-slate-600 dark:text-slate-400 tabular-nums">Exported {backupInfo.exportedLabel} · Teacher: {backupInfo.teacher}</p>
              </div>
              {warnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  {warnings.map(warning => <p key={warning} className="flex items-start gap-2 text-pretty text-sm text-amber-800 dark:text-amber-300"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span>{warning}</span></p>)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 tabular-nums">
                {[
                  ['In Backup', formatCount(preview.backupStudents), 'students'],
                  ['Matched', formatCount(preview.matchedStudents), 'already here'],
                  ['New', formatCount(preview.newStudents), 'only in backup'],
                ].map(([label, count, description]) => (
                  <div key={label} className="ui-panel p-3">
                    <div className="ui-label">{label}</div>
                    <div className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{count}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{description}</div>
                  </div>
                ))}
              </div>
              <div tabIndex={0} role="region" aria-label="Quarter restore comparison" className="ui-panel overflow-x-auto">
                <table className="w-full min-w-96 text-left text-sm tabular-nums">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                    <tr><th scope="col" className="px-3 py-3 font-medium">Quarter</th><th scope="col" className="px-3 py-3 text-right font-medium">Backup</th><th scope="col" className="px-3 py-3 text-right font-medium">Scores</th><th scope="col" className="px-3 py-3 text-right font-medium">Current</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                    {preview.quarters.map(quarter => (
                      <tr key={quarter.quarterKey}>
                        <th scope="row" className="px-3 py-3 font-medium">{quarter.quarterKey}{quarter.isNewForCurrent && <span className="ui-badge ml-1.5">new</span>}</th>
                        <td className="px-3 py-3 text-right">{formatCount(quarter.backupAssessments)} assessments</td>
                        <td className="px-3 py-3 text-right">{formatCount(quarter.backupFilledScores)}</td>
                        <td className="px-3 py-3 text-right">{formatCount(quarter.currentFilledScores)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <fieldset className="space-y-2">
                <legend className="ui-label mb-2">Restore Mode</legend>
                <button type="button" onClick={() => setMode('replace')} aria-pressed={mode === 'replace'} className="ui-panel w-full cursor-pointer p-4 text-left aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 dark:aria-pressed:bg-emerald-950/30">
                  <span className="flex items-start gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200"><Database aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />Replace this gradebook (recommended)</span>
                  <p className="ui-description">Restores the backup exactly: roster, assessments, raw scores, reassessments, and adjustments.
                    Anything added after the backup was taken is removed from this gradebook only.</p>
                </button>
                <button type="button" onClick={() => setMode('merge')} aria-pressed={mode === 'merge'} className="ui-panel w-full cursor-pointer p-4 text-left aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 dark:aria-pressed:bg-emerald-950/30">
                  <span className="flex items-start gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200"><ArrowRightLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />Merge backup into current data</span>
                  <p className="ui-description">Keeps everything currently in this gradebook and fills in missing students, assessments, and scores.
                    Backup values overwrite the same entries; nothing present only in the current gradebook is deleted.</p>
                </button>
              </fieldset>
            </div>
          )}

          {step === 'confirm' && backup && preview && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle aria-hidden="true" className="size-6 text-amber-700 dark:text-amber-400" />
              <h4 className="ui-section-title">{mode === 'replace' ? 'Replace the entire gradebook?' : 'Merge this backup into the gradebook?'}</h4>
              <p id="gradebook-restore-warning" className="text-pretty text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {mode === 'replace' ? (
                  <>The current roster, assessments, and scores for <strong>{project.subject} · {project.gradeLevel} - {project.section}</strong> will be
                    replaced with the backup from <strong>{fileName}</strong>. Other projects and settings are not affected.
                    {preview.missingStudents > 0 && <> <strong>{preview.missingStudents} current student(s)</strong> not in the backup will no longer appear in this gradebook.</>}</>
                ) : (
                  <>Missing students, assessments, and scores will be restored. Backup values overwrite matching current entries for
                    <strong> {project.subject} · {project.gradeLevel} - {project.section}</strong>.</>
                )}
              </p>
              <p className="text-pretty text-sm text-slate-600 dark:text-slate-400">A pre-restore checkpoint is saved automatically so this can be undone.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-3 py-3 text-center" role="status">
              <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
              <h4 className="ui-section-title">Gradebook restored</h4>
              <p className="ui-description">{mode === 'replace' ? 'The backup replaced this gradebook.' : 'The backup was merged into this gradebook.'} Other projects and settings were not changed.</p>
              {checkpointSaved ? <p className="ui-description">A checkpoint of the previous state was saved for this gradebook.</p>
                : <p className="text-pretty text-sm text-amber-700 dark:text-amber-400">The pre-restore checkpoint could not be saved (storage full).</p>}
            </div>
          )}
        </div>

        <footer className="ui-dialog-footer">
          {step === 'select' && <button type="button" onClick={handleChooseFile} disabled={isReading} aria-busy={isReading} className="ui-button-primary"><FileUp aria-hidden="true" className="size-4" />{isReading ? 'Reading file...' : 'Choose JSON Backup'}</button>}
          {step === 'preview' && backup && preview && backupInfo && <><button type="button" onClick={resetSelection} className="ui-button">Choose another file</button><button type="button" onClick={() => setStep('confirm')} className="ui-button-primary">{mode === 'replace' ? 'Continue to Restore' : 'Continue to Merge'}</button></>}
          {step === 'confirm' && backup && preview && <><button type="button" onClick={() => setStep('preview')} className="ui-button">Back</button><button type="button" onClick={handleApply} disabled={isApplying} aria-busy={isApplying} className="ui-button-danger">{isApplying ? 'Restoring...' : mode === 'replace' ? 'Yes, Replace Gradebook' : 'Yes, Merge Backup'}</button></>}
          {step === 'done' && <>{undoAvailable && <button type="button" onClick={handleUndoCheckpoint} className="ui-button"><RefreshCw aria-hidden="true" className="size-4" />Undo Restore</button>}<button type="button" onClick={onClose} className="ui-button-primary">Done</button></>}
        </footer>
      </section>
    </div>
  );
}
