import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import BackupReminderModal from './components/BackupReminderModal';
import YearlyResetModal from './components/YearlyResetModal';
import DownloadedFileLocatorModal from './components/DownloadedFileLocatorModal';
import { backupReminder } from './utils/backupReminder';
import { Menu } from 'lucide-react';

const DashboardView = lazy(() => import('./components/DashboardView'));
const ClassManagerView = lazy(() => import('./components/ClassManagerView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AboutView = lazy(() => import('./components/AboutView'));
const AdviserPortalView = lazy(() => import('./components/adviser/AdviserPortalView'));
const PortalSelectView = lazy(() => import('./components/PortalSelectView'));

function RouteFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className="flex min-h-64 w-full items-center justify-center p-6 data-[fullscreen=true]:min-h-dvh" data-fullscreen={fullScreen} role="status">
      <div className="w-full max-w-md space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace…</p>
        <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <div className="h-28 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-hidden="true" />
      </div>
    </div>
  );
}

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
        <Suspense fallback={<RouteFallback fullScreen />}>
          <PortalSelectView />
        </Suspense>
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
      <div className="h-dvh w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
        <Suspense fallback={<RouteFallback fullScreen />}>
          <AdviserPortalView />
        </Suspense>
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
    <div className="flex min-h-dvh min-w-0 flex-col bg-slate-100 text-slate-900 md:flex-row dark:bg-slate-950 dark:text-slate-100 print:block print:h-auto print:min-h-0 print:bg-white print:text-black">
      <header className="ui-mobile-header sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-300 bg-white px-4 py-2 md:hidden dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="ui-icon-button"
            aria-label="Open Navigation Menu"
            aria-expanded={mobileSidebarOpen}
            aria-controls="app-sidebar"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">SRPHS Grading</span>
        </div>
        <span className="ui-badge shrink-0">
          {activeRoute === 'class-manager' ? 'Gradebook' : activeRoute === 'dashboard' ? 'Grading Hub' : activeRoute === 'settings' ? 'Settings' : 'Manual'}
        </span>
      </header>

      {/* Navigation Sidebar (Desktop pinned sidebar or Mobile drawer) */}
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace */}
      <main id="main-content" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 print:max-w-full print:space-y-4 print:p-0 print:m-0">
          <Suspense fallback={<RouteFallback />}>
            {activeRoute === 'dashboard' && <DashboardView />}
            {activeRoute === 'class-manager' && <ClassManagerView />}
            {activeRoute === 'settings' && <SettingsView />}
            {activeRoute === 'about' && <AboutView />}
          </Suspense>
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
