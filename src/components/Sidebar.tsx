import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Flame, 
  Settings, 
  Info, 
  Sun, 
  Moon, 
  FolderOpen, 
  GraduationCap, 
  Layers, 
  Library,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
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

  const activeProject = projects.find(p => p.id === activeProjectId);

  const menuItems = [
    { id: 'dashboard', label: 'Project Hub', icon: LayoutDashboard },
    { id: 'class-manager', label: 'Gradebook Workspace', icon: Flame },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'about', label: 'System Manual', icon: Info }
  ] as const;

  return (
    <aside 
      id="app-sidebar" 
      className={`${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col border-r border-slate-200 dark:border-slate-850 shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-visible print:hidden no-print`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-100 dark:border-slate-850 flex flex-col items-center shrink-0 ${sidebarCollapsed ? 'justify-center' : 'p-6'}`}>
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
              SR
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-sans font-black tracking-tight text-xs text-slate-900 dark:text-white leading-tight">SRPHS GRADER</h1>
                <p className="text-[9px] text-slate-450 font-sans font-bold uppercase tracking-wider">Desktop Offline App</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="mt-4 text-[10px] w-full text-slate-450 dark:text-slate-500 font-sans font-extrabold uppercase tracking-wide overflow-hidden text-ellipsis whitespace-nowrap">
            {globalSettings.schoolName}
          </div>
        )}
      </div>

      {/* Gradebook Hierarchy Workspace Selector */}
      <div className={`border-b border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10 shrink-0 ${sidebarCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'px-6 py-4'}`}>
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-1.5 text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 tracking-widest uppercase mb-3">
              <Library className="h-3.5 w-3.5 text-slate-400" />
              <span>Curriculum Workspace</span>
            </div>
            
            <div className="space-y-2.5 pl-1.5 relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[11px] top-2 bottom-5 w-0.5 bg-slate-150 dark:bg-slate-800" />
              
              {/* Junior High School Item */}
              <div className="relative flex items-center pl-6">
                {/* Horizontal branch line */}
                <div className="absolute left-[12px] top-1/2 w-3 h-0.5 bg-slate-150 dark:bg-slate-800" />
                <button
                  onClick={() => {
                    setWorkspaceMode('JHS');
                    setActiveRoute('dashboard');
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    workspaceMode === 'JHS'
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-850/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <GraduationCap className={`h-3.5 w-3.5 ${workspaceMode === 'JHS' ? 'text-white' : 'text-slate-450'}`} />
                  <span>Junior High School</span>
                </button>
              </div>

              {/* Senior High School Item */}
              <div className="relative flex items-center pl-6">
                {/* L-shaped corner branch line */}
                <div className="absolute left-[12px] top-0 h-1/2 w-0.5 bg-slate-150 dark:bg-slate-800" />
                <div className="absolute left-[12px] top-1/2 w-3 h-0.5 bg-slate-150 dark:bg-slate-800" />
                <button
                  onClick={() => {
                    setWorkspaceMode('SHS');
                    setActiveRoute('dashboard');
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    workspaceMode === 'SHS'
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-850/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Layers className={`h-3.5 w-3.5 ${workspaceMode === 'SHS' ? 'text-white' : 'text-slate-450'}`} />
                  <span>Senior High School</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {/* JHS Mini Button with Hover Tooltip */}
            <div className="relative group">
              <button
                onClick={() => {
                  setWorkspaceMode('JHS');
                  setActiveRoute('dashboard');
                }}
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                  workspaceMode === 'JHS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-150 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                <GraduationCap className="h-4.5 w-4.5" />
              </button>
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-700 pointer-events-none">
                Junior High School (JHS)
              </div>
            </div>

            {/* SHS Mini Button with Hover Tooltip */}
            <div className="relative group">
              <button
                onClick={() => {
                  setWorkspaceMode('SHS');
                  setActiveRoute('dashboard');
                }}
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                  workspaceMode === 'SHS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-150 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                <Layers className="h-4.5 w-4.5" />
              </button>
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-700 pointer-events-none">
                Senior High School (SHS)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1.5 ${sidebarCollapsed ? 'p-2 flex flex-col items-center' : 'p-4'}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                id={`sidebar-link-${item.id}`}
                onClick={() => setActiveRoute(item.id)}
                className={`flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sidebarCollapsed 
                    ? `p-3 justify-center ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:text-slate-900 dark:hover:text-slate-100'}`
                    : `w-full justify-between px-3 py-2.5 ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850/40 hover:text-slate-900 dark:hover:text-slate-100'}`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.id === 'class-manager' && activeProject && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Project Loaded" />
                )}
              </button>
              
              {/* Hover tooltip when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-700 pointer-events-none">
                  {item.label}
                  {item.id === 'class-manager' && activeProject && " (Active Project Loaded)"}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Loaded Project Stats in Sidebar */}
      {activeProject ? (
        !sidebarCollapsed ? (
          <div className="m-4 p-4 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/5 space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-sans font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              <FolderOpen className="h-3.5 w-3.5" />
              {activeProject.workspace === 'SHS' ? 'SHS Active Project' : 'JHS Active Project'}
            </div>
            <div>
              <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate" title={activeProject.subject}>
                {activeProject.subject} - {activeProject.section}
              </div>
              <div className="text-[9px] font-sans text-slate-400 dark:text-slate-500">
                {activeProject.gradeLevel} | {activeProject.quarter}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group w-full flex justify-center py-2 shrink-0">
            <div className="w-9 h-9 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-650 dark:text-emerald-400 shadow-3xs animate-pulse">
              <FolderOpen className="h-4.5 w-4.5" />
            </div>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[11px] font-bold p-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 border border-slate-800 dark:border-slate-700 pointer-events-none space-y-1">
              <div className="text-[10px] font-black uppercase text-emerald-400">Project Loaded</div>
              <div className="text-xs font-extrabold">{activeProject.subject} ({activeProject.section})</div>
              <div className="text-[9px] text-slate-300">{activeProject.gradeLevel} | {activeProject.quarter}</div>
            </div>
          </div>
        )
      ) : (
        !sidebarCollapsed ? (
          <div className="m-4 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-center shrink-0">
            <span className="text-[10px] font-sans font-semibold text-slate-400 dark:text-slate-500">
              No active project open. Select one from Hub.
            </span>
          </div>
        ) : null
      )}

      {/* Footer Settings, Theme & Log Out */}
      <div className={`border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 flex shrink-0 ${sidebarCollapsed ? 'p-3 flex-col items-center gap-2.5' : 'p-4 items-center justify-between'}`}>
        {!sidebarCollapsed ? (
          <>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans font-bold">V1.0.0 Stable</span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-black">S.Y. {activeProject?.schoolYear || '2026-2027'}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
              </button>
              
              <button
                onClick={logout}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                title="Log Out Securely"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Theme Toggle Button with Tooltip */}
            <div className="relative group">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-700 pointer-events-none">
                {darkMode ? "Light Mode" : "Dark Mode"}
              </div>
            </div>

            {/* Logout Button with Tooltip */}
            <div className="relative group">
              <button
                onClick={logout}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-950 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap border border-slate-800 dark:border-slate-700 pointer-events-none">
                Log Out Securely
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
