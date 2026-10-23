import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass } from '../../types';
import { GradeMatrix, StudentGradeRow, getQuarterKeys, computeAttendanceSummary, computeSubjectFinal } from '../../utils/adviserUtils';
import { Edit3, Check, X, AlertCircle, Eye, Download } from 'lucide-react';
import StudentGradesModal from './StudentGradesModal';
import RenameSubjectModal from './RenameSubjectModal';
import { globalToast } from '../../context/ToastContext';
import { exportGradeMatrixJSON } from '../../utils/adviser/sf10MatrixExport';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function GradeMatrixTab({ adviserClass, gradeMatrix }: Props) {
  const { overrideStudentGrade, globalSettings } = useApp();
  const quarterKeys = getQuarterKeys(adviserClass.workspace);

  // Final grades stay null until every quarter is imported, so open on the
  // latest quarter that actually has data instead of an all-blank Final view.
  const latestQuarterWithData = [...quarterKeys].reverse().find(qk =>
    gradeMatrix.some(row => row.subjects.some(s => s.quarters[qk] !== null))
  );
  const hasPartialData = gradeMatrix.some(row =>
    row.subjects.some(s => s.finalGrade === null && quarterKeys.some(qk => s.quarters[qk] !== null))
  );

  const [activeQuarter, setActiveQuarter] = useState<string>(
    hasPartialData && latestQuarterWithData ? latestQuarterWithData : 'Final'
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Student grades view modal
  const [viewingStudent, setViewingStudent] = useState<StudentGradeRow | null>(null);

  // Rename subject modal
  const [renamingSubject, setRenamingSubject] = useState<string | null>(null);

  // Local state for grade override modal
  const [editingCell, setEditingCell] = useState<{
    lrn: string;
    studentName: string;
    subjectName: string;
    subjectUID: string;
    quarterKey: string;
    currentGrade: number;
  } | null>(null);

  const [overrideValue, setOverrideValue] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Extract column headers by inspecting the first row
  const columns: Array<{ label: string; isComposite?: boolean; parentGroup?: string; isMain?: boolean }> = [];
  if (gradeMatrix.length > 0) {
    gradeMatrix[0].subjects.forEach(subj => {
      if (subj.isLanguageGroup && subj.languageComponents) {
        subj.languageComponents.forEach(comp => {
          columns.push({ label: comp, isComposite: true, parentGroup: subj.subjectName, isMain: false });
        });
        columns.push({ label: subj.subjectName, isComposite: true, parentGroup: subj.subjectName, isMain: true });
      } else {
        columns.push({ label: subj.subjectName, isComposite: false, isMain: true });
      }
    });
  }

  const handleCellClick = (lrn: string, studentName: string, subjectName: string, currentGrade: number | null) => {
    if (activeQuarter === 'Final') {
      globalToast.info("To edit grades, please select a specific Quarter / Semester from the tabs above instead of the consolidated Final view.", "Edit Grades");
      return;
    }

    // Find imported subject UID for this quarter
    // For language components, find the parent group first
    const isComp = adviserClass.languageGroups.some(lg => lg.subjects.includes(subjectName));
    const targetSubjName = isComp 
      ? adviserClass.languageGroups.find(lg => lg.subjects.includes(subjectName))?.label ?? subjectName
      : subjectName;

    const imported = adviserClass.importedGrades.find(
      g => g.subjectName === targetSubjName && g.quarterKey === activeQuarter
    );

    if (!imported) {
      globalToast.error(`No imported grade records found for "${targetSubjName}" in ${activeQuarter}. Please import grades first.`, "Grades Not Found");
      return;
    }

    if (imported.isLocked) {
      globalToast.warning("This subject's grades are locked. Please unlock them in the Grade Import tab first.", "Grades Locked");
      return;
    }

    setEditingCell({
      lrn,
      studentName,
      subjectName,
      subjectUID: imported.subjectUID,
      quarterKey: activeQuarter,
      currentGrade: currentGrade ?? 0
    });
    setOverrideValue(currentGrade !== null ? String(currentGrade) : '');
    setOverrideReason('');
    setModalError(null);
  };

  const handleSaveOverride = () => {
    if (!editingCell) return;
    const val = parseInt(overrideValue);
    if (isNaN(val) || val < 0 || val > 100) {
      setModalError("Please enter a valid grade between 0 and 100.");
      return;
    }
    if (!overrideReason.trim()) {
      setModalError("A detailed reason is mandatory for auditing manual overrides.");
      return;
    }

    overrideStudentGrade(
      adviserClass.id,
      editingCell.subjectUID,
      editingCell.quarterKey,
      editingCell.lrn,
      val,
      overrideReason.trim(),
      editingCell.subjectName
    );

    setEditingCell(null);
  };

  return (
    <div className="adviser-page">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="adviser-heading">Grade matrix</h2>
          <p className="adviser-description">Review grades by quarter. Select a learner to see their record, or a grade to make a correction.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (gradeMatrix.length === 0) {
                globalToast.warning("No student records to export in the grade matrix.", "Empty Matrix");
                return;
              }
              setIsExporting(true);
              try {
                await exportGradeMatrixJSON(adviserClass, gradeMatrix, globalSettings);
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting || gradeMatrix.length === 0}
            className="adviser-button-primary"
            title="Export consolidated grades and attendance as JSON for SF-10 generator"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>{isExporting ? 'Exporting...' : 'Export for SF-10'}</span>
          </button>
        </div>
      </div>

      {activeQuarter === 'Final' && hasPartialData && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
            Some subjects are only partially graded, so their final grades show as — until every quarter is imported.
            The imported grades are available under the quarter tabs above.
          </p>
        </div>
      )}

      <div className="adviser-periods" role="group" aria-label="Grading period">
        <button
          onClick={() => setActiveQuarter('Final')}
          aria-pressed={activeQuarter === 'Final'}
          className="adviser-period"
        >
          Final Grades
        </button>
        {quarterKeys.map(q => (
          <button
            key={q}
            onClick={() => setActiveQuarter(q)}
            aria-pressed={activeQuarter === q}
            className="adviser-period"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="adviser-panel">
        <div className="overflow-x-auto" role="region" aria-label="Grade matrix table" tabIndex={0}>
          <table className="w-full min-w-3xl text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className="px-3 py-3 font-medium text-slate-500 dark:text-slate-400 w-12 text-center border-r border-slate-200 dark:border-slate-800">No.</th>
                <th scope="col" className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 sm:sticky sm:left-0 bg-slate-50 dark:bg-slate-950 z-10 min-w-64 border-r border-slate-200 dark:border-slate-800">Learner Name</th>
                
                {columns.map((col, cIdx) => (
                  <th key={cIdx} scope="col" className="min-w-28 border-r border-slate-200 px-3 py-3 text-center font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-1">
                      <span>{col.label}</span>
                      {col.isMain && (
                        <button
                          onClick={() => setRenamingSubject(col.label)}
                          title={`Rename subject "${col.label}"`}
                          aria-label={`Rename subject "${col.label}"`}
                          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}

                <th scope="col" className="px-4 py-3 text-center font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-r border-slate-200 dark:border-slate-800 min-w-[80px]">General average</th>
                
                {activeQuarter === 'Final' && (
                  <>
                    <th className="px-4 py-3 font-bold text-slate-500 text-center min-w-[60px] border-r border-slate-200 dark:border-slate-800">Rank</th>
                    <th className="px-4 py-3 font-bold text-slate-500 min-w-[140px] border-r border-slate-200 dark:border-slate-800">Honors</th>
                    <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px] border-r border-slate-200 dark:border-slate-800">Status</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-center min-w-[80px]">Absences</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {gradeMatrix.length === 0 ? (
                <tr><td colSpan={100} className="text-center py-12 text-slate-400">No students found.</td></tr>
              ) : null}
              {gradeMatrix.map((row, idx) => {
                let genAvgToDisplay: number | null = null;
                if (activeQuarter === 'Final') {
                  genAvgToDisplay = row.generalAverage;
                } else {
                  const qGrades = row.subjects.map(s => s.quarters[activeQuarter]).filter((g): g is number => g !== null);
                  if (qGrades.length > 0) {
                    genAvgToDisplay = Math.round((qGrades.reduce((a, b) => a + b, 0) / qGrades.length) * 100) / 100;
                  }
                }

                const attSummary = activeQuarter === 'Final' ? computeAttendanceSummary(adviserClass, row.lrn) : null;
                const isRetained = row.promotionStatus === 'Retained';
                
                return (
                  <tr key={row.lrn} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isRetained && activeQuarter === 'Final' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                    <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                      {idx + 1}
                    </td>
                    <td className={`px-4 py-2.5 font-medium sm:sticky sm:left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 ${isRetained && activeQuarter === 'Final' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      <button
                        onClick={() => setViewingStudent(row)}
                        className="flex min-h-8 items-center gap-2 text-left w-full cursor-pointer hover:underline decoration-amber-400"
                        title={`View ${row.name}'s grades`}
                      >
                        <span>{row.name}</span>
                        <Eye className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                      <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{row.lrn}</div>
                    </td>

                    {row.subjects.map((subj, sIdx) => {
                      if (subj.isLanguageGroup && subj.languageComponents) {
                        return (
                          <React.Fragment key={sIdx}>
                            {subj.languageComponents.map((comp, cIdx) => {
                              let compGrade = null;
                              if (activeQuarter === 'Final') {
                                // Component finals follow the same completeness rule as the composite,
                                // so a partial subject never shows an average pretending to be a final.
                                compGrade = computeSubjectFinal(subj.languageQuarters?.[comp] || {}, adviserClass.workspace);
                              } else {
                                compGrade = subj.languageQuarters?.[comp]?.[activeQuarter] ?? null;
                              }
                              return (
                                <td 
                                  key={`comp-${cIdx}`} 
                                  onClick={() => handleCellClick(row.lrn, row.name, comp, compGrade)}
                                  className={`px-3 py-2.5 text-center font-mono border-r border-slate-100 dark:border-slate-800 text-slate-600 ${
                                    activeQuarter !== 'Final' ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20' : ''
                                  }`}
                                  title={activeQuarter !== 'Final' ? 'Click to manually override component grade' : ''}
                                >
                                  {compGrade ?? '—'}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5 text-center font-semibold border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200">
                              {activeQuarter === 'Final' ? subj.finalGrade ?? '—' : subj.quarters[activeQuarter] ?? '—'}
                            </td>
                          </React.Fragment>
                        );
                      } else {
                        const grade = activeQuarter === 'Final' ? subj.finalGrade : subj.quarters[activeQuarter];
                        const isFailing = grade !== null && grade < adviserClass.promotionPassingGrade;
                        return (
                          <td 
                            key={sIdx} 
                            onClick={() => handleCellClick(row.lrn, row.name, subj.subjectName, grade)}
                            className={`px-3 py-2.5 text-center font-mono border-r border-slate-100 dark:border-slate-800 ${
                              grade === null ? 'text-slate-300' :
                              isFailing ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                            } ${activeQuarter !== 'Final' ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20' : ''}`}
                            title={activeQuarter !== 'Final' ? 'Click to manually override grade' : ''}
                          >
                            {grade ?? '—'}
                          </td>
                        );
                      }
                    })}

                    <td className={`px-4 py-2.5 text-center font-mono font-semibold tabular-nums border-r border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 ${
                      genAvgToDisplay === null ? 'text-slate-300' :
                      (genAvgToDisplay < adviserClass.promotionPassingGrade ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-500')
                    }`}>
                      {genAvgToDisplay?.toFixed(2) ?? '—'}
                    </td>

                    {activeQuarter === 'Final' && (
                      <>
                        <td className="px-4 py-2.5 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {row.rank ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400 border-r border-slate-100 dark:border-slate-800">
                          {row.honorsLabel}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800">
                           <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                             row.promotionStatus === 'Promoted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                             row.promotionStatus === 'Retained' ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                             'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                           }`}>
                             {row.promotionStatus}
                           </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                          {attSummary ? attSummary.totalDaysAbsent : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Grade Override Modal */}
      {editingCell && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Manual grade override" className="ui-dialog max-w-md">
            <div className="ui-dialog-header">
              <h3 className="ui-section-title">Manual Grade Override</h3>
              <button type="button" onClick={() => setEditingCell(null)} aria-label="Close override dialog" className="ui-icon-button">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="ui-dialog-body space-y-4">
              {modalError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-pretty">{modalError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="ui-label">Student</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{editingCell.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-label">Subject &amp; period</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {editingCell.subjectName} • {editingCell.quarterKey}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="override-current-grade" className="ui-label">Current grade</label>
                  <output id="override-current-grade" className="ui-field flex items-center bg-slate-50 font-mono tabular-nums text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    {editingCell.currentGrade || '—'}
                  </output>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="override-new-grade" className="ui-label">New grade</label>
                  <input
                    id="override-new-grade"
                    type="number"
                    min={0}
                    max={100}
                    value={overrideValue}
                    onChange={e => setOverrideValue(e.target.value)}
                    className="ui-field font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="override-reason" className="ui-label">
                  Override reason <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g., Incorrect raw grade imported / Late enrollee assessment adjustment"
                  rows={3}
                  className="ui-field"
                />
              </div>
            </div>

            <div className="ui-dialog-footer">
              <button type="button" onClick={() => setEditingCell(null)} className="ui-button">
                Cancel
              </button>
              <button type="button" onClick={handleSaveOverride} className="ui-button ui-button-primary">
                <Check className="size-4" aria-hidden="true" /> Save override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Grades View Modal */}
      {viewingStudent && (
        <StudentGradesModal
          student={viewingStudent}
          adviserClass={adviserClass}
          onClose={() => setViewingStudent(null)}
        />
      )}

      {/* Rename Subject Modal */}
      {renamingSubject && (
        <RenameSubjectModal
          adviserClass={adviserClass}
          subjectName={renamingSubject}
          onClose={() => setRenamingSubject(null)}
        />
      )}
    </div>
  );
}
