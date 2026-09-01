import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { globalToast } from '../context/ToastContext';
import { SubjectType, ArchiveFile, ArchiveValidationResult, ARCHIVE_VERSION } from '../types';
import { 
  Building2, 
  RotateCcw, 
  Database, 
  FileCode, 
  Upload, 
  BookOpen, 
  GraduationCap, 
  ShieldCheck, 
  AlertTriangle,
  Download,
  CheckCircle,
  FileUp,
  Languages,
  Archive,
  X
} from 'lucide-react';

export default function SettingsView() {
  const { 
    globalSettings, 
    updateGlobalSettings, 
    resetDatabase,
    backupData,
    restoreData,
    restoreArchive,
    rolloverAcademicYear,
    authUsername,
    authPassword,
    updateCredentials
  } = useApp();

  const [schoolName, setSchoolName] = useState(globalSettings.schoolName);
  const [teacherName, setTeacherName] = useState(globalSettings.teacherName);
  const [defaultPassingGrade, setDefaultPassingGrade] = useState(globalSettings.defaultPassingGrade);
  const [theme, setTheme] = useState(globalSettings.theme);
  const [language, setLanguage] = useState(globalSettings.language);
  const [depedPolicy, setDepedPolicy] = useState(globalSettings.depedPolicy);
  const [calendarType, setCalendarType] = useState(globalSettings.calendarType || 'Quarter');
  const [subjects, setSubjects] = useState(globalSettings.subjects);
  const [depedLogoBase64, setDepedLogoBase64] = useState<string | undefined>(globalSettings.depedLogoBase64);
  const [schoolLogoBase64, setSchoolLogoBase64] = useState<string | undefined>(globalSettings.schoolLogoBase64);

  const [saved, setSaved] = useState(false);
  const [restored, setRestored] = useState<boolean | null>(null);

  // Rollover States
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverYear, setRolloverYear] = useState('');
  const [rolloverCalendar, setRolloverCalendar] = useState<'Quarter' | 'Trimester'>('Quarter');
  const [rolloverError, setRolloverError] = useState<string | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // Archive Restore States
  const [pendingArchive, setPendingArchive] = useState<ArchiveFile | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // New states for custom credentials
  const [newUsername, setNewUsername] = useState(authUsername);
  const [newPassword, setNewPassword] = useState(authPassword);
  const [confirmPassword, setConfirmPassword] = useState(authPassword);
  const [credMessage, setCredMessage] = useState<string | null>(null);

  const getSubjectWeightObj = (subj: SubjectType) => {
    const w = subjects?.[subj];
    if (!w) return { wow: 0.3, ppt: 0.5, qste: 0.2 };
    return {
      wow: typeof w.wow === 'number' ? w.wow : ((w as any).ww ?? 0.3),
      ppt: typeof w.ppt === 'number' ? w.ppt : ((w as any).pt ?? 0.5),
      qste: typeof w.qste === 'number' ? w.qste : ((w as any).qa ?? 0.2)
    };
  };

  const handleWeightChange = (subj: SubjectType, component: 'wow' | 'ppt' | 'qste', value: string) => {
    const rawVal = parseInt(value);
    const safeRaw = isNaN(rawVal) ? 0 : Math.max(0, Math.min(100, rawVal));
    const numVal = safeRaw / 100;
    setSubjects(prev => {
      const cur = getSubjectWeightObj(subj);
      return {
        ...prev,
        [subj]: {
          ...cur,
          [component]: numVal
        }
      };
    });
  };

  const getSubjectSum = (subj: SubjectType) => {
    const w = getSubjectWeightObj(subj);
    return Math.round((w.wow + w.ppt + w.qste) * 100);
  };

  const isAllWeightsValid = Object.keys(subjects).every(
    (subj) => getSubjectSum(subj as SubjectType) === 100
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllWeightsValid) {
      alert("Validation Error: Please make sure that Written/ Oral Works, Performance/ Product tasks, and Quarterly/ Summative/ Term Exams weights sum to exactly 100% for each of the 8 subjects.");
      return;
    }

    updateGlobalSettings({
      schoolName: schoolName.toUpperCase(),
      teacherName,
      defaultPassingGrade,
      theme,
      language,
      depedPolicy,
      calendarType,
      subjects,
      depedLogoBase64,
      schoolLogoBase64
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Phase 9: Export backup as file download
  const handleBackupDownload = () => {
    try {
      const jsonStr = backupData();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
      
      const exportFileDefaultName = `srphs_grading_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      setBackupDownloaded(true);
      globalToast.success(`Database backup downloaded as "${exportFileDefaultName}".`, 'Backup Export Complete');
    } catch (err: any) {
      console.error('Backup download error:', err);
      globalToast.error('Failed to create backup: ' + (err.message || String(err)), 'Backup Export Failed');
    }
  };

  // ─── Archive Validation ────────────────────────────────────────────────────
  const validateArchive = (text: string): ArchiveValidationResult => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { valid: false, archive: null, error: 'Invalid JSON: The file could not be parsed. Please make sure it is a valid archive file.' };
    }

    const obj = parsed as Record<string, unknown>;

    if (!obj.metadata) {
      return { valid: false, archive: null, error: 'Missing metadata block. This does not appear to be a versioned SRPHS archive. It may be an older backup format.' };
    }

    const meta = obj.metadata as Record<string, unknown>;
    const required = ['archiveVersion', 'schoolYear', 'calendarType', 'createdAt', 'createdBy'];
    for (const field of required) {
      if (!meta[field]) {
        return { valid: false, archive: null, error: `Missing required metadata field: "${field}". The archive may be corrupted.` };
      }
    }

    if (meta.archiveVersion !== ARCHIVE_VERSION) {
      return {
        valid: false, archive: null,
        error: `Unsupported archive version: "${meta.archiveVersion}". This application supports version "${ARCHIVE_VERSION}" archives only.`
      };
    }

    if (!Array.isArray(obj.projects)) {
      return { valid: false, archive: null, error: 'Archive is missing the "projects" array. The file may be incomplete or corrupted.' };
    }

    return { valid: true, archive: obj as unknown as ArchiveFile, error: null };
  };

  // ─── Archive Upload Handler ───────────────────────────────────────────────
  const handleArchiveUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so re-selecting the same file still fires onChange
    e.target.value = '';
    if (!file) return;

    setArchiveError(null);
    setPendingArchive(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = validateArchive(text);
      if (!result.valid) {
        setArchiveError(result.error);
        globalToast.error(result.error || 'Invalid archive format.', 'Archive Import Error');
        return;
      }
      setPendingArchive(result.archive);
      setShowRestoreModal(true);
      if (result.archive) {
        globalToast.info(`Archive verified: S.Y. ${result.archive.metadata.schoolYear} (${result.archive.projects.length} classes). Confirm to restore.`, 'Archive Ready');
      }
    };
    reader.readAsText(file);
  };

  // ─── Confirm Restore ─────────────────────────────────────────────────────
  const handleConfirmRestore = () => {
    if (!pendingArchive) return;
    const success = restoreArchive(pendingArchive);
    if (success) {
      setRestoreSuccess(true);
      setShowRestoreModal(false);
      globalToast.success('Archive successfully restored. Refreshing workspace...', 'Archive Restored');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setArchiveError('Restore failed unexpectedly. Please try again.');
      globalToast.error('Restore failed unexpectedly. Please try again.', 'Restore Failed');
      setShowRestoreModal(false);
    }
  };

  // Phase 9: Restore database from JSON (legacy — kept for old backup files)
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const success = restoreData(text);
        setRestored(success);
        if (success) {
          globalToast.success('Database backup restored successfully. Refreshing...', 'Database Restored');
          setTimeout(() => { window.location.reload(); }, 1500);
        } else {
          globalToast.error('Failed to restore backup. Invalid JSON file format.', 'Restore Failed');
          alert('Failed to restore backup. Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const sqliteSchema = `CREATE TABLE IF NOT EXISTS global_settings (
  id TEXT PRIMARY KEY DEFAULT 'config',
  school_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  default_passing_grade INTEGER NOT NULL DEFAULT 75,
  theme TEXT CHECK(theme IN ('light', 'dark')) DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'English',
  deped_policy TEXT CHECK(deped_policy IN ('2015', '2027')) DEFAULT '2015',
  subjects_weights_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grading_projects (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_year TEXT NOT NULL,
  quarter TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  passing_grade INTEGER NOT NULL,
  deped_policy TEXT CHECK(deped_policy IN ('2015', '2027')) DEFAULT '2015',
  students_json TEXT NOT NULL,     -- Array of Student records
  assessments_json TEXT NOT NULL,  -- Array of Assessment settings
  scores_json TEXT NOT NULL,       -- Matrix of student scores
  is_archived INTEGER DEFAULT 0
);`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Title */}
      <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Manage default school information, DepEd assessment weight matrices, and local database backup tools.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config columns (Col 1 & 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* General Settings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-6">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600 animate-pulse" />
                School & Teacher Defaults
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">Default School Name</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-extrabold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">Default Teacher Name</label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">Default Passing Grade</label>
                  <input
                    type="number"
                    required
                    min={50}
                    max={100}
                    value={defaultPassingGrade}
                    onChange={(e) => setDefaultPassingGrade(parseInt(e.target.value) || 75)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">System Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    <option value="light">Light Aesthetic</option>
                    <option value="dark">Dark Aesthetic</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">System Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Filipino">Filipino (Tagalog)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">Default Transmutation Policy</label>
                  <select
                    value={depedPolicy}
                    onChange={(e) => setDepedPolicy(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    <option value="2015">0-Based Grading (0=0, 70=70, 100=100)</option>
                    <option value="2027">MATATAG Adjusted Transmutation (SY 2027-2028 onwards)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400">Academic Calendar Mode (JHS Only)</label>
                  <select
                    value={calendarType}
                    onChange={(e) => setCalendarType(e.target.value as 'Quarter' | 'Trimester')}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    <option value="Quarter">Quarter Calendar (4 Terms)</option>
                    <option value="Trimester">Trimester Calendar (3 Terms)</option>
                  </select>
                </div>
              </div>

              {/* Logo Uploads */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400 block mb-2">
                    Default School Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                      {schoolLogoBase64 ? (
                        <img src={schoolLogoBase64} alt="School Logo" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <label className="flex-1">
                      <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">
                        <Upload className="h-3.5 w-3.5" /> Upload PNG
                      </div>
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setSchoolLogoBase64(evt.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400 block mb-2">
                    Default DepEd Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                      {depedLogoBase64 ? (
                        <img src={depedLogoBase64} alt="DepEd Logo" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <label className="flex-1">
                      <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">
                        <Upload className="h-3.5 w-3.5" /> Upload PNG
                      </div>
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setDepedLogoBase64(evt.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Assessment Weights Configuration */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-emerald-600" />
                    Default DepEd Weights Matrix
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                    Define the default ratios of student assessments. Ratios must sum to 100% per subject row.
                  </p>
                </div>
                {!isAllWeightsValid && (
                  <span className="text-[9px] text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg font-mono font-bold animate-pulse border border-rose-200">
                    Sum mismatch!
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 text-[9px] font-mono text-slate-450 uppercase tracking-widest font-bold">
                      <th className="py-2.5">Subject</th>
                      <th className="py-2.5 text-center w-24">WOW (%)</th>
                      <th className="py-2.5 text-center w-24">PPT (%)</th>
                      <th className="py-2.5 text-center w-24">QSTE (%)</th>
                      <th className="py-2.5 text-center w-28">Validation Sum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {(Object.keys(subjects) as SubjectType[]).map((subj) => {
                      const wObj = getSubjectWeightObj(subj);
                      const sum = getSubjectSum(subj);
                      const isValid = sum === 100;
                      return (
                        <tr key={subj} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-colors">
                          <td className="py-3 text-xs font-black text-slate-800 dark:text-slate-200">
                            {subj}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={isNaN(wObj.wow) ? '' : Math.round(wObj.wow * 100)}
                              onChange={(e) => handleWeightChange(subj, 'wow', e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1 px-1.5 font-mono text-xs font-bold focus:outline-hidden"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={isNaN(wObj.ppt) ? '' : Math.round(wObj.ppt * 100)}
                              onChange={(e) => handleWeightChange(subj, 'ppt', e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1 px-1.5 font-mono text-xs font-bold focus:outline-hidden"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={isNaN(wObj.qste) ? '' : Math.round(wObj.qste * 100)}
                              onChange={(e) => handleWeightChange(subj, 'qste', e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1 px-1.5 font-mono text-xs font-bold focus:outline-hidden"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-md inline-block ${
                              isValid 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 animate-pulse'
                            }`}>
                              {sum}% {isValid ? 'OK' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850">
              {saved && (
                <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1.5 mr-auto">
                  <ShieldCheck className="h-4 w-4" /> Global defaults updated!
                </span>
              )}
              {!isAllWeightsValid && (
                <span className="text-[10px] text-rose-500 font-mono font-bold flex items-center gap-1.5 mr-auto animate-pulse">
                  <AlertTriangle className="h-4 w-4" /> Errors in weights matrix.
                </span>
              )}
              <button
                type="submit"
                disabled={!isAllWeightsValid}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-850 disabled:text-slate-400 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                Save System Defaults
              </button>
            </div>
          </div>

          {/* Right Column: Database Maintenance & SQLite Schema */}
          <div className="space-y-6">

            {/* Account Credentials Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Customize Portal Login
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                Configure your custom username and password to secure your local offline records.
              </p>

              {credMessage && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg text-center">
                  {credMessage}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Login Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3.5 text-xs font-bold focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3.5 text-xs font-bold focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3.5 text-xs font-bold focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCredMessage(null);
                    if (!newUsername.trim()) {
                      alert("Username cannot be empty.");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      alert("Passwords do not match.");
                      return;
                    }
                    updateCredentials(newUsername.trim(), newPassword);
                    setCredMessage("✓ Credentials updated successfully!");
                    setTimeout(() => setCredMessage(null), 3000);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-3xs mt-2"
                >
                  Update Credentials
                </button>
              </div>
            </div>
            
            {/* Phase 9: Backup and Restore Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-600" />
                Backup & Restore (Phase 9)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                Export all custom grading projects, student rosters, and records to a physical `.json` backup file.
              </p>

              <button
                type="button"
                onClick={handleBackupDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
              >
                <Download className="h-4 w-4" /> Export Backup File
              </button>

              {/* Archive Restore Section */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  Restore a previous academic year from an archive file:
                </p>

                {archiveError && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 font-bold leading-normal">{archiveError}</p>
                  </div>
                )}

                {restoreSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">Restore successful! Reloading portal...</p>
                  </div>
                )}

                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-black rounded-xl transition-colors cursor-pointer border border-dashed border-emerald-200 dark:border-emerald-900/60">
                  <FileUp className="h-4 w-4" />
                  <span>Select Archive File (.json)</span>
                  <input type="file" accept=".json" onChange={handleArchiveUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Academic Year Rollover Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Archive className="h-5 w-5 text-indigo-500" />
                Academic Year Rollover
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                Officially close the current academic year. Generates an archive, then resets all active data to prepare for the new year.
              </p>
              
              <button
                type="button"
                onClick={() => setShowRolloverModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-xl transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-900/50"
              >
                Initiate Year Rollover
              </button>
            </div>

            {/* Database Purge/Reset Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-500" />
                Reset System DB
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                Purges all active projects, student profiles, and grade sheets from local storage, reloading seed data.
              </p>

              <div className="bg-rose-50 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold leading-normal uppercase">
                  ⚡ Warning: This action cannot be undone. All custom records will be deleted.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to completely wipe the local storage? All projects, students, and recorded scores will be lost!")) {
                    resetDatabase();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                Reset Offline Storage
              </button>
            </div>

            {/* SQLite Schema Blueprints Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FileCode className="h-5 w-5 text-emerald-600" />
                SQLite3 DDL Schema
              </h3>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                <pre className="text-[8px] font-mono text-slate-350 leading-normal max-h-[150px] overflow-y-auto whitespace-pre-wrap select-all">
                  {sqliteSchema}
                </pre>
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* Rollover Modal */}
      {showRolloverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Archive className="h-4 w-4 text-indigo-500" />
                Academic Year Rollover
              </h3>
              <button onClick={() => {
                setShowRolloverModal(false);
                setBackupDownloaded(false);
              }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {rolloverError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-100">
                  {rolloverError}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  Step 1: Download backup archive of current academic year before proceeding.
                </div>
                <button
                  type="button"
                  onClick={handleBackupDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-lg transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Download className="h-4 w-4" /> Download Backup Archive
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  New Academic Year (e.g. 2026-2027)
                </label>
                <input
                  type="text"
                  placeholder="YYYY-YYYY"
                  value={rolloverYear}
                  onChange={(e) => {
                    setRolloverYear(e.target.value);
                    setRolloverError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm font-bold focus:outline-hidden"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Calendar Type
                </label>
                <select
                  value={rolloverCalendar}
                  onChange={(e) => setRolloverCalendar(e.target.value as 'Quarter' | 'Trimester')}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm font-bold focus:outline-hidden"
                >
                  <option value="Quarter">Quarter</option>
                  <option value="Trimester">Trimester</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRolloverModal(false);
                  setBackupDownloaded(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!backupDownloaded}
                onClick={() => {
                  if (!backupDownloaded) return;
                  if (!/^\d{4}-\d{4}$/.test(rolloverYear)) {
                    setRolloverError('Invalid format. Please use YYYY-YYYY format (e.g. 2026-2027).');
                    return;
                  }
                  if (confirm('Are you sure you want to execute rollover? All current data will be wiped.')) {
                    const success = rolloverAcademicYear(rolloverYear, rolloverCalendar);
                    if (success) {
                      window.location.reload();
                    } else {
                      setRolloverError('Rollover failed. Please try again.');
                    }
                  }
                }}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-colors shadow-sm ${backupDownloaded ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed'}`}
              >
                Confirm and Rollover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Restore Preview Modal */}
      {showRestoreModal && pendingArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Archive className="h-4 w-4 text-emerald-500" />
                Restore Archive — Preview
              </h3>
              <button
                onClick={() => { setShowRestoreModal(false); setPendingArchive(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Table */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                The following academic year archive will be restored. Review the details carefully before confirming.
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      { label: 'Academic Year', value: pendingArchive.metadata.schoolYear },
                      { label: 'Calendar Type', value: pendingArchive.metadata.calendarType },
                      { label: 'Created By', value: pendingArchive.metadata.createdBy },
                      { label: 'Export Date', value: new Date(pendingArchive.metadata.createdAt).toLocaleString() },
                      { label: 'Archive Version', value: `v${pendingArchive.metadata.archiveVersion}` },
                      { label: 'Projects', value: String(pendingArchive.metadata.totalProjects) },
                      { label: 'Students (total)', value: String(pendingArchive.metadata.totalStudents) },
                      { label: 'Adviser Classes', value: String(pendingArchive.metadata.totalAdviserClasses) },
                    ].map(({ label, value }, i) => (
                      <tr key={label} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-950'}>
                        <td className="py-2 px-4 font-bold text-slate-500 dark:text-slate-400 w-40">{label}</td>
                        <td className="py-2 px-4 font-black text-slate-800 dark:text-slate-200 font-mono">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Danger Warning */}
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold leading-normal">
                  <span className="uppercase tracking-wide">Warning:</span> This will permanently replace all current academic year data — projects, students, assessments, scores, adviser classes, and settings. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowRestoreModal(false); setPendingArchive(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Restore Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
