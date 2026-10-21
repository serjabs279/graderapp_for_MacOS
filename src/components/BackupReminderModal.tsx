import React, { useState } from 'react';
import { Clock, Download, X, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { globalToast } from '../context/ToastContext';
import { backupReminder } from '../utils/backupReminder';
import { exportFile } from '../utils/fileExportAdapter';

interface BackupReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupReminderModal({ isOpen, onClose }: BackupReminderModalProps) {
  const { backupData } = useApp();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleBackupNow = async () => {
    setIsDownloading(true);
    try {
      const now = new Date();
      // Format as YYYY-MM-DD_HH-mm-ss
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const filename = `srphs_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;

      const jsonStr = backupData();
      const saved = await exportFile({
        filename,
        content: jsonStr,
        mimeType: 'application/json',
        title: 'Save Periodic Backup',
      });

      if (saved) {
        backupReminder.recordBackup();
        onClose();
      }
    } catch (err: any) {
      console.error('Backup download error:', err);
      globalToast.error('Failed to create backup: ' + (err?.message || String(err)), 'Backup Failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Time to Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Periodic snapshot reminder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            It&apos;s been 30 minutes since your last backup. Would you like to save a timestamped backup now?
          </p>

          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>
              Your app saves automatically. This backup gives you an extra recovery point.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleBackupNow}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : 'Backup Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
