import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { exportTeacherGradebookJSON, getExportSummary, ExportSummaryData } from '../utils/subjectGradeExport';
import { exportTeacherGradebookExcel } from '../utils/teacherExcelExport';
import { X, FileCode, FileSpreadsheet, Check, Users, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function TeacherExcelExportModal({ project, onClose }: Props) {
  const allQuarters = Object.keys(project.quarters);
  const [selected, setSelected] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'excel'>('json');
  const [step, setStep] = useState<'select' | 'review'>('select');

  const handleToggle = (q: string) => {
    setSelected(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);
  };

  const handleSelectAll = () => {
    if (selected.length === allQuarters.length) {
      setSelected([]);
    } else {
      setSelected([...allQuarters]);
    }
  };

  const sortedQuarters = useMemo(() => {
    return allQuarters.filter(q => selected.includes(q));
  }, [allQuarters, selected]);

  const summaryData: ExportSummaryData = useMemo(() => {
    return getExportSummary(project, sortedQuarters);
  }, [project, sortedQuarters]);

  const handleProceedToReview = () => {
    if (selected.length === 0) {
      alert("Please select at least one quarter/semester to export.");
      return;
    }
    setStep('review');
  };

  const handleFinalExport = () => {
    if (exportFormat === 'json') {
      exportTeacherGradebookJSON(project, sortedQuarters);
    } else {
      exportTeacherGradebookExcel(project, sortedQuarters);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
              {exportFormat === 'json' ? <FileCode className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                {step === 'select' ? 'Export Grades for Adviser' : 'Review Learners to Export'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {project.subject} · {project.gradeLevel} - {project.section}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {step === 'select' ? (
            <>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Select the quarters or terms you want to export. The exported file includes all student grades and status flags for import into the Adviser Portal.
              </div>

              {/* Format Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    exportFormat === 'json'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="h-4 w-4 text-indigo-500" /> JSON (Adviser Portal)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    exportFormat === 'excel'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Excel (.xlsx)
                </button>
              </div>

              {/* Quarters Selection List */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    checked={selected.length === allQuarters.length && allQuarters.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Select All (Consolidated)</span>
                </label>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 w-full" />

                {allQuarters.map(q => (
                  <label key={q} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      checked={selected.includes(q)}
                      onChange={() => handleToggle(q)}
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{q}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            /* Step 2: Review Learners Before Exporting */
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Learners</span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{summaryData.totalStudents}</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Active</span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{summaryData.activeCount}</span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Transferred</span>
                  <span className="text-xl font-black text-amber-700 dark:text-amber-300">{summaryData.transferredCount}</span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/40">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Dropped</span>
                  <span className="text-xl font-black text-rose-700 dark:text-rose-300">{summaryData.droppedCount}</span>
                </div>
              </div>

              {(summaryData.transferredCount > 0 || summaryData.droppedCount > 0) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Notice for Non-Active Learners:</strong> {summaryData.transferredCount + summaryData.droppedCount} student(s) are marked as Transferred or Dropped. They will be included in the export with their respective status flags highlighted in red so the Adviser can verify their enrollment.
                  </div>
                </div>
              )}

              {/* Scrollable Learners Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Learner Name & LRN</th>
                      <th className="py-2 px-2 text-center">Status</th>
                      {sortedQuarters.map(q => (
                        <th key={q} className="py-2 px-2 text-center">{q}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summaryData.students.map((st, idx) => {
                      const isInactive = st.status === 'Transferred' || st.status === 'Dropped';
                      return (
                        <tr
                          key={st.lrn}
                          className={`transition-colors ${
                            isInactive
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold flex items-center gap-1.5">
                              {st.name}
                              {isInactive && (
                                <span className="px-1.5 py-0.2 bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-[9px] font-black rounded uppercase">
                                  {st.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{st.lrn}</div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {st.status === 'Active' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                                Active
                              </span>
                            ) : st.status === 'Transferred' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                                Transferred
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-300">
                                Dropped
                              </span>
                            )}
                          </td>
                          {sortedQuarters.map(q => {
                            const grade = st.quarterGrades[q];
                            return (
                              <td key={q} className="py-2 px-2 text-center font-mono font-bold">
                                {grade !== null ? grade : <span className="text-slate-300 dark:text-slate-600">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          {step === 'review' ? (
            <button
              onClick={() => setStep('select')}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Selection
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step === 'select' ? (
            <button
              onClick={handleProceedToReview}
              disabled={selected.length === 0}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Review Students ({selected.length} Selected) <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalExport}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" /> Confirm & Download {exportFormat === 'json' ? 'JSON' : 'Excel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
