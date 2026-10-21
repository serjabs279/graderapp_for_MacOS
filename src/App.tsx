import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ClassManagerView from './components/ClassManagerView';
import SettingsView from './components/SettingsView';
import AboutView from './components/AboutView';
import LoginView from './components/LoginView';
import AdviserPortalView from './components/adviser/AdviserPortalView';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import BackupReminderModal from './components/BackupReminderModal';
import YearlyResetModal from './components/YearlyResetModal';
import DownloadedFileLocatorModal from './components/DownloadedFileLocatorModal';
import { backupReminder } from './utils/backupReminder';
import { X, Home, Menu } from 'lucide-react';

import PortalSelectView from './components/PortalSelectView';

function AppContent() {
  const { activeRoute, setActiveRoute, activeProjectId, isLoggedIn, yearlyResetDue } = useApp();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    backupReminder.start({
      intervalMs: 30 * 60 * 1000,
      onRemind: () => setShowBackupModal(true)
    });
    return () => backupReminder.stop();
  }, []);

  if (!isLoggedIn) {
    return <LoginView />;
  }

  // If the user is on the post-login landing screen, render the full-screen Portal Selector
  if (activeRoute === 'portal-select') {
    return (
      <>
        <PortalSelectView />
        <BackupReminderModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />
        {yearlyResetDue && <YearlyResetModal />}
        <DownloadedFileLocatorModal />
      </>
    );
  }

  // If the user is on the dedicated Adviser Portal, render Adviser Portal full-screen
  if (activeRoute === 'adviser') {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <AdviserPortalView />
        <BackupReminderModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />
        {yearlyResetDue && <YearlyResetModal />}
        <DownloadedFileLocatorModal />
      </div>
    );
  }

  // Otherwise, user is in the Teacher Grading Hub ('dashboard', 'class-manager', 'settings', 'about')
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 print:block print:h-auto print:min-h-0 print:bg-white print:text-black">
      {/* Mobile Top Navigation Bar (Shown only on small screens / mobile phones) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center text-white font-black text-[10px] shadow-xs">
              SR
            </div>
            <span className="font-black text-xs tracking-tight text-slate-900 dark:text-white">
              SRPHS GRADE APP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            {activeRoute === 'class-manager' ? 'Gradebook' : activeRoute === 'dashboard' ? 'Grading Hub' : activeRoute}
          </span>
        </div>
      </header>

      {/* Navigation Sidebar (Desktop pinned sidebar or Mobile drawer) */}
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace */}
      <main id="main-content" className="flex-1 min-h-[calc(100vh-49px)] md:min-h-screen p-3 sm:p-6 lg:p-12 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 print:max-w-full print:space-y-4 print:p-0 print:m-0">
          {activeRoute === 'dashboard' && <DashboardView />}
          {activeRoute === 'class-manager' && <ClassManagerView />}
          {activeRoute === 'settings' && <SettingsView />}
          {activeRoute === 'about' && <AboutView />}
        </div>
      </main>

      {/* AutoSave Indicator (Fixed Top-Right) */}
      <AutoSaveIndicator />

      {/* Periodic Backup Reminder Modal */}
      <BackupReminderModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />

      {/* Yearly End-of-School-Year Reset Modal */}
      {yearlyResetDue && <YearlyResetModal />}

      {/* Downloaded File Locator — auto-pops up after any JSON export */}
      <DownloadedFileLocatorModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}
