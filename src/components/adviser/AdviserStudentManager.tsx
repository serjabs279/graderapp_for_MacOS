import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, AdviserStudent } from '../../types';
import { GradeMatrix, calculateAge } from '../../utils/adviserUtils';
import { globalToast } from '../../context/ToastContext';
import {
  Users, Plus, Pencil, Trash2, Check, X, AlertCircle,
  ClipboardList, Upload, CheckCircle2, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import StudentGradesModal from './StudentGradesModal';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

// ─── Bulk Paste Parser ────────────────────────────────────────────────────────
// Accepts lines that are tab or comma separated, or just a name.
// Columns auto-detected: looks for a 12-digit LRN, a Sex token, and the rest is Name.
interface ParsedRow {
  lrn: string;
  name: string;
  sex: 'Male' | 'Female';
  lrnGenerated: boolean;  // true = no real LRN found, placeholder used
  duplicate: boolean;     // already exists in masterlist
}

function parseBulkText(raw: string, existing: AdviserStudent[]): ParsedRow[] {
  const existingLrns = new Set(existing.map(s => s.lrn));
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let lrnCounter = 1;

  return lines.map(line => {
    // Split by tab first, then comma, then 2+ spaces
    const tokens = line.includes('\t')
      ? line.split('\t').map(t => t.trim()).filter(Boolean)
      : line.includes(',')
        ? line.split(',').map(t => t.trim()).filter(Boolean)
        : line.split(/\s{2,}/).map(t => t.trim()).filter(Boolean);

    let lrn = '';
    let sexRaw: 'Male' | 'Female' = 'Male';
    let lrnGenerated = false;
    const remaining: string[] = [];

    tokens.forEach(tok => {
      if (/^\d{12}$/.test(tok)) {
        lrn = tok;
      } else if (/^(male|m)$/i.test(tok)) {
        sexRaw = 'Male';
      } else if (/^(female|f)$/i.test(tok)) {
        sexRaw = 'Female';
      } else {
        remaining.push(tok);
      }
    });

    // If no 12-digit LRN found, generate a placeholder
    if (!lrn) {
      lrn = `TEMP${String(lrnCounter++).padStart(8, '0')}`;
      lrnGenerated = true;
    }

    const name = remaining.join(' ').toUpperCase().trim() || 'UNKNOWN';
    const duplicate = existingLrns.has(lrn);

    return { lrn, name, sex: sexRaw, lrnGenerated, duplicate };
  });
}

export default function AdviserStudentManager({ adviserClass, gradeMatrix }: Props) {
  const { updateAdviserClass, addOverrideLogEntry } = useApp();
  
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingLrn, setEditingLrn] = useState<string | null>(null);
  const [viewingStudentLrn, setViewingStudentLrn] = useState<string | null>(null);

  // Single-add form state
  const [lrn, setLrn] = useState('');
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [age, setAge] = useState<string>('');
  const [birthdate, setBirthdate] = useState<string>('');
  const [reason, setReason] = useState('Late enrollee');
  const [errorMsg, setErrorMsg] = useState('');

  // Inline delete confirm modal state (replaces window.confirm/prompt — blocked in macOS Tauri)
  const [deleteTarget, setDeleteTarget] = useState<{ lrn: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonError, setDeleteReasonError] = useState('');

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkImported, setBulkImported] = useState(false);

  const reasonOptions = ['Late enrollee', 'Teacher omitted learner', 'Approved correction', 'Other'];

  const resetForm = () => {
    setLrn(''); setName(''); setSex('Male'); setAge(''); setBirthdate(''); setReason('Late enrollee'); setErrorMsg('');
    setShowAdd(false); setEditingLrn(null);
  };

  const resetBulk = () => {
    setBulkText(''); setBulkImported(false); setShowBulk(false);
  };

  // Live-parse the bulk text
  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!bulkText.trim()) return [];
    return parseBulkText(bulkText, adviserClass.students);
  }, [bulkText, adviserClass.students]);

  const validRows = parsedRows.filter(r => !r.duplicate);
  const duplicateCount = parsedRows.filter(r => r.duplicate).length;

  // ── Single Student Add ──────────────────────────────────────────────────────
  const handleAddSubmit = () => {
    if (!lrn || !name || !reason) { setErrorMsg('All fields are required.'); return; }
    if (adviserClass.students.some(s => s.lrn === lrn)) { setErrorMsg('Student with this LRN already exists.'); return; }
    const parsedAge = age ? parseInt(age, 10) : calculateAge(birthdate);
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: [...cls.students, { lrn, name, sex, age: parsedAge, birthdate: birthdate.trim() || undefined }].sort((a, b) => a.name.localeCompare(b.name))
    }));
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: lrn, studentName: name, action: 'Student Added', reason
    });
    globalToast.success(`Added ${name} (${lrn}) to section masterlist.`, 'Student Added');
    resetForm();
  };

  const handleEditSubmit = (oldLrn: string) => {
    if (!lrn || !name || !reason) { setErrorMsg('All fields are required.'); return; }
    if (oldLrn !== lrn && adviserClass.students.some(s => s.lrn === lrn)) { setErrorMsg('LRN already in use.'); return; }
    const oldStudent = adviserClass.students.find(s => s.lrn === oldLrn);
    const parsedAge = age ? parseInt(age, 10) : calculateAge(birthdate);
    const updatedStudent: AdviserStudent = { ...oldStudent, lrn, name, sex, age: parsedAge, birthdate: birthdate.trim() || undefined };
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: cls.students.map(s => s.lrn === oldLrn ? updatedStudent : s).sort((a, b) => a.name.localeCompare(b.name))
    }));
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: lrn, studentName: name,
      action: 'Student Edited', previousValue: JSON.stringify(oldStudent), newValue: JSON.stringify(updatedStudent), reason
    });
    globalToast.info(`Updated learner record for ${name}.`, 'Student Updated');
    resetForm();
  };

  const handleDelete = (sLrn: string, sName: string) => {
    setDeleteTarget({ lrn: sLrn, name: sName });
    setDeleteReason('');
    setDeleteReasonError('');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      setDeleteReasonError('Please enter a reason for deletion.');
      return;
    }
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: cls.students.filter(s => s.lrn !== deleteTarget.lrn)
    }));
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: deleteTarget.lrn, studentName: deleteTarget.name,
      action: 'Student Deleted', reason: deleteReason.trim()
    });
    globalToast.warning(`Removed ${deleteTarget.name} from section masterlist.`, 'Student Removed');
    setDeleteTarget(null);
    setDeleteReason('');
  };

  const startEdit = (s: AdviserStudent) => {
    setEditingLrn(s.lrn); setLrn(s.lrn); setName(s.name); setSex(s.sex);
    setAge(s.age !== undefined ? String(s.age) : calculateAge(s.birthdate)?.toString() ?? '');
    setBirthdate(s.birthdate || '');
    setReason('Approved correction'); setErrorMsg(''); setShowAdd(false); setShowBulk(false);
  };

  // ── Bulk Import Save ────────────────────────────────────────────────────────
  const handleBulkSave = () => {
    if (validRows.length === 0) return;
    updateAdviserClass(adviserClass.id, cls => {
      const merged = [...cls.students, ...validRows.map(r => ({ lrn: r.lrn, name: r.name, sex: r.sex }))];
      const sorted = merged.sort((a, b) => a.name.localeCompare(b.name));
      return { ...cls, students: sorted };
    });
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName,
      studentLRN: 'BULK',
      studentName: `${validRows.length} students`,
      action: 'Student Added',
      reason: `Bulk import — ${validRows.length} students added`
    });
    globalToast.success(`Imported ${validRows.length} students into section masterlist.`, 'Masterlist Import Successful');
    setBulkImported(true);
    setTimeout(() => resetBulk(), 2000);
  };

  return (
    <div className="adviser-page">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="adviser-heading">Student masterlist</h2>
          <p className="adviser-description">Manage learner details and view individual grades.</p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">{adviserClass.students.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetForm(); setShowBulk(prev => !prev); }}
            className="adviser-button"
            aria-expanded={showBulk}
          >
            <ClipboardList className="h-4 w-4" />
            Bulk paste
            {showBulk ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => { resetBulk(); resetForm(); setShowAdd(prev => !prev); }}
            className="adviser-button-primary"
            aria-expanded={showAdd}
          >
            <Plus className="h-4 w-4" /> Add student
          </button>
        </div>
      </div>

      {/* ── Bulk Paste Panel ── */}
      {showBulk && (
        <div className="ui-panel">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div>
              <h3 className="ui-section-title flex items-center gap-2">
                <ClipboardList className="size-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                Bulk student import
              </h3>
              <p className="mt-1 text-pretty text-sm text-slate-600 dark:text-slate-400">
                Paste names from Excel, Google Sheets, or any list. Tab-separated, comma-separated, or name-only rows are accepted.
              </p>
            </div>
            <button onClick={resetBulk} aria-label="Close bulk import" className="ui-icon-button shrink-0">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="ui-notice flex-col items-stretch gap-2 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <p className="text-sm font-medium">Accepted formats — one student per line</p>
              <div className="space-y-1 font-mono text-xs">
                <p><strong>123456789012</strong>&emsp;DELA CRUZ, JUAN&emsp;Male</p>
                <p><strong>123456789012</strong>&emsp;GARCIA, MARIA&emsp;Female</p>
                <p>SANTOS, PEDRO <em>(LRN auto-assigned as placeholder)</em></p>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                Sex defaults to Male when omitted. Excel pastes work because columns are tab-separated.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bulk-student-list" className="ui-label">Student list</label>
              <textarea
                id="bulk-student-list"
                value={bulkText}
                onChange={e => { setBulkText(e.target.value); setBulkImported(false); }}
                placeholder={`123456789012\tDELA CRUZ, JUAN\tMale\n123456789013\tGARCIA, MARIA\tFemale\n123456789014\tSANTOS, PEDRO\tMale`}
                rows={8}
                className="ui-field font-mono text-xs resize-y"
              />
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{validRows.length} to add</span>
                  {duplicateCount > 0 && <span className="ml-2 text-red-600 dark:text-red-400">{duplicateCount} already on the masterlist (skipped)</span>}
                </p>
                <div role="region" aria-label="Import preview" tabIndex={0} className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        <th scope="col" className="px-3 py-2 w-10">#</th>
                        <th scope="col" className="px-3 py-2">LRN</th>
                        <th scope="col" className="px-3 py-2">Name</th>
                        <th scope="col" className="px-3 py-2 w-20">Sex</th>
                        <th scope="col" className="px-3 py-2 w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={row.duplicate ? 'text-slate-400 dark:text-slate-500' : ''}>
                          <td className="px-3 py-2 font-mono tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2 font-mono tabular-nums">
                            {row.lrn}
                            {row.lrnGenerated && (
                              <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">auto</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                          <td className="px-3 py-2">{row.sex}</td>
                          <td className="px-3 py-2">
                            {row.duplicate
                              ? <span className="text-red-600 dark:text-red-400">Duplicate</span>
                              : <span className="text-emerald-700 dark:text-emerald-400">New</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button onClick={resetBulk} className="ui-button">
                    Cancel
                  </button>
                  {bulkImported ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Imported
                    </span>
                  ) : (
                    <button
                      onClick={handleBulkSave}
                      disabled={validRows.length === 0}
                      className="adviser-button adviser-button-primary"
                    >
                      <Upload className="size-4" aria-hidden="true" />
                      Import {validRows.length} students
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Single Add / Edit Form ── */}
      {(showAdd || editingLrn) && (
        <div className="adviser-panel space-y-5 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-balance text-base font-semibold text-slate-900 dark:text-slate-100">
              {editingLrn ? 'Edit Student' : 'Add New Student'}
            </h3>
            <button onClick={resetForm} className="adviser-button" aria-label="Cancel student changes"><X className="size-4" aria-hidden="true" /></button>
          </div>
          {errorMsg && (
            <div className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="learner-lrn" className="text-xs font-medium text-slate-600 dark:text-slate-400">LRN (12 digits)</label>
              <input
                id="learner-lrn"
                type="text"
                value={lrn}
                onChange={e => setLrn(e.target.value)}
                className="adviser-field"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="learner-name" className="text-xs font-medium text-slate-600 dark:text-slate-400">Full name</label>
              <input
                id="learner-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="adviser-field"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="learner-sex" className="text-xs font-medium text-slate-600 dark:text-slate-400">Sex</label>
              <select
                id="learner-sex"
                value={sex}
                onChange={e => setSex(e.target.value as any)}
                className="adviser-field"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="learner-age" className="text-xs font-medium text-slate-600 dark:text-slate-400">Age</label>
              <input
                id="learner-age"
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="Auto"
                className="adviser-field"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="learner-birthdate" className="text-xs font-medium text-slate-600 dark:text-slate-400">Birthdate (SF10)</label>
              <input
                id="learner-birthdate"
                type="date"
                value={birthdate}
                onChange={e => {
                  const value = e.target.value;
                  setBirthdate(value);
                  // Auto-fill the age, but keep the field editable for manual overrides.
                  const computed = calculateAge(value);
                  if (computed !== undefined) setAge(String(computed));
                }}
                className="adviser-field"
              />
              <p className="text-pretty text-xs text-slate-500 dark:text-slate-400">Age fills in automatically; you can still edit it.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 md:col-span-3">
              <label htmlFor="learner-reason" className="text-xs font-medium text-slate-600 dark:text-slate-400">Reason for change</label>
              <select
                id="learner-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="adviser-field"
              >
                {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button
              onClick={() => editingLrn ? handleEditSubmit(editingLrn) : handleAddSubmit()}
              className="adviser-button-primary w-full"
            >
              <Check className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      )}

      {/* ── Masterlist Table ── */}
      <div className="adviser-panel">
        <div className="overflow-x-auto" role="region" aria-label="Student masterlist table" tabIndex={0}>
        <table className="w-full min-w-3xl text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-3 font-bold text-slate-500 w-16 text-center">No.</th>
              <th className="px-6 py-3 font-bold text-slate-500">LRN</th>
              <th className="px-6 py-3 font-bold text-slate-500">Name</th>
              <th className="px-6 py-3 font-bold text-slate-500">Sex</th>
              <th className="px-6 py-3 font-bold text-slate-500 text-center">Age</th>
              <th className="px-6 py-3 font-bold text-slate-500 text-right">Actions</th>
              <th className="px-6 py-3 font-bold text-slate-500 text-center">Grades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {adviserClass.students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-500 dark:text-slate-400">
                  <Users className="mx-auto mb-2 size-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">No students on the masterlist yet.</p>
                  <p className="mt-1 text-sm">Add each learner, or paste the class list from Excel.</p>
                  <button
                    onClick={() => { resetBulk(); setShowBulk(false); setShowAdd(true); }}
                    className="adviser-button adviser-button-primary mx-auto mt-4"
                  >
                    <Plus className="size-4" aria-hidden="true" /> Add student
                  </button>
                </td>
              </tr>
            ) : null}
            {adviserClass.students.map((s, i) => {
              const displayAge = s.age !== undefined ? s.age : calculateAge(s.birthdate);
              return (
              <tr key={s.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                <td className="px-6 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs">{s.lrn}</td>
                <td className="min-w-64 px-6 py-3 font-medium text-slate-900 dark:text-slate-200">{s.name}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{s.sex}</td>
                <td className="px-6 py-3 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                  {s.birthdate ? (
                    <div>
                      <span title={s.age === undefined ? 'Auto-calculated from birthdate' : undefined}>
                        {displayAge !== undefined ? displayAge : '—'}
                      </span>
                      <div className="mt-1 whitespace-nowrap text-xs font-normal text-slate-500 dark:text-slate-400">{s.birthdate}</div>
                    </div>
                  ) : displayAge !== undefined ? (
                    displayAge
                  ) : (
                    <span className="text-slate-400 italic">Auto</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(s)}
                      className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      title="Edit"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.lrn, s.name)}
                      className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      title="Delete"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  {gradeMatrix.find(r => r.lrn === s.lrn) ? (
                    <button
                      onClick={() => setViewingStudentLrn(s.lrn)}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      title={`View ${s.name}'s grades`}
                      aria-label={`View ${s.name}'s grades`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">No grades</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Student Grades Modal */}
      {viewingStudentLrn && (() => {
        const studentRow = gradeMatrix.find(r => r.lrn === viewingStudentLrn);
        if (!studentRow) return null;
        return (
          <StudentGradesModal
            student={studentRow}
            adviserClass={adviserClass}
            onClose={() => setViewingStudentLrn(null)}
          />
        );
      })()}

      {/* ── Inline Delete Confirm Modal (macOS Tauri-safe) ── */}
      {deleteTarget && (
        <div className="ui-dialog-overlay">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-student-title" aria-describedby="delete-student-desc" className="ui-dialog max-w-sm">
            <div className="ui-dialog-header">
              <Trash2 className="size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <h3 id="delete-student-title" className="ui-section-title flex-1">Remove learner from masterlist?</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} aria-label="Close delete dialog" className="ui-icon-button">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="ui-dialog-body space-y-4">
              <p id="delete-student-desc" className="text-pretty text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-slate-100">{deleteTarget.name}</span> will be removed from the masterlist. Recorded grades stay in the subject teachers&apos; gradebooks.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="delete-student-reason" className="ui-label">
                  Reason <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <select
                  id="delete-student-reason"
                  value={deleteReason}
                  onChange={e => { setDeleteReason(e.target.value); setDeleteReasonError(''); }}
                  className="adviser-field"
                >
                  <option value="">Select a reason…</option>
                  <option value="Dropped">Dropped</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Duplicate entry">Duplicate entry</option>
                  <option value="Added by mistake">Added by mistake</option>
                  <option value="Other">Other</option>
                </select>
                {deleteReasonError && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{deleteReasonError}</p>
                )}
              </div>
            </div>
            <div className="ui-dialog-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="ui-button">Cancel</button>
              <button type="button" onClick={confirmDelete} className="ui-button ui-button-danger">
                Remove learner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
