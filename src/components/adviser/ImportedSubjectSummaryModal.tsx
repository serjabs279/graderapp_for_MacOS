import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { AdviserClass, ImportedSubjectGrades } from '../../types';
import { exportAdviserSubjectRecordPDF, exportAdviserSubjectRecordExcel } from '../../utils/adviser/adviserExports';
import { X, Lock, Unlock, Printer, FileText, FileSpreadsheet, AlertCircle, Save, Check } from 'lucide-react';
import { globalToast } from '../../context/ToastContext';

interface Props {
  adviserClass: AdviserClass;
  subjectData: ImportedSubjectGrades;
  onClose: () => void;
}

export default function ImportedSubjectSummaryModal({ adviserClass, subjectData, onClose }: Props) {
  const { lockSubjectGrades, replaceSubjectGrades, addOverrideLogEntry, globalSettings } = useApp();
  const { toast } = useToast();
  
  const [editingLrn, setEditingLrn] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('Approved correction');
  
  const reasonOptions = ['Late enrollee', 'Teacher omitted learner', 'Approved correction', 'Other'];

  const students = adviserClass.students.map(s => {
    let grade = subjectData.grades[s.lrn] ?? null;
    let eng = null, fil = null;
    if (subjectData.isLanguageGroup && subjectData.languageRawGrades) {
      const keys = Object.keys(subjectData.languageRawGrades);
      eng = subjectData.languageRawGrades[keys[0]]?.[s.lrn] ?? null;
      fil = subjectData.languageRawGrades[keys[1]]?.[s.lrn] ?? null;
    }
    return { lrn: s.lrn, name: s.name, grade, eng, fil };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleLockToggle = () => {
    lockSubjectGrades(adviserClass.id, subjectData.subjectUID, subjectData.quarterKey, !subjectData.isLocked);
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: 'ALL', studentName: 'ALL',
      subjectUID: subjectData.subjectUID, subjectName: subjectData.subjectName, quarterKey: subjectData.quarterKey,
      action: !subjectData.isLocked ? 'Subject Locked' : 'Subject Unlocked', reason: 'Adviser toggled lock state'
    });
  };

  const startEdit = (lrn: string, currentGrade: number | null) => {
    if (subjectData.isLocked) return;
    if (subjectData.isLanguageGroup) {
      globalToast.info("Language composite grades cannot be edited directly. Edit the original English or Filipino grade instead.", "Language Composite");
      return;
    }
    setEditingLrn(lrn);
    setEditValue(currentGrade !== null ? String(currentGrade) : '');
  };

  const saveEdit = (studentName: string) => {
    if (!editingLrn) return;
    const val = Number(editValue);
    if (isNaN(val) || val < 0 || val > 100) {
      globalToast.error("Please enter a valid grade between 0 and 100.", "Invalid Grade");
      return;
    }

    const oldGrade = subjectData.grades[editingLrn];
    const newPayload = {
      ...subjectData,
      grades: { ...subjectData.grades, [editingLrn]: val }
    };
    
    replaceSubjectGrades(adviserClass.id, subjectData.subjectUID, subjectData.quarterKey, newPayload);
    
    const actionType = oldGrade === undefined ? 'Manual Grade Entry' : 'Grade Edited';
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: editingLrn, studentName,
      subjectUID: subjectData.subjectUID, subjectName: subjectData.subjectName, quarterKey: subjectData.quarterKey,
      action: actionType, previousValue: oldGrade ? String(oldGrade) : 'None', newValue: String(val), reason: overrideReason
    });

    setEditingLrn(null);
  };

  const cancelEdit = () => {
    setEditingLrn(null);
  };

  return (
    <div className="ui-dialog-overlay">
      <div role="dialog" aria-modal="true" aria-label={`${subjectData.subjectName} grades`} className="ui-dialog max-w-4xl">
        
        {/* Header */}
        <div className="ui-dialog-header flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="ui-section-title flex flex-wrap items-center gap-2 break-words">
              {subjectData.subjectName}
              {subjectData.isLocked && <Lock className="h-4 w-4 text-red-500" />}
            </h3>
            <div className="mt-1 break-all text-sm tabular-nums text-slate-500">{subjectData.subjectUID} · {subjectData.quarterKey}</div>
          </div>
          <button onClick={onClose} className="ui-icon-button" aria-label="Close subject grades">
            <X className="size-5" />
          </button>
          <div className="flex w-full flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const logos = {
                  schoolLogoBase64: globalSettings.schoolLogoBase64,
                  depedLogoBase64: globalSettings.depedLogoBase64
                };
                exportAdviserSubjectRecordPDF(adviserClass, subjectData, students, logos);
              }}
              className="adviser-button"
            >
              <FileText className="h-4 w-4 text-red-500" /> Export PDF
            </button>
            <button
              onClick={() => exportAdviserSubjectRecordExcel(adviserClass, subjectData, students)}
              className="adviser-button"
            >
              <FileSpreadsheet className="h-4 w-4 text-slate-500" /> Export Excel
            </button>
            <button
              onClick={handleLockToggle}
              className="adviser-button"
              aria-pressed={subjectData.isLocked}
            >
              {subjectData.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {subjectData.isLocked ? 'Unlock' : 'Lock Subject'}
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-3 font-medium text-slate-500 w-16 text-center">No.</th>
                <th className="px-6 py-3 font-medium text-slate-500 w-32">LRN</th>
                <th className="px-6 py-3 font-medium text-slate-500">Student Name</th>
                
                {subjectData.isLanguageGroup ? (
                  <>
                    <th className="px-6 py-3 font-medium text-slate-500 text-center w-24">English</th>
                    <th className="px-6 py-3 font-medium text-slate-500 text-center w-24">Filipino</th>
                    <th className="px-6 py-3 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 text-center w-24 border-x border-amber-100 dark:border-amber-900/50">Languages</th>
                  </>
                ) : (
                  <th className="px-6 py-3 font-medium text-slate-500 text-center w-32">Quarter Grade</th>
                )}
                <th className="px-6 py-3 font-medium text-slate-500 text-center w-32">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((s, idx) => (
                <tr key={s.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-3 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-6 py-3 tabular-nums text-slate-500">{s.lrn}</td>
                  <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200">{s.name}</td>
                  
                  {subjectData.isLanguageGroup ? (
                    <>
                      <td className="px-6 py-3 text-center tabular-nums font-medium text-slate-600">{s.eng ?? '—'}</td>
                      <td className="px-6 py-3 text-center tabular-nums font-medium text-slate-600">{s.fil ?? '—'}</td>
                      <td className="px-6 py-3 text-center tabular-nums font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-x border-amber-100 dark:border-amber-900/50">{s.grade ?? '—'}</td>
                    </>
                  ) : (
                    <td className="px-6 py-3 text-center">
                      {editingLrn === s.lrn ? (
                        <div className="flex flex-col gap-1 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 absolute z-10 -ml-12 w-64">
                          <div className="text-sm font-medium text-slate-500 w-full text-left">Override Grade</div>
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="ui-field w-16 text-center tabular-nums"
                              autoFocus
                            />
                            <select value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="ui-field">
                              {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 w-full mt-1">
                            <button onClick={() => saveEdit(s.name)} className="adviser-button flex-1">Save</button>
                            <button onClick={cancelEdit} className="adviser-button flex-1">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="adviser-button tabular-nums"
                          aria-label={`Edit grade for ${s.name}: ${s.grade ?? 'not entered'}`}
                          disabled={subjectData.isLocked}
                          onClick={() => startEdit(s.lrn, s.grade)}
                        >
                          {s.grade ?? '—'}
                        </button>
                      )}
                    </td>
                  )}
                  
                  <td className="px-6 py-3 text-center">
                    {s.grade !== null && (
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded ${s.grade >= adviserClass.promotionPassingGrade ? "bg-slate-50 text-slate-600" : "bg-red-50 text-red-600"} `}>
                        {s.grade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
