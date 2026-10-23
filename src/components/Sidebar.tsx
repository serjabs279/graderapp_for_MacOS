import React from 'react';
import { useApp } from '../context/AppContext';
import { APP_VERSION } from '../types';
import {
  LayoutDashboard,
  Sun,
  Moon,
  FolderOpen,
  GraduationCap,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps = {}) {
  const {
    activeRoute,
    setActiveRoute,
    darkMode,
    toggleDarkMode,
    globalSettings,
    projects,
    activeProjectId,
    workspaceMode,
    setWorkspaceMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    logout
  } = useApp();

  const handleNav = (route: Parameters<typeof setActiveRoute>[0]) => {
    setActiveRoute(route);
    if (onCloseMobile) onCloseMobile();
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const compact = sidebarCollapsed && !isMobileOpen;

  const menuItems = [
    { id: 'dashboard', label: 'Grading Hub', icon: LayoutDashboard }
  ] as const;

  return (
    <>
      {isMobileOpen && (
        <div onClick={onCloseMobile} className="fixed inset-0 z-40 bg-slate-950/50 md:hidden" aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        aria-label="Grading workspace sidebar"
        className={`no-print fixed inset-y-0 left-0 z-50 h-dvh w-72 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-slate-300 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:sticky md:top-0 print:hidden ${compact ? 'md:w-20' : 'md:w-64'} ${isMobileOpen ? 'flex' : 'hidden md:flex'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <header className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className={`flex gap-2 ${compact ? 'flex-col items-center' : 'items-center justify-between'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-base font-semibold text-white" aria-hidden="true">SR</div>
              {!compact && (
                <div className="min-w-0">
                  <p className="text-pretty text-sm font-semibold">SRPHS Grader</p>
                  <p className="text-pretty text-xs text-slate-500 dark:text-slate-400">Offline workspace</p>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center">
              {onCloseMobile && (
                <button type="button" onClick={onCloseMobile} className="ui-icon-button md:hidden" title="Close Menu" aria-label="Close navigation menu">
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ui-icon-button hidden md:inline-flex"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebarCollapsed}
                aria-controls="app-sidebar"
              >
                {sidebarCollapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          {!compact && <p className="mt-4 line-clamp-2 break-words text-pretty text-xs leading-relaxed text-slate-500 dark:text-slate-400" title={globalSettings.schoolName}>{globalSettings.schoolName}</p>}
        </header>

        <section className={`shrink-0 border-b border-slate-200 dark:border-slate-800 ${compact ? 'flex flex-col items-center gap-2 p-3' : 'space-y-2 p-4'}`} aria-label="Curriculum workspace">
          {!compact && <h2 className="ui-label text-balance">Curriculum workspace</h2>}
          <button
            type="button"
            onClick={() => {
              setWorkspaceMode(workspaceMode === 'JHS' ? 'JHS' : 'SHS');
              setActiveRoute('dashboard');
            }}
            className={`ui-tab ${compact ? 'size-10 p-0' : 'w-full justify-start whitespace-normal text-left'}`}
            aria-pressed="true"
            aria-label={workspaceMode === 'JHS' ? 'Junior High School workspace' : 'Senior High School workspace'}
            title={workspaceMode === 'JHS' ? 'Junior High School (JHS)' : 'Senior High School (SHS)'}
          >
            {workspaceMode === 'JHS' ? <GraduationCap className="size-4 shrink-0" aria-hidden="true" /> : <Layers className="size-4 shrink-0" aria-hidden="true" />}
            {!compact && <span>{workspaceMode === 'JHS' ? 'Junior High School' : 'Senior High School'}</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMode = workspaceMode === 'JHS' ? 'SHS' : 'JHS';
              setWorkspaceMode(nextMode);
              setActiveRoute('dashboard');
            }}
            className={compact ? 'ui-icon-button' : 'ui-tab w-full justify-start whitespace-normal text-left'}
            aria-label={`Switch to ${workspaceMode === 'JHS' ? 'Senior High School' : 'Junior High School'}`}
            title={`Switch to ${workspaceMode === 'JHS' ? 'Senior High School' : 'Junior High School'}`}
          >
            <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
            {!compact && <span>Switch to {workspaceMode === 'JHS' ? 'Senior High' : 'Junior High'}</span>}
          </button>
        </section>

        <nav className={`flex-1 space-y-2 ${compact ? 'flex flex-col items-center p-3' : 'p-4'}`} aria-label="Main navigation">
          {!compact && <h2 className="ui-label text-balance">Class records</h2>}
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`ui-tab ${compact ? 'size-10 p-0' : 'w-full justify-start'}`}
                aria-current={activeRoute === item.id ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {!compact && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {activeProject ? (
          compact ? (
            <div className="flex shrink-0 justify-center px-3 py-4">
              <div
                className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                title={`${activeProject.subject} (${activeProject.section}) · ${activeProject.gradeLevel} | ${activeProject.lastActiveQuarter}`}
              >
                <FolderOpen className="size-4" aria-hidden="true" />
                <span className="sr-only">Active class: {activeProject.subject}, {activeProject.section}, {activeProject.gradeLevel}, {activeProject.lastActiveQuarter}</span>
              </div>
            </div>
          ) : (
            <section className="mx-4 mb-4 shrink-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40" aria-label="Active class">
              <h2 className="flex items-center gap-2 text-balance text-xs font-medium text-slate-500 dark:text-slate-400">
                <FolderOpen className="size-4 shrink-0" aria-hidden="true" />
                {activeProject.workspace === 'SHS' ? 'SHS active class' : 'JHS active class'}
              </h2>
              <p className="truncate text-sm font-medium" title={`${activeProject.subject} - ${activeProject.section}`}>{activeProject.subject} - {activeProject.section}</p>
              <p className="text-pretty text-xs tabular-nums text-slate-500 dark:text-slate-400">{activeProject.gradeLevel} | {activeProject.lastActiveQuarter}</p>
            </section>
          )
        ) : !compact ? (
          <div className="mx-4 mb-4 shrink-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-pretty text-xs leading-relaxed text-slate-500 dark:text-slate-400">No class is open. Select a class from the Grading Hub to begin.</p>
            <button type="button" onClick={() => handleNav('dashboard')} className="ui-button mt-3 w-full">Choose a class</button>
          </div>
        ) : null}

        <footer className={`shrink-0 border-t border-slate-200 dark:border-slate-800 ${compact ? 'space-y-2 p-3' : 'space-y-3 p-4'}`}>
          <div className={`flex gap-2 ${compact ? 'flex-col items-center' : 'items-center justify-between'}`}>
            <button
              type="button"
              onClick={toggleDarkMode}
              className={compact ? 'ui-icon-button' : 'ui-tab justify-start'}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
              {!compact && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
            </button>
            <button type="button" onClick={logout} className="ui-icon-button" title="Log Out Securely" aria-label="Log out securely">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
          {!compact && (
            <div className="space-y-1 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p className="tabular-nums">V{APP_VERSION} Stable</p>
              <p className="text-pretty">richmondjabla | AR-Tech Solutions 2025</p>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
