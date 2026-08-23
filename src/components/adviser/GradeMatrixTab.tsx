import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass } from '../../types';
import { GradeMatrix, getQuarterKeys, computeAttendanceSummary } from '../../utils/adviserUtils';
import { TableProperties, Printer, Edit3, Check, X, AlertCircle } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function GradeMatrixTab({ adviserClass, gradeMatrix }: Props) {
  const { overrideStudentGrade } = useApp();
  const quarterKeys = getQuarterKeys(adviserClass.workspace);
  const [activeQuarter, setActiveQuarter] = useState<string>('Final');

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
      alert("To edit grades, please select a specific Quarter / Semester from the tabs above instead of the consolidated Final view.");
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
      alert(`No imported grade records found for "${targetSubjName}" in ${activeQuarter}. Please import grades first.`);
      return;
    }

    if (imported.isLocked) {
      alert("This subject's grades are locked. Please unlock them in the Grade Import tab first.");
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
      overrideReason.trim()
    );

    setEditingCell(null);
  };

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-amber-500" /> Class Performance Matrix
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Consolidated view of official grades. Click any cell during active quarter views to manually override grades.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => setActiveQuarter('Final')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeQuarter === 'Final' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Final Grades
        </button>
        {quarterKeys.map(q => (
          <button
            key={q}
            onClick={() => setActiveQuarter(q)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeQuarter === q ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 font-bold text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-950/50 z-10 w-8 text-center border-r border-slate-200 dark:border-slate-800">No.</th>
                <th className="px-4 py-3 font-bold text-slate-500 sticky left-8 bg-slate-50 dark:bg-slate-950/50 z-10 min-w-[200px] border-r border-slate-200 dark:border-slate-800">Learner Name</th>
                
                {columns.map((col, cIdx) => (
                  <th key={cIdx} className={`px-3 py-3 text-center min-w-[90px] border-r border-slate-200 dark:border-slate-800 ${
                    col.isComposite && col.isMain ? 'font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'font-bold text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="truncate w-[90px]" title={col.label}>{col.label}</div>
                  </th>
                ))}

                <th className="px-4 py-3 font-black text-amber-700 dark:text-amber-500 text-center bg-amber-50 dark:bg-amber-950/30 border-r border-slate-200 dark:border-slate-800 min-w-[80px]">GEN AVG</th>
                
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
                    <td className="px-4 py-2.5 text-center text-slate-400 font-mono sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                      {idx + 1}
                    </td>
                    <td className={`px-4 py-2.5 font-bold sticky left-8 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 truncate ${isRetained && activeQuarter === 'Final' ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {row.name}
                      <div className="text-[9px] font-mono font-normal text-slate-400">{row.lrn}</div>
                    </td>

                    {row.subjects.map((subj, sIdx) => {
                      if (subj.isLanguageGroup && subj.languageComponents) {
                        return (
                          <React.Fragment key={sIdx}>
                            {subj.languageComponents.map((comp, cIdx) => {
                              let compGrade = null;
                              if (activeQuarter === 'Final') {
                                const qGrades = Object.values(subj.languageQuarters?.[comp] || {}).filter(g => g !== null) as number[];
                                compGrade = qGrades.length > 0 ? Math.round((qGrades.reduce((a,b)=>a+b,0)/qGrades.length)*100)/100 : null;
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
                            <td className="px-3 py-2.5 text-center font-mono font-black border-r border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">
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

                    <td className={`px-4 py-2.5 text-center font-mono font-black border-r border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 ${
                      genAvgToDisplay === null ? 'text-slate-300' :
                      (genAvgToDisplay < adviserClass.promotionPassingGrade ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-500')
                    }`}>
                      {genAvgToDisplay?.toFixed(2) ?? '—'}
                    </td>

                    {activeQuarter === 'Final' && (
                      <>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {row.rank ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wide border-r border-slate-100 dark:border-slate-800">
                          {row.honorsLabel}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800">
                           <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                             row.promotionStatus === 'Promoted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-450' :
                             row.promotionStatus === 'Retained' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-450' :
                             'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <h3 className="font-sans font-black text-sm text-slate-850 dark:text-slate-200 uppercase tracking-wider">
                Manual Grade Override
              </h3>
              <button onClick={() => setEditingCell(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-800 dark:text-red-400 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Student Name</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{editingCell.studentName}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Subject & Period</div>
                <div className="text-xs font-bold text-slate-850 dark:text-slate-250">
                  {editingCell.subjectName} • {editingCell.quarterKey}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider">Current Grade</label>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-transparent rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-450">
                    {editingCell.currentGrade || '—'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider">New Grade</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={overrideValue}
                    onChange={e => setOverrideValue(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-455 dark:text-slate-500 uppercase font-black tracking-wider">
                  Override Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g., Incorrect raw grade imported / Late enrollee assessment adjustment"
                  rows={3}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Save Override
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
