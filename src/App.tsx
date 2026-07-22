import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ClassManagerView from './components/ClassManagerView';
import SettingsView from './components/SettingsView';
import AboutView from './components/AboutView';
import LoginView from './components/LoginView';
import { X } from 'lucide-react';

function AppContent() {
  const { activeRoute, setActiveRoute, activeProjectId, isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return <LoginView />;
  }

  // If the active route is 'class-manager', we keep rendering the dashboard
  // in the background, so the user sees it through the backdrop of our modal overlay.
  const backgroundRoute = activeRoute === 'class-manager' ? 'dashboard' : activeRoute;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 print:block print:h-auto print:min-h-0 print:bg-white print:text-black">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <main id="main-content" className="flex-1 min-h-screen p-8 lg:p-12 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
        <div className="max-w-7xl mx-auto space-y-8 print:max-w-full print:space-y-4 print:p-0 print:m-0">
          {backgroundRoute === 'dashboard' && <DashboardView />}
          {backgroundRoute === 'settings' && <SettingsView />}
          {backgroundRoute === 'about' && <AboutView />}
        </div>
      </main>

      {/* Gradebook Workspace Modal (Phase 6 Overlay) */}
      {activeRoute === 'class-manager' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 md:p-8 animate-fade-in">
          {/* Blur backdrop overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setActiveRoute('dashboard')}
          />

          {/* Large desktop modal window that covers almost the whole screen */}
          <div className="relative w-full h-full max-h-[96vh] max-w-[98%] xl:max-w-7xl bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-white dark:bg-slate-900 px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-sans font-black px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                  WORKSPACE GRID
                </span>
                <span className="text-slate-200 dark:text-slate-850">|</span>
                <span className="text-[10px] text-slate-450 dark:text-slate-550 font-sans font-bold uppercase tracking-wider">
                  Project ID: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">{activeProjectId}</span>
                </span>
              </div>

              <button
                onClick={() => setActiveRoute('dashboard')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition-all cursor-pointer border border-slate-200/40 dark:border-slate-700/60 shadow-3xs"
              >
                <X className="h-4 w-4" /> Close Gradebook
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-7xl mx-auto">
                <ClassManagerView />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
