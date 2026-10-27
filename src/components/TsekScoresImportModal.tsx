import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Project } from '../types';
import { useApp } from '../context/AppContext';
import { globalToast } from '../context/ToastContext';
import { TypeToConfirmField } from './DangerConfirmModal';
import { pickJsonBackupFile } from '../utils/fileImportAdapter';
import {
  TsekCheckState,
  TsekImportPlan,
  TsekRowStatus,
  TsekScoresFile,
  applyTsekImport,
  parseTsekScores,
  planTsekImport,
} from '../utils/tsekScoresImport';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileUp,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onImported?: () => void;
}

const CHECK_STYLE: Record<TsekCheckState, { label: string; className: string }> = {
  match: {
    label: 'Matches',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  mismatch: {
    label: 'Differs',
    className: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  },
  missing: {
    label: 'Missing',
    className: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  },
};

const ROW_STYLE: Record<TsekRowStatus, { label: string; className: string }> = {
  score: {
    label: 'Ready',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  'missing-result': {
    label: 'No result',
    className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  'needs-review': {
    label: 'Review',
    className: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  },
  incomplete: {
    label: 'Incomplete',
    className: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  },
  invalid: {
    label: 'Invalid',
    className: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  },
  unmatched: {
    label: 'Not in gradebook',
    className: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  },
};

export default function TsekScoresImportModal({ project, onClose, onImported }: Props) {
  const { saveProject } = useApp();
  const titleId = useId();
  const quarterFieldId = useId();
  const confirmId = useId();

  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<TsekScoresFile | null>(null);
  const [quarterKey, setQuarterKey] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const applyErrorRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (applyError) {
      applyErrorRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [applyError]);

  const quarterOptions = useMemo(() => Object.keys(project.quarters ?? {}), [project.quarters]);

  const plan: TsekImportPlan | null = useMemo(() => {
    if (!file) return null;
    return planTsekImport(file, project, {
      quarterKey: quarterKey || file.quarterKey,
      overwriteExisting,
    });
  }, [file, project, quarterKey, overwriteExisting]);

  const matched = Boolean(plan) && typed.trim() === plan!.confirmPhrase;
  const canApply = Boolean(plan) && plan!.level !== 'blocked' && matched && !isApplying;

  const resetFile = () => {
    setFile(null);
    setFileName('');
    setQuarterKey('');
    setOverwriteExisting(false);
    setTyped('');
    setError(null);
    setApplyError(null);
  };

  const handleChooseFile = async () => {
    setError(null);
    setApplyError(null);
    setIsReading(true);
    try {
      const picked = await pickJsonBackupFile();
      if (!picked) return;

      const parsed = parseTsekScores(picked.text);
      const targetQuarter = quarterOptions.includes(parsed.quarterKey)
        ? parsed.quarterKey
        : project.lastActiveQuarter && quarterOptions.includes(project.lastActiveQuarter)
          ? project.lastActiveQuarter
          : quarterOptions[0] ?? '';

      setFileName(picked.name);
      setFile(parsed);
      setQuarterKey(targetQuarter);
      setOverwriteExisting(false);
      setTyped('');
      setApplyError(null);
    } catch (err: any) {
      resetFile();
      setError(err?.message || 'Could not read that TSEK score file.');
    } finally {
      setIsReading(false);
    }
  };

  const handleApply = () => {
    if (!plan || plan.level === 'blocked' || typed.trim() !== plan.confirmPhrase) return;
    setIsApplying(true);
    setError(null);
    setApplyError(null);
    try {
      const updated = applyTsekImport(project, plan, { overwriteExisting });
      saveProject(updated);
      onImported?.();
      globalToast.success(
        `${plan.importableScoreCount} raw score(s) imported into ${plan.assessmentName} · ${plan.quarterKey}.` +
          (plan.existingAssessment ? ' The existing assessment column was updated.' : ''),
        'TSEK Scores Imported'
      );
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Could not import these scores.';
      setApplyError(message);
      globalToast.error(message, 'Import Stopped');
      setIsApplying(false);
    }
  };

  return (
    <div className="ui-dialog-overlay z-[100]">
      <section
        role={plan?.level === 'blocked' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        className="ui-dialog max-w-3xl"
      >
        <header className="ui-dialog-header items-start">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div className="min-w-0">
              <h3 id={titleId} className="ui-section-title">Import TSEK exam scores</h3>
              <p className="ui-description mt-1 break-words">
                {project.subject} · {project.gradeLevel} - {project.section} · S.Y. {project.schoolYear}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label="Close TSEK score import">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="ui-dialog-body space-y-5 break-words">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="text-pretty">{error}</span>
            </div>
          )}

          {!file && (
            <div className="space-y-5">
              <section className="ui-panel p-4">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">
                  What this bridge accepts
                </h4>
                <p className="ui-description">
                  A <strong>SRPHS_EXAM_SCORES</strong> JSON exported from TSEK with
                  &ldquo;Export GradeApp scores&rdquo;. Only raw points move across. TSEK&rsquo;s transmuted grade is
                  ignored, because this gradebook computes its own grade.
                </p>
                <ul className="mt-3 space-y-1.5 text-pretty text-sm text-slate-600 dark:text-slate-400">
                  <li>Every learner in the file must already be in this gradebook, matched by LRN.</li>
                  <li>One unknown LRN rejects the whole file as the wrong section — nothing is imported.</li>
                  <li>Grade level and section must match. Subject and school year only warn.</li>
                  <li>Missing, incomplete, or review-flagged results stay blank instead of becoming zero.</li>
                </ul>
              </section>

              <div className="rounded-xl border border-dashed border-slate-400 p-5 text-center dark:border-slate-600">
                <ScanLine aria-hidden="true" className="mx-auto mb-3 size-8 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Select a TSEK score file
                </h4>
                <p className="ui-description mx-auto">
                  The file is checked against this section before any score can be written.
                </p>
              </div>
            </div>
          )}

          {plan && (
            <>
              <div className="ui-panel space-y-1 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 break-all text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {fileName}
                  </span>
                  <span className="ui-badge">
                    <FileCode aria-hidden="true" className="size-3" />
                    TSEK scores v{plan.file.version}
                  </span>
                </div>
                <p className="text-pretty text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  Exam <span className="font-mono">{plan.file.examCode}</span>
                  {plan.file.teacherName ? ` · ${plan.file.teacherName}` : ''}
                  {plan.file.exportTimestamp
                    ? ` · exported ${Number.isNaN(new Date(plan.file.exportTimestamp).getTime())
                        ? plan.file.exportTimestamp
                        : new Date(plan.file.exportTimestamp).toLocaleString()}`
                    : ''}
                </p>
              </div>

              {plan.level === 'blocked' ? (
                <div
                  role="alert"
                  className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                    <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                    Import stopped — nothing was changed
                  </p>
                  <ul className="space-y-1.5 text-pretty text-sm text-red-800 dark:text-red-300">
                    {plan.blockers.map(blocker => (
                      <li key={blocker} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-600" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  className={
                    plan.level === 'warning'
                      ? 'flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                      : 'flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                  }
                >
                  {plan.level === 'warning' ? (
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {plan.level === 'warning'
                        ? 'Section and grade level confirmed, but review these notes'
                        : 'All identity checks passed'}
                    </p>
                    <p className="text-pretty">
                      {plan.matchedCount} of {plan.rosterCount} file learner(s) matched by LRN in this gradebook.
                    </p>
                  </div>
                </div>
              )}

              {plan.warnings.length > 0 && plan.level !== 'blocked' && (
                <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  {plan.warnings.map(warning => (
                    <p
                      key={warning}
                      className="flex items-start gap-2 text-pretty text-sm text-amber-900 dark:text-amber-300"
                    >
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{warning}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="ui-panel overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <caption className="sr-only">Gradebook identity compared with the TSEK file</caption>
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th scope="col" className="px-2 py-2.5 font-medium sm:px-3 sm:py-3">Field</th>
                      <th scope="col" className="px-2 py-2.5 font-medium sm:px-3 sm:py-3">This gradebook</th>
                      <th scope="col" className="px-2 py-2.5 font-medium sm:px-3 sm:py-3">TSEK file</th>
                      <th scope="col" className="px-2 py-2.5 font-medium sm:px-3 sm:py-3">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {plan.checks.map(check => {
                      const style = CHECK_STYLE[check.state];
                      return (
                        <tr key={check.key}>
                          <th scope="row" className="px-2 py-2.5 font-medium text-slate-700 dark:text-slate-300 sm:px-3 sm:py-3">
                            {check.label}
                          </th>
                          <td className="px-2 py-2.5 text-slate-700 dark:text-slate-300 sm:px-3 sm:py-3">{check.gradebook}</td>
                          <td className="px-2 py-2.5 text-slate-700 dark:text-slate-300 sm:px-3 sm:py-3">{check.file}</td>
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                            <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${style.className}`}>
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <section className="ui-panel space-y-4 p-4">
                <div>
                  <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Import target
                  </h4>
                  <p className="mt-1 text-pretty text-xs text-slate-600 dark:text-slate-400">
                    {plan.categoryLabel} · mapped to <strong>{plan.category}</strong> · perfect score{' '}
                    <strong className="tabular-nums">{plan.perfectScore}</strong>
                    {plan.existingAssessment
                      ? ' · updates the existing column below'
                      : ' · a new assessment column will be created'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor={quarterFieldId} className="ui-label">Import into quarter</label>
                    <select
                      id={quarterFieldId}
                      value={plan.quarterKey}
                      onChange={event => {
                        setQuarterKey(event.target.value);
                        setTyped('');
                        setApplyError(null);
                        setError(null);
                      }}
                      className="ui-field"
                    >
                      {quarterOptions.map(quarter => (
                        <option key={quarter} value={quarter}>{quarter}</option>
                      ))}
                    </select>
                    {plan.quarterKey !== plan.file.quarterKey && (
                      <p className="text-pretty text-xs text-amber-700 dark:text-amber-400">
                        The file says {plan.file.quarterKey}. Scores will be placed in {plan.quarterKey}.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="ui-label">Assessment column</span>
                    <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                      {plan.assessmentName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {plan.isReimport
                        ? 'Re-import of this exam — scores update this column only.'
                        : `New ${plan.category} column for exam ${plan.file.examCode}.`}
                    </p>
                  </div>
                </div>

                {plan.existingScoreCount > 0 && (
                  <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                    <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={overwriteExisting}
                        onChange={event => {
                          setOverwriteExisting(event.target.checked);
                          setTyped('');
                          setApplyError(null);
                        }}
                        className="mt-0.5 size-4 shrink-0 accent-emerald-700"
                      />
                      <span className="text-pretty">
                        Overwrite the {plan.existingScoreCount} score(s) already in this column.
                        {!overwriteExisting && ' Without this, existing scores are kept and only blank learners are filled.'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  {[
                    ['In file', plan.rosterCount, 'learners'],
                    ['Matched', plan.matchedCount, 'by LRN'],
                    ['Ready', plan.importableScoreCount, 'scores to write'],
                  ].map(([label, count, description]) => (
                    <div key={String(label)} className="rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="ui-label">{label}</div>
                      <div className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{count}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{description}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Learner rows
                </h4>
                <div className="ui-panel max-h-72 overflow-auto">
                  <table className="w-full text-left text-xs tabular-nums sm:text-sm">
                    <caption className="sr-only">Learners in the TSEK file and their import status</caption>
                    <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th scope="col" className="px-2 py-2.5 font-medium sm:px-3">Learner</th>
                        <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">LRN</th>
                        <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3">Score</th>
                        <th scope="col" className="px-2 py-2.5 font-medium sm:px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {plan.rows.map(row => {
                        const style = ROW_STYLE[row.status];
                        return (
                          <tr key={row.lrn}>
                            <td className="px-2 py-2.5 sm:px-3">
                              <span className="block font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
                              <span className="block font-mono text-xs text-slate-600 dark:text-slate-400 sm:hidden">{row.lrn}</span>
                              {row.note && (
                                <span className="block text-pretty text-xs text-slate-600 dark:text-slate-400">{row.note}</span>
                              )}
                            </td>
                            <td className="hidden px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400 sm:table-cell">{row.lrn}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-700 dark:text-slate-300 sm:px-3">
                              {row.score === null ? '—' : `${row.score} / ${row.possible}`}
                            </td>
                            <td className="px-2 py-2.5 sm:px-3">
                              <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${style.className}`}>
                                {style.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {plan.level !== 'blocked' && (
                <div className="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <p className="text-pretty text-sm text-slate-700 dark:text-slate-300">
                    Writing to <strong>{project.subject} · {project.gradeLevel} - {project.section}</strong>,{' '}
                    <strong>{plan.quarterKey}</strong>, column <strong>{plan.assessmentName}</strong>. This is required
                    on every import, including re-imports.
                  </p>
                  <TypeToConfirmField
                    value={typed}
                    onChange={value => {
                      setTyped(value);
                      setApplyError(null);
                    }}
                    requireText={plan.confirmPhrase}
                    inputId={confirmId}
                    onEnter={handleApply}
                  />
                  {applyError && (
                    <p
                      ref={applyErrorRef}
                      role="alert"
                      className="flex items-start gap-2 text-pretty text-sm text-red-700 dark:text-red-400"
                    >
                      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{applyError}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="ui-dialog-footer">
          {file ? (
            <>
              <button type="button" onClick={resetFile} className="ui-button">
                Choose another file
              </button>
              <button type="button" onClick={onClose} className="ui-button">
                Close
              </button>
              {plan && plan.level !== 'blocked' && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!canApply}
                  aria-busy={isApplying}
                  className="ui-button-primary"
                >
                  <FileUp aria-hidden="true" className="size-4" />
                  {isApplying
                    ? 'Importing...'
                    : overwriteExisting && plan.existingScoreCount > 0
                      ? `Overwrite and import ${plan.importableScoreCount} scores`
                      : `Import ${plan.importableScoreCount} scores`}
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="ui-button">Cancel</button>
              <button
                type="button"
                onClick={handleChooseFile}
                disabled={isReading}
                aria-busy={isReading}
                className="ui-button-primary"
              >
                <FileUp aria-hidden="true" className="size-4" />
                {isReading ? 'Reading file...' : 'Choose TSEK score file'}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
