import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { AdviserClass, ImportedSubjectGrades, OverrideLogEntry } from '../../../types';
import { getQuarterKeys } from '../../../utils/adviserUtils';
import { globalToast } from '../../../context/ToastContext';
import {
  PenTool,
  Plus,
  Save,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  UserCheck,
  History,
  FileCheck2
} from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
}

export default function DirectGradeEntryTab({ adviserClass }: Props) {
  const {
    saveAdviserClass,
    updateAdviserClass,
    addOverrideLogEntry,
    importSubjectGrades,
    replaceSubjectGrades,
    lockSubjectGrades
  } = useApp();

  const quarterKeys = getQuarterKeys(adviserClass.workspace);

  // Form state to create a new Direct Entry Subject
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [createError, setCreateError] = useState('');

  // Selected Direct Entry subject and quarter
  const directSubjects = useMemo(() => {
    // Subjects in adviserClass that are created via direct grade entry
    const directNames = new Set(
      adviserClass.importedGrades
        .filter(g => g.isDirectEntry)
        .map(g => g.subjectName)
    );
    return Array.from(directNames);
  }, [adviserClass.importedGrades]);

  const [selectedSubject, setSelectedSubject] = useState<string>(directSubjects[0] || '');
  const [selectedQuarter, setSelectedQuarter] = useState<string>(quarterKeys[0] || '1st Quarter');

  // Input grades local buffer: studentLRN -> grade string
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [entryReason, setEntryReason] = useState<string>('Part-time teacher direct grade submission');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Current active ImportedSubjectGrades record for the selected subject and quarter
  const currentRecord = useMemo(() => {
    if (!selectedSubject) return null;
    return adviserClass.importedGrades.find(
      g => g.subjectName === selectedSubject && g.quarterKey === selectedQuarter
    ) || null;
  }, [adviserClass.importedGrades, selectedSubject, selectedQuarter]);

  // Sync inputs whenever selectedSubject, selectedQuarter, or record changes
  React.useEffect(() => {
    if (selectedSubject && !directSubjects.includes(selectedSubject) && directSubjects.length > 0) {
      setSelectedSubject(directSubjects[0]);
    }
  }, [directSubjects, selectedSubject]);

  React.useEffect(() => {
    if (currentRecord) {
      const initial: Record<string, string> = {};
      adviserClass.students.forEach(st => {
        const val = currentRecord.grades[st.lrn];
        initial[st.lrn] = val !== undefined && val !== null ? String(val) : '';
      });
      setGradeInputs(initial);
    } else {
      const initial: Record<string, string> = {};
      adviserClass.students.forEach(st => {
        initial[st.lrn] = '';
      });
      setGradeInputs(initial);
    }
    setHasUnsavedChanges(false);
  }, [selectedSubject, selectedQuarter, currentRecord, adviserClass.students]);

  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) {
      setCreateError('Please enter a subject title.');
      return;
    }

    const trimmedName = newSubjectName.trim();
    // Check if subject already exists
    const exists = adviserClass.importedGrades.some(g => g.subjectName.toLowerCase() === trimmedName.toLowerCase()) ||
      (adviserClass.subjectOrder && adviserClass.subjectOrder.includes(trimmedName));

    if (exists) {
      setCreateError(`A subject named "${trimmedName}" already exists in this advisory class.`);
      return;
    }

    const newUID = `DIR-${adviserClass.schoolYear.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-6)}`;

    // Create default records for all quarters so it immediately appears in Grade Matrix and SF9
    const newRecords: ImportedSubjectGrades[] = quarterKeys.map(qk => ({
      subjectUID: `${newUID}-${qk.replace(/\s+/g, '')}`,
      subjectName: trimmedName,
      quarterKey: qk,
      isLanguageGroup: false,
      grades: {},
      isLocked: false,
      importedAt: new Date().toISOString(),
      isDirectEntry: true,
      directEntryTeacher: newTeacherName.trim() || 'Part-time Teacher'
    }));

    // Update AdviserClass atomically: add new subject to subjectOrder & add imported records
    updateAdviserClass(adviserClass.id, cls => {
      const updatedOrder = cls.subjectOrder && cls.subjectOrder.length > 0
        ? [...cls.subjectOrder, trimmedName]
        : [trimmedName];

      const logEntry: OverrideLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        adviserName: cls.adviserName,
        studentLRN: 'ALL',
        studentName: 'ALL',
        subjectUID: newUID,
        subjectName: trimmedName,
        quarterKey: 'All Quarters',
        action: 'Direct Grade Entry Created',
        newValue: `Teacher: ${newTeacherName.trim() || 'Part-time'}`,
        reason: 'Created Direct Grade Entry subject'
      };

      return {
        ...cls,
        subjectOrder: updatedOrder,
        importedGrades: [...cls.importedGrades, ...newRecords],
        overrideLog: [logEntry, ...(cls.overrideLog || [])]
      };
    });

    setSelectedSubject(trimmedName);
    setShowCreateModal(false);
    setNewSubjectName('');
    setNewTeacherName('');
    setCreateError('');
    globalToast.success(`Subject "${trimmedName}" created and added to Class Grade Matrix.`, 'Direct Entry Subject Created');
  };

  const handleGradeChange = (lrn: string, value: string) => {
    setGradeInputs(prev => ({
      ...prev,
      [lrn]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveGrades = () => {
    if (!selectedSubject) return;

    if (currentRecord?.isLocked) {
      globalToast.error(`"${selectedSubject}" for ${selectedQuarter} is locked. Please unlock it to make adjustments.`, 'Subject Locked');
      return;
    }

    const updatedGradesMap: Record<string, number> = {};
    let savedCount = 0;

    adviserClass.students.forEach(st => {
      const raw = gradeInputs[st.lrn];
      if (raw !== undefined && raw.trim() !== '') {
        const num = Number(raw);
        if (!isNaN(num) && num >= 0 && num <= 100) {
          updatedGradesMap[st.lrn] = Math.round(num);
          savedCount++;
        }
      }
    });

    const subjectUID = currentRecord?.subjectUID || `DIR-${Date.now().toString().slice(-6)}-${selectedQuarter.replace(/\s+/g, '')}`;

    const payload: ImportedSubjectGrades = {
      subjectUID,
      subjectName: selectedSubject,
      quarterKey: selectedQuarter,
      isLanguageGroup: false,
      grades: updatedGradesMap,
      isLocked: currentRecord ? currentRecord.isLocked : false,
      importedAt: new Date().toISOString(),
      isDirectEntry: true,
      directEntryTeacher: currentRecord?.directEntryTeacher || 'Part-time Teacher'
    };

    if (currentRecord) {
      replaceSubjectGrades(adviserClass.id, currentRecord.subjectUID, selectedQuarter, payload);
    } else {
      importSubjectGrades(adviserClass.id, payload);
    }

    // Add Action Log Entry
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName,
      studentLRN: 'CLASS',
      studentName: 'DIRECT GRADE ENTRY',
      subjectUID,
      subjectName: selectedSubject,
      quarterKey: selectedQuarter,
      action: 'Direct Grade Saved',
      newValue: `${savedCount} grades saved`,
      reason: entryReason || 'Adviser Direct Grade Entry'
    });

    setHasUnsavedChanges(false);
    globalToast.success(`Direct quarterly grades for "${selectedSubject}" (${selectedQuarter}) saved and reflected in Grade Matrix & SF9.`, 'Grades Saved');
  };

  const handleToggleLock = () => {
    if (!currentRecord) return;
    const nextLock = !currentRecord.isLocked;
    lockSubjectGrades(adviserClass.id, currentRecord.subjectUID, currentRecord.quarterKey, nextLock);
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName,
      studentLRN: 'ALL',
      studentName: 'ALL',
      subjectUID: currentRecord.subjectUID,
      subjectName: selectedSubject,
      quarterKey: selectedQuarter,
      action: nextLock ? 'Subject Locked' : 'Subject Unlocked',
      reason: 'Adviser toggled lock state from Direct Entry module'
    });
    globalToast.info(`"${selectedSubject}" (${selectedQuarter}) is now ${nextLock ? 'Locked' : 'Unlocked'}.`, nextLock ? 'Subject Locked' : 'Subject Unlocked');
  };

  return (
    <div className="adviser-page">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="adviser-heading">
            <PenTool className="h-5 w-5 shrink-0 text-amber-600" /> Direct grade entry
          </h2>
          <p className="adviser-description">
            Enter quarterly grades for part-time teachers without a teacher gradebook or JSON upload.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="adviser-button-primary"
        >
          <Plus className="h-4 w-4" /> Create Direct Subject
        </button>
      </div>

      {directSubjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-amber-200 dark:border-amber-900/40 p-8 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 text-balance">No Direct Entry Subjects Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-pretty">
              Create a subject directly for subjects handled by part-time teachers who provide only final quarterly grades.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="adviser-button-primary"
          >
            <Plus className="h-4 w-4" /> Create Direct Subject
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subject & Quarter Selector Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="ui-label">Direct Entry Subject</label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  className="ui-field"
                >
                  {directSubjects.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ui-label">Quarter / Semester</label>
                <select
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(e.target.value)}
                  className="ui-field"
                >
                  {quarterKeys.map(qk => (
                    <option key={qk} value={qk}>{qk}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ui-label">Audit Reason / Note</label>
                <input
                  type="text"
                  value={entryReason}
                  onChange={e => setEntryReason(e.target.value)}
                  placeholder="e.g. Part-time teacher encoded"
                  className="ui-field"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {adviserClass.students.length} Learners Registered
                </span>
                {currentRecord?.isLocked && (
                  <span className="flex items-center gap-1 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                )}
                {hasUnsavedChanges && (
                  <span className="text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    ● Unsaved Grade Changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentRecord && (
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border ${
                      currentRecord.isLocked
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                    } `}
                  >
                    {currentRecord.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {currentRecord.isLocked ? 'Unlock Quarter' : 'Lock Quarter'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveGrades}
                  disabled={currentRecord?.isLocked}
                  className="adviser-button-primary"
                >
                  <Save className="h-3.5 w-3.5" /> Save Grades to Matrix
                </button>
              </div>
            </div>
          </div>

          {/* Student Grade Encoding Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 font-medium text-slate-500 w-12 text-center">No.</th>
                    <th className="px-4 py-3 font-medium text-slate-500 w-36">LRN</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Learner Name</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-center w-20">Sex</th>
                    <th className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-center w-40">
                      Quarterly Grade ({selectedQuarter})
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-center w-28">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adviserClass.students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        No students found in advisory masterlist.
                      </td>
                    </tr>
                  ) : null}
                  {adviserClass.students.map((st, idx) => {
                    const gradeVal = gradeInputs[st.lrn] !== undefined ? gradeInputs[st.lrn] : '';
                    const numVal = Number(gradeVal);
                    const isPassing = !isNaN(numVal) && numVal >= adviserClass.promotionPassingGrade;
                    const hasVal = gradeVal.trim() !== '' && !isNaN(numVal);

                    return (
                      <tr key={st.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-500">{st.lrn}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{st.name}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500 font-semibold">{st.sex}</td>
                        <td className="px-4 py-2 text-center bg-amber-50/20 dark:bg-amber-950/10">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={gradeVal}
                            disabled={currentRecord?.isLocked}
                            onChange={e => handleGradeChange(st.lrn, e.target.value)}
                            placeholder="—"
                            className="ui-field w-24 text-center tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {hasVal && (
                            <span className={`text-sm font-semibold px-2 py-0.5 rounded-xl ${
                              isPassing
                                ? "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400"
                                : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            } `}>
                              {isPassing ? 'Passed' : 'Failed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Direct Subject Modal */}
      {showCreateModal && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Create direct entry subject" className="ui-dialog max-w-md">
            <div className="ui-dialog-header">
              <h3 className="ui-section-title">Create direct entry subject</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="adviser-button">Close</button>
            </div>

            <div className="ui-dialog-body space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex gap-2 items-start text-sm font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="ui-label">Subject Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Values Education or Homeroom Guidance"
                  className="ui-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ui-label">Assigned Teacher (Optional)</label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="e.g. Part-time Instructor"
                  className="ui-field"
                />
              </div>

              <p className="text-sm text-slate-500 leading-relaxed text-pretty">
                This subject will automatically appear in your class Grade Matrix and SF9 report card for Grade {adviserClass.gradeLevel} - {adviserClass.section}.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="adviser-button"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                className="adviser-button-primary"
              >
                <Plus className="h-4 w-4" /> Create & Add to Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
