import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubjectType } from '../types';
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
  Languages
} from 'lucide-react';

export default function SettingsView() {
  const { 
    globalSettings, 
    updateGlobalSettings, 
    resetDatabase,
    backupData,
    restoreData,
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
  const [subjects, setSubjects] = useState(globalSettings.subjects);

  const [saved, setSaved] = useState(false);
  const [restored, setRestored] = useState<boolean | null>(null);

  // New states for custom credentials
  const [newUsername, setNewUsername] = useState(authUsername);
  const [newPassword, setNewPassword] = useState(authPassword);
  const [confirmPassword, setConfirmPassword] = useState(authPassword);
  const [credMessage, setCredMessage] = useState<string | null>(null);

  const handleWeightChange = (subj: SubjectType, component: 'ww' | 'pt' | 'qa', value: string) => {
    const rawVal = parseInt(value) || 0;
    const numVal = Math.max(0, Math.min(100, rawVal)) / 100;
    setSubjects(prev => ({
      ...prev,
      [subj]: {
        ...prev[subj],
        [component]: numVal
      }
    }));
  };

  const getSubjectSum = (subj: SubjectType) => {
    const w = subjects[subj];
    return Math.round((w.ww + w.pt + w.qa) * 100);
  };

  const isAllWeightsValid = Object.keys(subjects).every(
    (subj) => getSubjectSum(subj as SubjectType) === 100
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllWeightsValid) {
      alert("Validation Error: Please make sure that Written Works, Performance Tasks, and Quarterly Exams weights sum to exactly 100% for each of the 8 subjects.");
      return;
    }

    updateGlobalSettings({
      schoolName: schoolName.toUpperCase(),
      teacherName,
      defaultPassingGrade,
      theme,
      language,
      depedPolicy,
      subjects
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Phase 9: Export backup as file download
  const handleBackupDownload = () => {
    const jsonStr = backupData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
    
    const exportFileDefaultName = `srphs_grading_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Phase 9: Restore database from JSON
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const success = restoreData(text);
        setRestored(success);
        if (success) {
          // reload form states
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          alert("Failed to restore backup. Invalid JSON file format.");
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
                      <th className="py-2.5 text-center w-24">WW (%)</th>
                      <th className="py-2.5 text-center w-24">PT (%)</th>
                      <th className="py-2.5 text-center w-24">QE (%)</th>
                      <th className="py-2.5 text-center w-28">Validation Sum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {(Object.keys(subjects) as SubjectType[]).map((subj) => {
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
                              value={Math.round(subjects[subj].ww * 100)}
                              onChange={(e) => handleWeightChange(subj, 'ww', e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1 px-1.5 font-mono text-xs font-bold focus:outline-hidden"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={Math.round(subjects[subj].pt * 100)}
                              onChange={(e) => handleWeightChange(subj, 'pt', e.target.value)}
                              className="w-16 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-lg py-1 px-1.5 font-mono text-xs font-bold focus:outline-hidden"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={Math.round(subjects[subj].qa * 100)}
                              onChange={(e) => handleWeightChange(subj, 'qa', e.target.value)}
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

              <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  Restore from a previous backup file:
                </p>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-black rounded-xl transition-colors cursor-pointer border border-dashed border-emerald-200 dark:border-emerald-900/60">
                  <FileUp className="h-4 w-4" />
                  <span>Upload JSON Backup</span>
                  <input type="file" accept=".json" onChange={handleRestoreUpload} className="hidden" />
                </label>
                {restored && (
                  <div className="text-[10px] text-emerald-600 font-mono font-bold text-center mt-1">
                    ✓ Restore successful! Reloading portal...
                  </div>
                )}
              </div>
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
    </div>
  );
}
