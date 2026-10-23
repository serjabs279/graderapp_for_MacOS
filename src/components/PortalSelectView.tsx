import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { APP_VERSION } from '../types';
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Calendar,
  LogOut,
  ChevronRight,
  AlertTriangle,
  X,
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

  const openCurriculumDialog = React.useCallback((dialog: HTMLDialogElement | null) => {
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-300 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {globalSettings.schoolLogoBase64 ? (
              <img src={globalSettings.schoolLogoBase64} alt="School logo" className="size-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 dark:border-slate-700" />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-base font-semibold text-white" aria-hidden="true">SR</div>
            )}
            <div className="min-w-0">
              <p className="text-pretty text-sm font-semibold">SRPHS Grading System</p>
              <p className="break-words text-pretty text-xs text-slate-500 dark:text-slate-400">{globalSettings.schoolName}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 break-all text-pretty text-xs text-slate-500 dark:text-slate-400">
              Signed in as <span className="font-medium text-slate-700 dark:text-slate-200">{authUsername}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                id="portal-header-btn-settings"
                type="button"
                onClick={() => setActiveRoute('settings')}
                className="ui-icon-button"
                title="Open System Settings"
                aria-label="Open System Settings"
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>
              <button
                id="portal-header-btn-about"
                type="button"
                onClick={() => setActiveRoute('about')}
                className="ui-icon-button"
                title="Open System Manual"
                aria-label="Open System Manual"
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={logout} className="ui-icon-button" title="Log Out" aria-label="Log out">
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="ui-page mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 md:py-10">
        <section aria-labelledby="portal-heading">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 tabular-nums">
              <Calendar className="size-4 shrink-0" aria-hidden="true" />
              {formattedDate}
            </span>
            <span className="ui-badge tabular-nums">SY {globalSettings.activeSchoolYear || '2026-2027'}</span>
          </div>
          <h1 id="portal-heading" className="ui-heading text-balance">Choose your workspace</h1>
          <p className="ui-description">Welcome to the SRPHSI Unified Grading System. Manage subject class records or bring your advisory class grades together.</p>
        </section>

        <section className="grid min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2" aria-label="Workspaces">
          <article className="ui-panel flex min-w-0 flex-col p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <BookOpen className="size-7 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span className="ui-badge">Subject teachers</span>
            </div>
            <h2 className="text-balance text-xl font-semibold">Grading Hub</h2>
            <p className="ui-description">Manage Junior and Senior High School subject classes. Record assessments, compute transmuted grades, and export official DepEd e-class records.</p>
            <ul className="mt-4 space-y-2 text-pretty text-sm text-slate-600 dark:text-slate-400">
              <li>Junior High (Grades 7–10) and Senior High (Grades 11–12)</li>
              <li>Written works, performance tasks, and quarterly exams</li>
              <li>DepEd transmutation (2015 & 2027) and mastery reassessment</li>
            </ul>
            <div className="mt-auto pt-6">
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span><strong className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{projects.length}</strong> active {projects.length === 1 ? 'class' : 'classes'}</span>
                <span><strong className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{totalStudentsInProjects}</strong> enrolled students</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGradingHubModal(true);
                }}
                className="ui-button-primary w-full sm:w-auto"
                aria-haspopup="dialog"
              >
                Select Curriculum <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </article>

          <article className="ui-panel flex min-w-0 flex-col p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <GraduationCap className="size-7 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span className="ui-badge">Class advisers</span>
            </div>
            <h2 className="text-balance text-xl font-semibold">Adviser Portal</h2>
            <p className="ui-description">Consolidate grades across subject teachers into the official matrix. Keep report cards, attendance, and learner values in one place.</p>
            <ul className="mt-4 space-y-2 text-pretty text-sm text-slate-600 dark:text-slate-400">
              <li>School Form 9 report cards in DepEd format</li>
              <li>Academic honors and rankings</li>
              <li>Direct grade entry and overrides</li>
            </ul>
            <div className="mt-auto pt-6">
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span><strong className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{adviserClasses.length}</strong> advisory {adviserClasses.length === 1 ? 'section' : 'sections'}</span>
                <span><strong className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{totalAdviserStudents}</strong> advisees tracked</span>
              </div>
              <button type="button" onClick={() => setActiveRoute('adviser')} className="ui-button-primary w-full sm:w-auto">
                Open Adviser Portal <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </article>
        </section>

        <section className="space-y-4" aria-labelledby="portal-utilities-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="portal-utilities-heading" className="ui-section-title text-balance">Tools & system health</h2>
            <button
              type="button"
              onClick={() => setShowIntegrityModal(true)}
              className="ui-button tabular-nums"
              title="Inspect Data Health & Integrity Status"
              aria-haspopup="dialog"
            >
              {integrityResult.criticalCount > 0 ? (
                <ShieldAlert className="size-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
              ) : integrityResult.warningCount > 0 ? (
                <AlertTriangle className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              )}
              <span>{integrityResult.criticalCount > 0 ? `${integrityResult.criticalCount} Corruption Issues` : integrityResult.warningCount > 0 ? `${integrityResult.warningCount} Warnings` : 'Data Healthy'}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              id="portal-card-settings"
              type="button"
              onClick={() => setActiveRoute('settings')}
              className="ui-button min-w-0 justify-start gap-3 p-4 text-left"
            >
              <Settings className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-balance font-medium">System Settings</span>
                <span className="mt-1 block text-pretty text-xs font-normal leading-relaxed text-slate-500 dark:text-slate-400">School defaults, assessment weights, credentials, and local database backup.</span>
              </span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </button>
            <button
              id="portal-card-about"
              type="button"
              onClick={() => setActiveRoute('about')}
              className="ui-button min-w-0 justify-start gap-3 p-4 text-left"
            >
              <Info className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-balance font-medium">System Manual</span>
                <span className="mt-1 block text-pretty text-xs font-normal leading-relaxed text-slate-500 dark:text-slate-400">Desktop guide, DepEd grading policies, formulas, and system instructions.</span>
              </span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </button>
          </div>

          <section className="ui-panel space-y-4 p-4 sm:p-5" aria-labelledby="portal-storage-heading">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <HardDrive className="mt-0.5 size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="portal-storage-heading" className="text-balance text-sm font-semibold">Offline database storage</h3>
                    <span className="ui-badge">
                      {storageStats.statusLevel !== 'healthy' && <AlertTriangle className="size-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
                      {storageStats.statusLevel === 'warning' ? 'Storage High' : storageStats.statusLevel === 'moderate' ? 'Storage Moderate' : 'Storage Healthy'}
                    </span>
                  </div>
                  <p className="mt-1 text-pretty text-xs text-slate-500 dark:text-slate-400">Browser LocalStorage usage by category. Estimated capacity: {storageStats.formattedQuota}.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowIntegrityModal(true)} className="ui-button shrink-0 self-start" title="Open Health Diagnostics" aria-haspopup="dialog">
                <Activity className="size-4" aria-hidden="true" /> Health Diagnostics
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                <span><strong className="font-medium text-slate-900 dark:text-slate-100">{storageStats.formattedTotal}</strong> / {storageStats.formattedQuota}</span>
                <span>{storageStats.usagePercent}% capacity used</span>
              </div>
              <div
                role="meter"
                aria-label="Local storage capacity used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={storageStats.usagePercent}
                aria-valuetext={`${storageStats.formattedTotal} of approximately ${storageStats.formattedQuota}; ${storageStats.usagePercent}% used`}
                className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  style={{ width: `${Math.max(storageStats.projectsBytes > 0 ? 1 : 0, (storageStats.projectsBytes / storageStats.quotaBytes) * 100)}%` }}
                  className="h-full rounded-sm bg-emerald-700 dark:bg-emerald-500"
                  title={`Projects: ${storageStats.formattedProjects}`}
                />
                <div
                  style={{ width: `${Math.max(storageStats.adviserBytes > 0 ? 1 : 0, (storageStats.adviserBytes / storageStats.quotaBytes) * 100)}%` }}
                  className="h-full rounded-sm bg-slate-600 dark:bg-slate-300"
                  title={`Adviser Portal: ${storageStats.formattedAdviser}`}
                />
                <div
                  style={{ width: `${Math.max(storageStats.settingsBytes > 0 ? 1 : 0, (storageStats.settingsBytes / storageStats.quotaBytes) * 100)}%` }}
                  className="h-full rounded-sm bg-slate-400 dark:bg-slate-500"
                  title={`Settings & Logos: ${storageStats.formattedSettings}`}
                />
                {storageStats.otherBytes > 0 && (
                  <div
                    style={{ width: `${Math.max(1, (storageStats.otherBytes / storageStats.quotaBytes) * 100)}%` }}
                    className="h-full rounded-sm bg-slate-300 dark:bg-slate-600"
                    title={`Caches / Auth: ${storageStats.formattedOther}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs tabular-nums text-slate-500 dark:text-slate-400">
                <span>0 MB</span>
                <span className="hidden sm:inline">1.25 MB</span>
                <span>2.5 MB</span>
                <span className="hidden sm:inline">3.75 MB</span>
                <span>5.0 MB limit</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-4">
              <div className="min-w-0">
                <dt className="flex items-start gap-2 text-pretty text-xs text-slate-500 dark:text-slate-400"><span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-700 dark:bg-emerald-500" />Grading projects</dt>
                <dd className="mt-1 pl-4 text-sm font-medium tabular-nums">{storageStats.formattedProjects}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-start gap-2 text-pretty text-xs text-slate-500 dark:text-slate-400"><span className="mt-1 size-2 shrink-0 rounded-full bg-slate-600 dark:bg-slate-300" />Adviser Portal</dt>
                <dd className="mt-1 pl-4 text-sm font-medium tabular-nums">{storageStats.formattedAdviser}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-start gap-2 text-pretty text-xs text-slate-500 dark:text-slate-400"><span className="mt-1 size-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />Settings & logos</dt>
                <dd className="mt-1 pl-4 text-sm font-medium tabular-nums">{storageStats.formattedSettings}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-start gap-2 text-pretty text-xs text-slate-500 dark:text-slate-400"><span className="mt-1 size-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />System cache / auth</dt>
                <dd className="mt-1 pl-4 text-sm font-medium tabular-nums">{storageStats.formattedOther}</dd>
              </div>
            </dl>
          </section>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-4 text-pretty text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row sm:flex-wrap">
          <p>SRPHS Grading & Adviser System · <span className="tabular-nums">V{APP_VERSION}</span> Enterprise Offline Edition</p>
          <p>DepEd MATATAG Ready · Zero Cloud Footprint</p>
        </div>
      </footer>

      <DataIntegrityModal isOpen={showIntegrityModal} onClose={() => setShowIntegrityModal(false)} />

      {showGradingHubModal && (
        <dialog
          ref={openCurriculumDialog}
          aria-labelledby="curriculum-dialog-title"
          aria-describedby="curriculum-dialog-description"
          onCancel={() => setShowGradingHubModal(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGradingHubModal(false);
          }}
          className="ui-dialog-overlay m-0 h-dvh max-h-none w-full max-w-none border-0 text-slate-900 backdrop:bg-transparent dark:text-slate-100"
        >
          <div className="ui-dialog max-w-2xl">
            <div className="ui-dialog-header">
              <div className="min-w-0">
                <h2 id="curriculum-dialog-title" className="ui-section-title text-balance">Select Curriculum Workspace</h2>
                <p id="curriculum-dialog-description" className="mt-1 text-pretty text-sm text-slate-600 dark:text-slate-400">Choose the grading level you want to manage.</p>
              </div>
              <button type="button" onClick={() => setShowGradingHubModal(false)} className="ui-icon-button" title="Close" aria-label="Close curriculum selection">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="ui-dialog-body">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode('JHS');
                    setShowGradingHubModal(false);
                    setActiveRoute('dashboard');
                  }}
                  aria-pressed={workspaceMode === 'JHS'}
                  className="ui-button flex min-w-0 flex-col items-stretch justify-between gap-4 p-4 text-left aria-pressed:border-emerald-700 aria-pressed:bg-emerald-50 dark:aria-pressed:border-emerald-500 dark:aria-pressed:bg-emerald-950/30"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <GraduationCap className="size-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span className="ui-badge tabular-nums">{jhsProjectsCount} {jhsProjectsCount === 1 ? 'class' : 'classes'}</span>
                  </span>
                  <span className="block">
                    <span className="block text-balance text-base font-semibold">Junior High School</span>
                    <span className="mt-2 block text-pretty text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-400">Grades 7 to 10. DepEd 2015 & MATATAG 2027 transmutation, with WOW, PPT, and QSTE weight profiles.</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm text-emerald-800 dark:border-slate-700 dark:text-emerald-300">
                    Enter JHS Workspace <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode('SHS');
                    setShowGradingHubModal(false);
                    setActiveRoute('dashboard');
                  }}
                  aria-pressed={workspaceMode === 'SHS'}
                  className="ui-button flex min-w-0 flex-col items-stretch justify-between gap-4 p-4 text-left aria-pressed:border-emerald-700 aria-pressed:bg-emerald-50 dark:aria-pressed:border-emerald-500 dark:aria-pressed:bg-emerald-950/30"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <Layers className="size-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span className="ui-badge tabular-nums">{shsProjectsCount} {shsProjectsCount === 1 ? 'class' : 'classes'}</span>
                  </span>
                  <span className="block">
                    <span className="block text-balance text-base font-semibold">Senior High School</span>
                    <span className="mt-2 block text-pretty text-sm font-normal leading-relaxed text-slate-600 dark:text-slate-400">Grades 11 & 12. DepEd Profiles 1–6 for Core, Immersion, TVL, and Academic subjects. Semestral and whole-year options.</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm text-emerald-800 dark:border-slate-700 dark:text-emerald-300">
                    Enter SHS Workspace <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </span>
                </button>
              </div>
            </div>

            <div className="ui-dialog-footer">
              <p className="min-w-0 flex-1 text-pretty text-xs text-slate-500 dark:text-slate-400">Only the selected curriculum will load in the workspace.</p>
              <button type="button" onClick={() => setShowGradingHubModal(false)} className="ui-button">Cancel</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
