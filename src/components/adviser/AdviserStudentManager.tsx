import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, AdviserStudent } from '../../types';
import { GradeMatrix } from '../../utils/adviserUtils';
import {
  Users, Plus, Pencil, Trash2, Check, X, AlertCircle,
  ClipboardList, Upload, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';

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

  // Single-add form state
  const [lrn, setLrn] = useState('');
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [age, setAge] = useState<string>('');
  const [reason, setReason] = useState('Late enrollee');
  const [errorMsg, setErrorMsg] = useState('');

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkImported, setBulkImported] = useState(false);

  const reasonOptions = ['Late enrollee', 'Teacher omitted learner', 'Approved correction', 'Other'];

  const resetForm = () => {
    setLrn(''); setName(''); setSex('Male'); setAge(''); setReason('Late enrollee'); setErrorMsg('');
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
    const parsedAge = age ? parseInt(age, 10) : undefined;
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: [...cls.students, { lrn, name, sex, age: parsedAge }].sort((a, b) => a.name.localeCompare(b.name))
    }));
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: lrn, studentName: name, action: 'Student Added', reason
    });
    resetForm();
  };

  const handleEditSubmit = (oldLrn: string) => {
    if (!lrn || !name || !reason) { setErrorMsg('All fields are required.'); return; }
    if (oldLrn !== lrn && adviserClass.students.some(s => s.lrn === lrn)) { setErrorMsg('LRN already in use.'); return; }
    const oldStudent = adviserClass.students.find(s => s.lrn === oldLrn);
    const parsedAge = age ? parseInt(age, 10) : undefined;
    updateAdviserClass(adviserClass.id, cls => ({
      ...cls,
      students: cls.students.map(s => s.lrn === oldLrn ? { lrn, name, sex, age: parsedAge } : s).sort((a, b) => a.name.localeCompare(b.name))
    }));
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: lrn, studentName: name,
      action: 'Student Edited', previousValue: JSON.stringify(oldStudent), newValue: JSON.stringify({ lrn, name, sex, age: parsedAge }), reason
    });
    resetForm();
  };

  const handleDelete = (sLrn: string, sName: string) => {
    const delReason = window.prompt('Enter reason for deletion (e.g., Dropped, Transferred):');
    if (!delReason) return;
    if (window.confirm(`Are you sure you want to delete ${sName} from the masterlist?`)) {
      updateAdviserClass(adviserClass.id, cls => ({
        ...cls,
        students: cls.students.filter(s => s.lrn !== sLrn)
      }));
      addOverrideLogEntry(adviserClass.id, {
        adviserName: adviserClass.adviserName, studentLRN: sLrn, studentName: sName,
        action: 'Student Deleted', reason: delReason
      });
    }
  };

  const startEdit = (s: AdviserStudent) => {
    setEditingLrn(s.lrn); setLrn(s.lrn); setName(s.name); setSex(s.sex); setAge(s.age !== undefined ? String(s.age) : '');
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
    setBulkImported(true);
    setTimeout(() => resetBulk(), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" /> Masterlist Manager
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage the official student masterlist for this section.
            <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">{adviserClass.students.length} students enrolled</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetForm(); setShowBulk(prev => !prev); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all shadow-sm"
          >
            <ClipboardList className="h-4 w-4" />
            Bulk Paste
            {showBulk ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => { resetBulk(); resetForm(); setShowAdd(prev => !prev); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Student
          </button>
        </div>
      </div>

      {/* ── Bulk Paste Panel ── */}
      {showBulk && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-500" />
                Bulk Student Import
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Paste student names from Excel, Google Sheets, or any list. Accepts tab-separated, comma-separated, or name-only lists.
              </p>
            </div>
            <button onClick={resetBulk} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Format hint */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-400 space-y-1">
              <div className="font-black uppercase tracking-wider mb-2">Accepted Formats (one student per line):</div>
              <div className="font-mono space-y-1 text-amber-700 dark:text-amber-500">
                <div><span className="opacity-50">▸</span> <strong>123456789012</strong>&emsp;DELA CRUZ, JUAN&emsp;Male</div>
                <div><span className="opacity-50">▸</span> <strong>123456789012</strong>&emsp;GARCIA, MARIA&emsp;Female</div>
                <div><span className="opacity-50">▸</span> SANTOS, PEDRO <em>(LRN auto-assigned as placeholder)</em></div>
              </div>
              <div className="mt-1 opacity-70">Sex defaults to Male if not specified. Paste from Excel works with tab-separated columns.</div>
            </div>

            {/* Paste area */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Paste Student List Here</label>
              <textarea
                value={bulkText}
                onChange={e => { setBulkText(e.target.value); setBulkImported(false); }}
                placeholder={`123456789012\tDELA CRUZ, JUAN\tMale\n123456789013\tGARCIA, MARIA\tFemale\n123456789014\tSANTOS, PEDRO\tMale`}
                rows={8}
                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    Preview: <span className="text-emerald-600">{validRows.length} will be added</span>
                    {duplicateCount > 0 && <span className="text-red-500 ml-2">{duplicateCount} already exist (skipped)</span>}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 text-left font-bold text-slate-500 w-8">#</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500">LRN</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500">Name</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500 w-16">Sex</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500 w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={row.duplicate ? 'opacity-40 bg-red-50/50 dark:bg-red-950/10' : ''}>
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                            {row.lrn}
                            {row.lrnGenerated && (
                              <span className="ml-1 text-[9px] text-amber-500 font-bold uppercase">auto</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{row.name}</td>
                          <td className="px-3 py-2 text-slate-500">{row.sex}</td>
                          <td className="px-3 py-2">
                            {row.duplicate
                              ? <span className="text-red-500 font-bold text-[9px] uppercase">Duplicate</span>
                              : <span className="text-emerald-600 font-bold text-[9px] uppercase">New</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={resetBulk} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors cursor-pointer">
                    Cancel
                  </button>
                  {bulkImported ? (
                    <div className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl">
                      <CheckCircle2 className="h-4 w-4" />
                      Imported!
                    </div>
                  ) : (
                    <button
                      onClick={handleBulkSave}
                      disabled={validRows.length === 0}
                      className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                      <Upload className="h-4 w-4" />
                      Import {validRows.length} Students
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
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">
              {editingLrn ? 'Edit Student' : 'Add New Student'}
            </h3>
            <button onClick={resetForm}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>
          </div>
          {errorMsg && (
            <div className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">LRN (12 Digits)</label>
              <input
                type="text"
                value={lrn}
                onChange={e => setLrn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Sex</label>
              <select
                value={sex}
                onChange={e => setSex(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-500">Age (Optional)</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="Auto"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 md:col-span-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">Override Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg dark:bg-slate-900 text-amber-700 font-semibold bg-amber-50 dark:bg-amber-900/30 focus:outline-none"
              >
                {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button
              onClick={() => editingLrn ? handleEditSubmit(editingLrn) : handleAddSubmit()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      )}

      {/* ── Masterlist Table ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-3 font-bold text-slate-500 w-16 text-center">No.</th>
              <th className="px-6 py-3 font-bold text-slate-500">LRN</th>
              <th className="px-6 py-3 font-bold text-slate-500">Name</th>
              <th className="px-6 py-3 font-bold text-slate-500">Sex</th>
              <th className="px-6 py-3 font-bold text-slate-500 text-center">Age</th>
              <th className="px-6 py-3 font-bold text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {adviserClass.students.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <div className="font-semibold">No students yet.</div>
                  <div className="text-xs mt-1">Use <strong>Add Student</strong> or <strong>Bulk Paste</strong> to get started.</div>
                </td>
              </tr>
            ) : null}
            {adviserClass.students.map((s, i) => (
              <tr key={s.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-3 text-center text-slate-400 font-mono">{i + 1}</td>
                <td className="px-6 py-3 font-mono text-slate-500 dark:text-slate-400 text-xs">{s.lrn}</td>
                <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{s.name}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{s.sex}</td>
                <td className="px-6 py-3 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">{s.age !== undefined ? s.age : <span className="text-slate-400 italic">Auto</span>}</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(s)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.lrn, s.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
