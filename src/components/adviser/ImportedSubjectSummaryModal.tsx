import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, ImportedSubjectGrades } from '../../types';
import { exportAdviserSubjectRecordPDF, exportAdviserSubjectRecordExcel } from '../../utils/adviser/adviserExports';
import { X, Lock, Unlock, Printer, FileText, FileSpreadsheet, AlertCircle, Save, Check } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  subjectData: ImportedSubjectGrades;
  onClose: () => void;
}

export default function ImportedSubjectSummaryModal({ adviserClass, subjectData, onClose }: Props) {
  const { lockSubjectGrades, replaceSubjectGrades, addOverrideLogEntry, globalSettings } = useApp();
  
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
      alert("Language composite grades cannot be edited directly. Edit the original English or Filipino grade instead.");
      return;
    }
    setEditingLrn(lrn);
    setEditValue(currentGrade !== null ? String(currentGrade) : '');
  };

  const saveEdit = (studentName: string) => {
    if (!editingLrn) return;
    const val = Number(editValue);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Please enter a valid grade between 0 and 100.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
              {subjectData.subjectName}
              {subjectData.isLocked && <Lock className="h-4 w-4 text-red-500" />}
            </h3>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{subjectData.subjectUID} · {subjectData.quarterKey}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const logos = {
                  schoolLogoBase64: globalSettings.schoolLogoBase64,
                  depedLogoBase64: globalSettings.depedLogoBase64
                };
                exportAdviserSubjectRecordPDF(adviserClass, subjectData, students, logos);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-rose-500" /> Export PDF
            </button>
            <button
              onClick={() => exportAdviserSubjectRecordExcel(adviserClass, subjectData, students)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel
            </button>
            <button
              onClick={handleLockToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                subjectData.isLocked ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {subjectData.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {subjectData.isLocked ? 'Unlock' : 'Lock Subject'}
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-3 font-bold text-slate-500 w-16 text-center">No.</th>
                <th className="px-6 py-3 font-bold text-slate-500 w-32">LRN</th>
                <th className="px-6 py-3 font-bold text-slate-500">Student Name</th>
                
                {subjectData.isLanguageGroup ? (
                  <>
                    <th className="px-6 py-3 font-bold text-slate-500 text-center w-24">English</th>
                    <th className="px-6 py-3 font-bold text-slate-500 text-center w-24">Filipino</th>
                    <th className="px-6 py-3 font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 text-center w-24 border-x border-blue-100 dark:border-blue-900/50">Languages</th>
                  </>
                ) : (
                  <th className="px-6 py-3 font-bold text-slate-500 text-center w-32">Quarter Grade</th>
                )}
                <th className="px-6 py-3 font-bold text-slate-500 text-center w-32">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((s, idx) => (
                <tr key={s.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{s.lrn}</td>
                  <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{s.name}</td>
                  
                  {subjectData.isLanguageGroup ? (
                    <>
                      <td className="px-6 py-3 text-center font-mono font-bold text-slate-600">{s.eng ?? '—'}</td>
                      <td className="px-6 py-3 text-center font-mono font-bold text-slate-600">{s.fil ?? '—'}</td>
                      <td className="px-6 py-3 text-center font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-x border-blue-100 dark:border-blue-900/50">{s.grade ?? '—'}</td>
                    </>
                  ) : (
                    <td className="px-6 py-3 text-center">
                      {editingLrn === s.lrn ? (
                        <div className="flex flex-col gap-1 items-center bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-amber-200 absolute z-10 -ml-12 w-64">
                          <div className="text-[10px] font-bold uppercase text-slate-500 w-full text-left">Override Grade</div>
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-16 px-2 py-1 text-center font-mono text-sm border border-slate-300 rounded"
                              autoFocus
                            />
                            <select value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="flex-1 text-[10px] py-1 border border-slate-300 rounded">
                              {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 w-full mt-1">
                            <button onClick={() => saveEdit(s.name)} className="flex-1 bg-amber-500 text-white text-[10px] font-bold py-1 rounded">Save</button>
                            <button onClick={cancelEdit} className="flex-1 bg-slate-200 text-slate-600 text-[10px] font-bold py-1 rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`font-mono font-bold ${!subjectData.isLocked ? 'cursor-pointer hover:text-amber-600 hover:underline' : ''} ${s.grade === null ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'}`}
                          onClick={() => startEdit(s.lrn, s.grade)}
                        >
                          {s.grade ?? '—'}
                        </div>
                      )}
                    </td>
                  )}
                  
                  <td className="px-6 py-3 text-center">
                    {s.grade !== null && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${s.grade >= adviserClass.promotionPassingGrade ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
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
