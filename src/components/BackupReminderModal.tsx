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
    <div className="ui-dialog-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="backup-reminder-title" aria-describedby="backup-reminder-description" className="ui-dialog max-w-md">
        <header className="ui-dialog-header">
          <div className="flex min-w-0 items-start gap-3">
            <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <h3 id="backup-reminder-title" className="ui-section-title">Time to Backup</h3>
              <p className="ui-description">Periodic snapshot reminder</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label="Close backup reminder">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="ui-dialog-body space-y-4">
          <p id="backup-reminder-description" className="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            It&apos;s been 30 minutes since your last backup. Would you like to save a timestamped backup now?
          </p>
          <div className="ui-notice">
            <CheckCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>Your app saves automatically. This backup gives you an extra recovery point.</span>
          </div>
        </div>
        <footer className="ui-dialog-footer">
          <button type="button" onClick={onClose} disabled={isDownloading} className="ui-button">Skip for Now</button>
          <button type="button" onClick={handleBackupNow} disabled={isDownloading} className="ui-button-primary" aria-busy={isDownloading}>
            <Download aria-hidden="true" className="size-4" />
            {isDownloading ? 'Downloading...' : 'Backup Now'}
          </button>
        </footer>
      </section>
    </div>
  );
}
