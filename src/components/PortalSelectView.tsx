import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Users,
  Activity,
  Layers,
  Calendar,
  LogOut,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Database,
  HardDrive,
  Settings,
  Info
} from 'lucide-react';
import { runDataIntegrityCheck } from '../utils/dataIntegrity';
import DataIntegrityModal from './DataIntegrityModal';

export default function PortalSelectView() {
  const {
    globalSettings,
    projects,
    adviserClasses,
    setActiveRoute,
    setWorkspaceMode,
    workspaceMode,
    authUsername,
    logout
  } = useApp();

  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [showGradingHubModal, setShowGradingHubModal] = useState(false);

  // Quick live integrity status
  const integrityResult = React.useMemo(() => {
    return runDataIntegrityCheck(projects, adviserClasses);
  }, [projects, adviserClasses]);

  // Total student counts across projects and adviser classes
  const totalStudentsInProjects = projects.reduce((acc, p) => acc + (p.students?.length || 0), 0);
  const totalAdviserStudents = adviserClasses.reduce((acc, c) => acc + (c.students?.length || 0), 0);

  const jhsProjectsCount = projects.filter(p => p.workspace !== 'SHS').length;
  const shsProjectsCount = projects.filter(p => p.workspace === 'SHS').length;

  // ── Storage Usage Monitor Breakdown ──
  const storageStats = React.useMemo(() => {
    const getByteLength = (str: string | null) => (str ? new Blob([str]).size : 0);

    const projectsRaw = localStorage.getItem('srphs_projects_p2');
    const adviserRaw = localStorage.getItem('srphs_adviser_classes');
    const settingsRaw = localStorage.getItem('srphs_settings_p2');

    // Tally all localStorage items
    let allBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          allBytes += getByteLength(key) + getByteLength(val);
        }
      }
    } catch {
      allBytes = 0;
    }

    const projectsBytes = getByteLength(projectsRaw);
    const adviserBytes = getByteLength(adviserRaw);
    const settingsBytes = getByteLength(settingsRaw);
    const otherBytes = Math.max(0, allBytes - (projectsBytes + adviserBytes + settingsBytes));

    // Standard localStorage quota is ~5 MB (5 * 1024 * 1024 bytes)
    const quotaBytes = 5 * 1024 * 1024;
    const usagePercent = Math.min(100, Math.round((allBytes / quotaBytes) * 1000) / 10);

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const statusLevel: 'healthy' | 'moderate' | 'warning' =
      usagePercent > 80 ? 'warning' : usagePercent > 50 ? 'moderate' : 'healthy';

    return {
      totalBytes: allBytes,
      quotaBytes,
      usagePercent,
      formattedTotal: formatBytes(allBytes),
      formattedQuota: formatBytes(quotaBytes),
      projectsBytes,
      formattedProjects: formatBytes(projectsBytes),
      adviserBytes,
      formattedAdviser: formatBytes(adviserBytes),
      settingsBytes,
      formattedSettings: formatBytes(settingsBytes),
      otherBytes,
      formattedOther: formatBytes(otherBytes),
      statusLevel
    };
  }, [projects, adviserClasses, globalSettings]);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden font-sans">

      {/* Background Ambient Glows & Geometric Design */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[550px] h-[550px] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {globalSettings.schoolLogoBase64 ? (
            <img
              src={globalSettings.schoolLogoBase64}
              alt="School Logo"
              className="w-10 h-10 object-contain rounded-2xl bg-white/5 border border-slate-700/60 p-1 shadow-lg shadow-emerald-900/30"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-900/30">
              SR
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white">SRPHS GRADE APP</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Enterprise Offline
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400">{globalSettings.schoolName}</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Data Integrity Monitor Badge */}
          <button
            onClick={() => setShowIntegrityModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${integrityResult.criticalCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : integrityResult.warningCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-slate-800/60 border-slate-700/80 text-emerald-400 hover:bg-slate-800'
              }`}
            title="Inspect Data Health & Integrity Status"
          >
            {integrityResult.criticalCount > 0 ? (
              <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
            ) : integrityResult.warningCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            )}
            <span>
              {integrityResult.criticalCount > 0
                ? `${integrityResult.criticalCount} Corruption Issues`
                : integrityResult.warningCount > 0
                  ? `${integrityResult.warningCount} Warnings`
                  : 'Data Healthy'}
            </span>
          </button>

          {/* System Settings & Manual Quick Links */}
          <button
            id="portal-header-btn-settings"
            onClick={() => setActiveRoute('settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            title="Open System Settings"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">System Settings</span>
          </button>

          <button
            id="portal-header-btn-about"
            onClick={() => setActiveRoute('about')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            title="Open System Manual"
          >
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden md:inline">System Manual</span>
          </button>

          {/* User Profile & Logout */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
            <span>Signed in as <strong className="text-slate-200 capitalize">{authUsername}</strong></span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-10 md:py-14 flex flex-col justify-center">

        {/* Welcome Section */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300 shadow-inner">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>{formattedDate}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">SY {globalSettings.activeSchoolYear || '2026-2027'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Select Your Portal
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Welcome to the SRPHSI Unified Grading System. Choose your workspace destination to manage class records or adviser consolidations.
          </p>
        </div>

        {/* The Two Distinct Major Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* CARD 1: GRADING HUB */}
          <div
            onClick={() => setShowGradingHubModal(true)}
            className="group relative bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-750 hover:border-emerald-500/60 rounded-3xl p-8 sm:p-10 shadow-2xl hover:shadow-emerald-950/40 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top Card Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-inner">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Subject Teachers
                  </span>
                  <div className="text-xs text-slate-400 font-bold mt-1.5">
                    {projects.length} Active {projects.length === 1 ? 'Class' : 'Classes'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                  Grading Hub
                  <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-400" />
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-normal">
                  Create and manage subject classes for Junior and Senior High School. Input written works, performance tasks, quarterly exams, compute transmuted grades, and export official DepEd e-class records.
                </p>
              </div>

              {/* Feature Highlights Pills */}
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  Junior High (Grades 7–10)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  Senior High (Grades 11–12)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  DepEd Transmutation (2015 & 2027)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  Mastery Reassessment
                </span>
              </div>
            </div>

            {/* Action Bar Bottom */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <strong className="text-white font-extrabold">{totalStudentsInProjects}</strong> enrolled students
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGradingHubModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <span>Select Curriculum</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* CARD 2: ADVISER PORTAL */}
          <div
            onClick={() => setActiveRoute('adviser')}
            className="group relative bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-750 hover:border-amber-500/60 rounded-3xl p-8 sm:p-10 shadow-2xl hover:shadow-amber-950/40 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden"
          >
            {/* Top Card Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300 shadow-inner">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Class Advisers
                  </span>
                  <div className="text-xs text-slate-400 font-bold mt-1.5">
                    {adviserClasses.length} Advisory {adviserClasses.length === 1 ? 'Section' : 'Sections'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                  Adviser Portal
                  <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-amber-400" />
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-normal">
                  Consolidate grades across all subject teachers into the official matrix. Generate School Form 9 (Report Card), rank honors candidates, track attendance, and manage learner values.
                </p>
              </div>

              {/* Feature Highlights Pills */}
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  SF9 Report Cards (DepEd Format)
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  Academic Honors & Rankings
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
                  Direct Grade Entry & Overrides
                </span>
              </div>
            </div>

            {/* Action Bar Bottom */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <strong className="text-white font-extrabold">{totalAdviserStudents}</strong> advisees tracked
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-950/50 cursor-pointer">
                <span>Open Adviser Portal</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* System Administration & Documentation Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: System Settings */}
          <div
            id="portal-card-settings"
            onClick={() => setActiveRoute('settings')}
            className="group relative bg-gradient-to-br from-slate-850 to-slate-900 hover:from-slate-800 hover:to-slate-850 border border-slate-750 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg hover:shadow-emerald-950/20 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200 shrink-0 shadow-inner">
                <Settings className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                    System Settings
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Configuration
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  School defaults, DepEd assessment weight matrices, credentials, and local database backup.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0 pl-3">
              <span className="hidden sm:inline">Configure</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card: System Manual */}
          <div
            id="portal-card-about"
            onClick={() => setActiveRoute('about')}
            className="group relative bg-gradient-to-br from-slate-850 to-slate-900 hover:from-slate-800 hover:to-slate-850 border border-slate-750 hover:border-sky-500/50 rounded-2xl p-5 shadow-lg hover:shadow-sky-950/20 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white transition-all duration-200 shrink-0 shadow-inner">
                <Info className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                    System Manual
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Reference
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Desktop blueprint, DepEd grading policy guide, formula documentation, and system instructions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-sky-400 transition-colors shrink-0 pl-3">
              <span className="hidden sm:inline">Read Guide</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Storage Usage Meter (Option A) & Continuous Integrity Protection */}
        <div className="mt-10 p-5 rounded-3xl bg-slate-850/80 border border-slate-750 shadow-xl space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Offline Database Storage Monitor
                  </h4>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      storageStats.statusLevel === 'warning'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : storageStats.statusLevel === 'moderate'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {storageStats.statusLevel === 'warning'
                      ? 'Storage High'
                      : storageStats.statusLevel === 'moderate'
                      ? 'Storage Moderate'
                      : 'Storage Healthy'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Browser LocalStorage allocated space and category allocation
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-xs font-black text-white font-mono">
                  {storageStats.formattedTotal}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">/ {storageStats.formattedQuota}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {storageStats.usagePercent}% capacity used
                </div>
              </div>

              <button
                onClick={() => setShowIntegrityModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer shrink-0 shadow-sm"
                title="Open Health Diagnostics"
              >
                <Activity className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Health Diagnostics</span>
              </button>
            </div>
          </div>

          {/* Segmented Progress Meter Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 flex border border-slate-750 gap-0.5">
              {/* Projects Segment (Emerald) */}
              <div
                style={{
                  width: `${Math.max(
                    storageStats.projectsBytes > 0 ? 1 : 0,
                    (storageStats.projectsBytes / storageStats.quotaBytes) * 100
                  )}%`
                }}
                className="h-full bg-emerald-500 rounded-sm transition-all duration-500"
                title={`Projects: ${storageStats.formattedProjects}`}
              />

              {/* Adviser Segment (Amber) */}
              <div
                style={{
                  width: `${Math.max(
                    storageStats.adviserBytes > 0 ? 1 : 0,
                    (storageStats.adviserBytes / storageStats.quotaBytes) * 100
                  )}%`
                }}
                className="h-full bg-amber-400 rounded-sm transition-all duration-500"
                title={`Adviser Portal: ${storageStats.formattedAdviser}`}
              />

              {/* Settings Segment (Sky) */}
              <div
                style={{
                  width: `${Math.max(
                    storageStats.settingsBytes > 0 ? 1 : 0,
                    (storageStats.settingsBytes / storageStats.quotaBytes) * 100
                  )}%`
                }}
                className="h-full bg-sky-400 rounded-sm transition-all duration-500"
                title={`Settings & Logos: ${storageStats.formattedSettings}`}
              />

              {/* Other Segment (Slate) */}
              {storageStats.otherBytes > 0 && (
                <div
                  style={{
                    width: `${Math.max(1, (storageStats.otherBytes / storageStats.quotaBytes) * 100)}%`
                  }}
                  className="h-full bg-indigo-400 rounded-sm transition-all duration-500"
                  title={`Caches / Auth: ${storageStats.formattedOther}`}
                />
              )}
            </div>

            {/* Scale Marker */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-0.5">
              <span>0 MB</span>
              <span>1.25 MB</span>
              <span>2.5 MB</span>
              <span>3.75 MB</span>
              <span>5.0 MB Limit</span>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Grading Projects</span>
                <strong className="text-slate-200 font-mono text-xs">{storageStats.formattedProjects}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Adviser Portal</span>
                <strong className="text-slate-200 font-mono text-xs">{storageStats.formattedAdviser}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Settings & Logos</span>
                <strong className="text-slate-200 font-mono text-xs">{storageStats.formattedSettings}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">System Cache / Auth</span>
                <strong className="text-slate-200 font-mono text-xs">{storageStats.formattedOther}</strong>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/60 bg-slate-950/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <div>SRPHS Grading & Adviser System • V2.0 Enterprise Offline Edition</div>
        <div className="flex items-center gap-4">
          <span>DepEd MATATAG Ready</span>
          <span>•</span>
          <span>Zero Cloud Footprint</span>
        </div>
      </footer>

      {/* Data Health & Integrity Modal */}
      <DataIntegrityModal
        isOpen={showIntegrityModal}
        onClose={() => setShowIntegrityModal(false)}
      />

      {/* ── Curriculum Selection Modal (JHS vs SHS) ── */}
      {showGradingHubModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 cursor-pointer"
            onClick={() => setShowGradingHubModal(false)}
          />

          <div className="relative bg-slate-900 border border-slate-750 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-7 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white leading-tight">
                    Select Curriculum Workspace
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Choose which grading level to enter
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGradingHubModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: The Two Options */}
            <div className="p-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* JHS Selection Card */}
                <div
                  onClick={() => {
                    setWorkspaceMode('JHS');
                    setShowGradingHubModal(false);
                    setActiveRoute('dashboard');
                  }}
                  className={`group relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-5 text-left overflow-hidden ${
                    workspaceMode === 'JHS'
                      ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-950/30'
                      : 'bg-slate-850/80 hover:bg-slate-800/90 border-slate-750 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-emerald-400 border border-emerald-500/30">
                      {jhsProjectsCount} {jhsProjectsCount === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                      Junior High School
                      <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">
                      Grades 7 to 10. Standard DepEd 2015 & MATATAG 2027 transmutation rules, WOW, PPT, and QSTE weight profiles.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>Enter JHS Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                {/* SHS Selection Card */}
                <div
                  onClick={() => {
                    setWorkspaceMode('SHS');
                    setShowGradingHubModal(false);
                    setActiveRoute('dashboard');
                  }}
                  className={`group relative p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-5 text-left overflow-hidden ${
                    workspaceMode === 'SHS'
                      ? 'bg-gradient-to-b from-teal-950/40 to-slate-900 border-teal-500/60 shadow-xl shadow-teal-950/30'
                      : 'bg-slate-850/80 hover:bg-slate-800/90 border-slate-750 hover:border-teal-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                      <Layers className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-teal-400 border border-teal-500/30">
                      {shsProjectsCount} {shsProjectsCount === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-black text-white group-hover:text-teal-300 transition-colors flex items-center justify-between">
                      Senior High School
                      <ChevronRight className="h-4 w-4 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">
                      Grades 11 & 12. DepEd Profiles 1–6 (Core, Immersion, TVL, Academic), Semestral and Whole Year configurations.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-teal-400 font-bold">
                    <span>Enter SHS Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-7 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Your selection will load only that curriculum in the workspace.</span>
              <button
                onClick={() => setShowGradingHubModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
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
