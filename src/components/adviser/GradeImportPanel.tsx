import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, ImportedSubjectGrades } from '../../types';
import { getQuarterKeys } from '../../utils/adviserUtils';
import { parseGradeJSON } from '../../utils/subjectGradeExport';
import { globalToast } from '../../context/ToastContext';
import ImportedSubjectSummaryModal from './ImportedSubjectSummaryModal';
import { Upload, FileSpreadsheet, FileCode, AlertCircle, CheckCircle2, Lock, Unlock, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  adviserClass: AdviserClass;
}

export default function GradeImportPanel({ adviserClass }: Props) {
  const { importSubjectGrades, replaceSubjectGrades, lockSubjectGrades, addOverrideLogEntry, deleteImportedSubject } = useApp();
  const quarterKeys = getQuarterKeys(adviserClass.workspace);

  const [subjectType, setSubjectType] = useState<'languages' | 'other' | null>(null);

  // Per-form quarter selections
  const [otherQuarter, setOtherQuarter] = useState<string>(quarterKeys[0] || '');
  const [langQuarter, setLangQuarter] = useState<string>(quarterKeys[0] || '');

  // Form State
  const [subjectName, setSubjectName] = useState('');
  const [selectedLanguageGroup, setSelectedLanguageGroup] = useState<string>('');
  
  const [fileOne, setFileOne] = useState<File | null>(null);
  const [fileTwo, setFileTwo] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedSubjectRecord, setSelectedSubjectRecord] = useState<ImportedSubjectGrades | null>(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null); // `${subjectUID}|${quarterKey}`

  const fileOneRef = useRef<HTMLInputElement>(null);
  const fileTwoRef = useRef<HTMLInputElement>(null);

  // Inline confirm state (replaces window.confirm — blocked in macOS Tauri)
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);


  const resetForm = () => {
    setSubjectName('');
    setFileOne(null);
    setFileTwo(null);
    setErrorMsg(null);
    // Note: successMsg is intentionally NOT cleared here so the user sees the confirmation.
    if (fileOneRef.current) fileOneRef.current.value = '';
    if (fileTwoRef.current) fileTwoRef.current.value = '';
  };

  // ── Robust Excel parser ──────────────────────────────────────────────────────
  // Reads any file produced by teacherExcelExport.ts.
  // Returns the subjectUID, subjectName, and a map of LRN → grade for the
  // requested quarter column. If quarterToFind is null, it takes the first
  // numeric grade column it can find.
  const parseExcelFile = async (
    file: File,
    quarterToFind: string | null = null
  ): Promise<{ subjectUID: string; subjectName: string; grades: Record<string, number> }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

          console.log('[GradeImport] Raw rows from Excel:', rows);

          // ── 1. Scan info block for Subject UID / Subject Name ────────
          let subjectUID = '';
          let excelSubjectName = '';
          let dataStartIndex = -1;

          for (let i = 0; i < rows.length; i++) {
            const col0 = String(rows[i][0] ?? '').trim();
            const col1 = String(rows[i][1] ?? '').trim();

            if (col0 === 'Subject UID') subjectUID = col1;
            if (col0 === 'Subject Name') excelSubjectName = col1;
            if (col0 === 'LRN') {
              dataStartIndex = i + 1;
              break;
            }
          }

          console.log('[GradeImport] Parsed header → subjectUID:', subjectUID, '| subjectName:', excelSubjectName, '| dataStart:', dataStartIndex);

          if (!subjectUID) {
            return reject(new Error('Invalid file format: "Subject UID" row not found. Make sure you are uploading a file exported from the Teacher Gradebook.'));
          }
          if (dataStartIndex === -1) {
            return reject(new Error('Invalid file format: "LRN" header row not found.'));
          }

          // ── 2. Identify which column to use for grades ───────────────
          const headerRow = rows[dataStartIndex - 1];
          console.log('[GradeImport] Header row:', headerRow);

          let gradeColIndex = -1;

          if (quarterToFind) {
            // Exact match first
            for (let c = 0; c < headerRow.length; c++) {
              if (String(headerRow[c]).trim() === quarterToFind) {
                gradeColIndex = c;
                break;
              }
            }
            // Soft match (e.g. "1st" inside "1st Quarter")
            if (gradeColIndex === -1) {
              for (let c = 0; c < headerRow.length; c++) {
                const h = String(headerRow[c]).trim();
                if (h.includes(quarterToFind) || quarterToFind.includes(h)) {
                  gradeColIndex = c;
                  break;
                }
              }
            }
          }

          // Fallback: first non-LRN, non-name column that contains a number somewhere
          if (gradeColIndex === -1) {
            for (let c = 2; c < headerRow.length; c++) {
              const h = String(headerRow[c]).trim();
              if (h && h !== 'Remarks' && h !== 'Student Name') {
                gradeColIndex = c;
                break;
              }
            }
          }

          console.log('[GradeImport] Using grade column index:', gradeColIndex, '→', headerRow[gradeColIndex]);

          if (gradeColIndex === -1) {
            return reject(new Error('Could not find a grade column in the Excel file. Make sure the exported file contains quarter grade columns.'));
          }

          // ── 3. Read LRN → grade pairs ────────────────────────────────
          const grades: Record<string, number> = {};
          for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            const rawLRN = String(row[0] ?? '').trim();
            if (!rawLRN || rawLRN === 'Remarks') continue;

            const rawGrade = row[gradeColIndex];
            const gradeVal = Number(rawGrade);
            if (!isNaN(gradeVal) && gradeVal > 0) {
              grades[rawLRN] = gradeVal;
            }
          }

          console.log('[GradeImport] Parsed grades:', grades);

          if (Object.keys(grades).length === 0) {
            return reject(new Error(`No valid grade data found in the "${String(headerRow[gradeColIndex])}" column. Make sure grades have been computed for this quarter.`));
          }

          resolve({ subjectUID, subjectName: excelSubjectName, grades });
        } catch (err: any) {
          console.error('[GradeImport] Parse error:', err);
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Unified parser supporting JSON (native) & Excel (legacy fallback)
  const parseImportFile = async (
    file: File,
    quarterToFind: string | null = null
  ): Promise<{ subjectUID: string; subjectName: string; grades: Record<string, number> }> => {
    if (file.name.toLowerCase().endsWith('.json')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsed = parseGradeJSON(content);

            let targetQuarterData = quarterToFind
              ? parsed.quarters.find(
                  q => q.quarterKey === quarterToFind ||
                  q.quarterKey.includes(quarterToFind) ||
                  quarterToFind.includes(q.quarterKey)
                )
              : parsed.quarters[0];

            if (!targetQuarterData && parsed.quarters.length > 0) {
              targetQuarterData = parsed.quarters[0];
            }

            if (!targetQuarterData) {
              return reject(new Error('No quarter grade data found in JSON file.'));
            }

            const grades: Record<string, number> = {};
            targetQuarterData.grades.forEach(g => {
              if (g.lrn && typeof g.grade === 'number' && !isNaN(g.grade)) {
                grades[g.lrn] = g.grade;
              }
            });

            if (Object.keys(grades).length === 0) {
              return reject(new Error(`No valid student grades found for "${quarterToFind || 'selected quarter'}" in JSON file.`));
            }

            resolve({
              subjectUID: parsed.subjectUID,
              subjectName: parsed.subjectName,
              grades,
            });
          } catch (err: any) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read JSON file.'));
        reader.readAsText(file);
      });
    } else {
      return parseExcelFile(file, quarterToFind);
    }
  };

  const handleImportOther = async () => {
    if (!fileOne || !otherQuarter) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const parsed = await parseImportFile(fileOne, otherQuarter);

      // Use subject name from the Excel file itself — no longer require adviser to type it
      const resolvedName = parsed.subjectName || subjectName;
      if (!resolvedName) {
        setErrorMsg('Could not determine subject name. Please type the subject name in the field above.');
        return;
      }

      // Check for duplicate UID in this quarter
      const existing = adviserClass.importedGrades.find(
        g => g.subjectUID === parsed.subjectUID && g.quarterKey === otherQuarter
      );

      const payload: ImportedSubjectGrades = {
        subjectUID: parsed.subjectUID,
        subjectName: resolvedName,
        quarterKey: otherQuarter,
        isLanguageGroup: false,
        grades: parsed.grades,
        isLocked: false,
        importedAt: new Date().toISOString()
      };

        if (existing) {
        if (existing.isLocked) {
          throw new Error('This subject has already been uploaded and is locked. Unlock it first before replacing.');
        }
        setPendingConfirm({
          message: `"${resolvedName}" has already been uploaded for ${otherQuarter}. Replace existing grades?`,
          onConfirm: () => {
            replaceSubjectGrades(adviserClass.id, parsed.subjectUID, otherQuarter, payload);
            addOverrideLogEntry(adviserClass.id, {
              adviserName: adviserClass.adviserName, studentLRN: 'ALL', studentName: 'ALL',
              subjectUID: parsed.subjectUID, subjectName: resolvedName, quarterKey: otherQuarter,
              action: 'Subject Replaced', reason: 'Replaced uploaded excel file'
            });
            globalToast.info(`Replaced grades for "${resolvedName}" (${otherQuarter}).`, 'Subject Grades Replaced');
            setSuccessMsg(`✅ Successfully replaced grades for "${resolvedName}" (${otherQuarter}).`);
            resetForm();
          }
        });
        return;
      }

      importSubjectGrades(adviserClass.id, payload);
      addOverrideLogEntry(adviserClass.id, {
        adviserName: adviserClass.adviserName, studentLRN: 'ALL', studentName: 'ALL',
        subjectUID: parsed.subjectUID, subjectName: resolvedName, quarterKey: otherQuarter,
        action: 'Subject Imported', reason: 'Initial excel file upload'
      });
      globalToast.success(`Imported ${Object.keys(parsed.grades).length} student grades for "${resolvedName}" (${otherQuarter}).`, 'Grade Import Successful');

      setSuccessMsg(`✅ Successfully imported ${Object.keys(parsed.grades).length} student grades for "${resolvedName}" (${otherQuarter}). Open Grade Matrix → ${otherQuarter} to review them.`);
      resetForm();
    } catch (err: any) {
      console.error('[GradeImport] Import failed:', err);
      setErrorMsg(err.message || 'Failed to parse or import the Excel file.');
      globalToast.error(err.message || 'Failed to parse or import the file.', 'Grade Import Failed');
    }
  };


  const handleImportLanguage = async () => {
    if (!fileOne || !fileTwo || !selectedLanguageGroup || !langQuarter) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // BUG FIX: pass langQuarter so JSON parser selects the correct quarter
      const parsedOne = await parseImportFile(fileOne, langQuarter);
      const parsedTwo = await parseImportFile(fileTwo, langQuarter);
      
      const lg = adviserClass.languageGroups.find(g => g.label === selectedLanguageGroup);
      if (!lg) throw new Error("Composite group not found");

      const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
      const lgNormalized = lg.subjects.map(normalizeName);
      const fileOneNorm = normalizeName(parsedOne.subjectName);
      const fileTwoNorm = normalizeName(parsedTwo.subjectName);

      const matchesGroup = lgNormalized.includes(fileOneNorm) && lgNormalized.includes(fileTwoNorm) && fileOneNorm !== fileTwoNorm;

      if (!matchesGroup) {
        throw new Error(`The uploaded files ("${parsedOne.subjectName}" and "${parsedTwo.subjectName}") do not match the required subjects for ${selectedLanguageGroup} (${lg.subjects.join(', ')}).`);
      }

      // Merge grades
      const finalGrades: Record<string, number> = {};
      const allLrn = new Set([...Object.keys(parsedOne.grades), ...Object.keys(parsedTwo.grades)]);
      
      allLrn.forEach(lrn => {
        const g1 = parsedOne.grades[lrn] || 0;
        const g2 = parsedTwo.grades[lrn] || 0;
        if (g1 > 0 || g2 > 0) {
          const divisor = (g1 > 0 && g2 > 0) ? 2 : 1;
          finalGrades[lrn] = Math.round(((g1 + g2) / divisor) * 100) / 100;
        }
      });

      const isMAPEH = selectedLanguageGroup === 'MAPEH';
      const syntheticUID = `GRP-${parsedOne.subjectUID}-${parsedTwo.subjectUID}`;
      const payload: ImportedSubjectGrades = {
        subjectUID: syntheticUID,
        subjectName: selectedLanguageGroup,
        quarterKey: langQuarter,
        isLanguageGroup: true,
        isMAPEHGroup: isMAPEH,
        grades: finalGrades,
        languageRawGrades: {
          [parsedOne.subjectName]: parsedOne.grades,
          [parsedTwo.subjectName]: parsedTwo.grades
        },
        isLocked: false,
        importedAt: new Date().toISOString()
      };

      const existing = adviserClass.importedGrades.find(g => g.subjectName === selectedLanguageGroup && g.quarterKey === langQuarter);

      if (existing) {
        if (existing.isLocked) {
          throw new Error("This composite subject group has already been uploaded and is locked.");
        }
        setPendingConfirm({
          message: `This composite group (${selectedLanguageGroup}) has already been uploaded for this quarter. Replace existing grades?`,
          onConfirm: () => {
            replaceSubjectGrades(adviserClass.id, existing.subjectUID, langQuarter, payload);
            globalToast.info(`Replaced grades for composite group "${selectedLanguageGroup}" (${langQuarter}).`, 'Composite Grades Replaced');
            setSuccessMsg(`Successfully imported and merged grades for ${selectedLanguageGroup}.`);
            resetForm();
          }
        });
        return;
      } else {
        importSubjectGrades(adviserClass.id, payload);
        globalToast.success(`Successfully imported and merged grades for "${selectedLanguageGroup}" (${langQuarter}).`, 'Composite Import Successful');
      }
      
      setSuccessMsg(`Successfully imported and merged grades for ${selectedLanguageGroup}.`);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse Excel files.");
      globalToast.error(err.message || "Failed to parse composite Excel files.", "Composite Import Failed");
    }
  };

  const handleLockToggle = (g: ImportedSubjectGrades) => {
    lockSubjectGrades(adviserClass.id, g.subjectUID, g.quarterKey, !g.isLocked);
    addOverrideLogEntry(adviserClass.id, {
      adviserName: adviserClass.adviserName, studentLRN: 'ALL', studentName: 'ALL',
      subjectUID: g.subjectUID, subjectName: g.subjectName, quarterKey: g.quarterKey,
      action: !g.isLocked ? 'Subject Locked' : 'Subject Unlocked', reason: 'Adviser toggled lock state'
    });
    globalToast.info(`Subject "${g.subjectName}" (${g.quarterKey}) is now ${!g.isLocked ? 'Locked' : 'Unlocked'}.`, !g.isLocked ? 'Subject Locked' : 'Subject Unlocked');
  };

  const handleDeleteSubject = (g: ImportedSubjectGrades) => {
    const key = `${g.subjectUID}|${g.quarterKey}`;
    if (g.isLocked) {
      globalToast.warning(`"${g.subjectName}" is locked. Unlock it first before deleting.`, 'Subject Locked');
      return;
    }
    if (pendingDeleteKey === key) {
      // Confirmed — perform delete
      deleteImportedSubject(adviserClass.id, g.subjectUID, g.quarterKey);
      addOverrideLogEntry(adviserClass.id, {
        adviserName: adviserClass.adviserName, studentLRN: 'ALL', studentName: 'ALL',
        subjectUID: g.subjectUID, subjectName: g.subjectName, quarterKey: g.quarterKey,
        action: 'Subject Deleted', reason: 'Adviser removed imported subject record'
      });
      globalToast.success(`"${g.subjectName}" (${g.quarterKey}) has been removed from the grade matrix.`, 'Subject Deleted');
      setPendingDeleteKey(null);
    } else {
      // First click — request confirmation
      setPendingDeleteKey(key);
    }
  };

  return (
    <div className="adviser-page">
      <div>
        <h2 className="adviser-heading">
          <Upload className="h-5 w-5 shrink-0 text-amber-600" /> Import grades
        </h2>
        <p className="adviser-description">Upload official final quarter grades exported by subject teachers.</p>
      </div>

      {/* Import Panel - always visible, no quarter gating */}
      <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-xl p-6">

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-red-800 dark:text-red-300">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-900/50 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">{successMsg}</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Subject Type Selector */}
          <div className="space-y-4">
            <label className="ui-label">Select Subject Type</label>
            
            {adviserClass.languageGroups.length > 0 && (
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                subjectType === "languages" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              } `}>
                <input type="radio" name="subjectType" checked={subjectType === 'languages'} onChange={() => { setSubjectType('languages'); resetForm(); }} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {adviserClass.workspace === 'JHS' ? 'Composite MAPEH' : 'Composite Languages'}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {adviserClass.workspace === 'JHS'
                      ? 'Upload both component files (Music & Arts and PE & Health) together'
                      : 'Upload both language files (e.g., English & Filipino) to merge'}
                  </div>
                </div>
              </label>
            )}
            
            <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
              subjectType === "other" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            } `}>
              <input type="radio" name="subjectType" checked={subjectType === 'other'} onChange={() => { setSubjectType('other'); resetForm(); }} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">Standard Subject</div>
                <div className="text-sm text-slate-500 mt-0.5">Upload a single subject excel export</div>
              </div>
            </label>
          </div>

          {/* Upload Forms */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-300 dark:border-slate-800">
            {!subjectType && <div className="text-center text-sm text-slate-500 py-12">Select a subject type to continue</div>}
            
            {subjectType === 'other' && (
              <div className="space-y-5">
                {/* Quarter Selector inline */}
                <div className="space-y-1.5">
                  <label className="ui-label">Quarter <span className="text-red-500">*</span></label>
                  <select
                    value={otherQuarter}
                    onChange={e => setOtherQuarter(e.target.value)}
                    className="ui-field"
                  >
                    {quarterKeys.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="ui-label">
                    Subject Name
                    <span className="ml-1 font-normal text-slate-500">(optional — auto-read from file)</span>
                  </label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="Leave blank to use name from the Excel file"
                    className="ui-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ui-label">Grade File (JSON / Excel) <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    ref={fileOneRef}
                    accept=".json, .xlsx, .xls"
                    onChange={e => setFileOne(e.target.files?.[0] || null)}
                    className="block min-h-10 w-full min-w-0 text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                  />
                  <p className="text-sm text-slate-500 text-pretty">
                    Upload the JSON (or Excel) file exported from the Teacher Gradebook.
                  </p>
                </div>
                <button
                  onClick={handleImportOther}
                  disabled={!fileOne}
                  className="adviser-button-primary w-full"
                >
                  <FileCode className="h-4 w-4" /> Import Standard Subject
                </button>
              </div>
            )}

            {subjectType === 'languages' && (
              <div className="space-y-5">
                {/* Quarter Selector inline */}
                <div className="space-y-1.5">
                  <label className="ui-label">Quarter <span className="text-red-500">*</span></label>
                  <select
                    value={langQuarter}
                    onChange={e => setLangQuarter(e.target.value)}
                    className="ui-field"
                  >
                    {quarterKeys.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="ui-label">{adviserClass.workspace === 'JHS' ? 'MAPEH Group' : 'Language Group'}</label>
                  <select
                    value={selectedLanguageGroup}
                    onChange={e => setSelectedLanguageGroup(e.target.value)}
                    className="ui-field"
                  >
                    <option value="">Select Group...</option>
                    {adviserClass.languageGroups.map(lg => (
                      <option key={lg.label} value={lg.label}>{lg.label} ({lg.subjects.join(', ')})</option>
                    ))}
                  </select>
                </div>

                {selectedLanguageGroup && (() => {
                  const lg = adviserClass.languageGroups.find(g => g.label === selectedLanguageGroup)!;
                  return (
                    <>
                      <div className="space-y-1.5">
                        <label className="ui-label">{lg.subjects[0]} File (JSON / Excel)</label>
                        <input
                          type="file"
                          ref={fileOneRef}
                          accept=".json, .xlsx, .xls"
                          onChange={e => setFileOne(e.target.files?.[0] || null)}
                          className="block min-h-10 w-full min-w-0 text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="ui-label">{lg.subjects[1]} File (JSON / Excel)</label>
                        <input
                          type="file"
                          ref={fileTwoRef}
                          accept=".json, .xlsx, .xls"
                          onChange={e => setFileTwo(e.target.files?.[0] || null)}
                          className="block min-h-10 w-full min-w-0 text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                        />
                      </div>
                      <button
                        onClick={handleImportLanguage}
                        disabled={!fileOne || !fileTwo}
                        className="adviser-button-primary w-full"
                      >
                        <FileSpreadsheet className="h-4 w-4" /> Import Composite Group
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Imported Subject Summaries */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg text-balance">Imported Subjects Log</h3>
        
        {adviserClass.importedGrades.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-500 text-sm">
            No subjects have been imported yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...adviserClass.importedGrades]
              .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
              .map(g => {
                const cardKey = `${g.subjectUID}-${g.quarterKey}`;
                const deleteKey = `${g.subjectUID}|${g.quarterKey}`;
                const isConfirmingDelete = pendingDeleteKey === deleteKey;
                return (
                  <div key={cardKey} className={`bg-white dark:bg-slate-900 border rounded-xl p-4 flex flex-col relative group transition-colors ${
                    isConfirmingDelete
                      ? "border-red-400 dark:border-red-700 ring-2 ring-red-200 dark:ring-red-900/40"
                      : "border-slate-200 dark:border-slate-800"
                  } `}>
                    {/* Lock / Unlock button */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleLockToggle(g)}
                        className="adviser-button"
                        aria-pressed={g.isLocked}
                        title={g.isLocked ? 'Unlock Subject' : 'Lock Subject'}
                      >
                        {g.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        {g.isLocked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(g)}
                        className="adviser-button text-red-700 dark:text-red-400"
                        title={isConfirmingDelete ? 'Click again to confirm deletion' : 'Delete this imported subject'}
                      >
                        <Trash2 className="h-4 w-4" /> {isConfirmingDelete ? 'Confirm delete' : 'Delete'}
                      </button>
                    </div>

                    <div className="text-sm font-semibold text-amber-600 dark:text-amber-500">{g.quarterKey}</div>
                    <button
                      type="button"
                      className="mt-1 min-h-10 break-words text-left text-base font-semibold text-slate-800 hover:text-amber-700 hover:underline dark:text-slate-100 dark:hover:text-amber-400"
                      title={g.subjectName}
                      onClick={() => !isConfirmingDelete && setSelectedSubjectRecord(g)}
                    >
                      {g.subjectName}
                    </button>
                    <div className="mt-1 break-all text-xs tabular-nums text-slate-500">{g.subjectUID}</div>

                    {/* Confirm-delete banner */}
                    {isConfirmingDelete && (
                      <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-red-700 dark:text-red-400">Delete this subject?</div>
                          <div className="text-sm text-red-600 dark:text-red-500 mt-0.5">This removes it from the grade matrix. Click the delete icon again to confirm, or</div>
                          <button
                            onClick={() => setPendingDeleteKey(null)}
                            className="adviser-button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm text-slate-500">
                      <div>{Object.keys(g.grades).length} Students</div>
                      <div>{new Date(g.importedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {selectedSubjectRecord && (
        <ImportedSubjectSummaryModal
          adviserClass={adviserClass}
          subjectData={selectedSubjectRecord}
          onClose={() => setSelectedSubjectRecord(null)}
        />
      )}

      {/* Inline Confirm Modal (macOS Tauri-safe, replaces window.confirm) */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-pretty">{pendingConfirm.message}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { pendingConfirm.onConfirm(); setPendingConfirm(null); }}
                className="adviser-button-primary flex-1"
              >
                Yes, Replace
              </button>
              <button
                onClick={() => setPendingConfirm(null)}
                className="adviser-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
