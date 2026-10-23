import React, { useState, useEffect } from 'react';
import { fileLocator, ExportedFileInfo, openExportedFolder, openExternalUrl } from '../utils/fileLocator';
import { isAndroid } from '../utils/platform';
import { globalToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { FolderOpen, FileCode, CheckCircle2, Copy, Check, Share2, X, HardDrive, Info, Mail, CloudUpload } from 'lucide-react';

export default function DownloadedFileLocatorModal() {
  const { globalSettings } = useApp();
  const [fileInfo, setFileInfo] = useState<ExportedFileInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const googleDriveLink = globalSettings.googleDriveLink || '';

  useEffect(() => {
    const unsubscribe = fileLocator.subscribe((info) => {
      if (info.isJson || info.filename.toLowerCase().endsWith('.json')) {
        setFileInfo(info);
        setCopied(false);
        setAutoOpened(false);
        setOpenFailed(false);

        setTimeout(async () => {
          setIsOpening(true);
          const success = await openExportedFolder(info);
          setIsOpening(false);
          setAutoOpened(success);
          setOpenFailed(!success);
        }, 300);
      }
    });

    return unsubscribe;
  }, []);

  if (!fileInfo) return null;

  const formatLocation = (raw?: string) => {
    if (!raw) return '';
    if (raw.startsWith('content://')) {
      const marker = '/document/';
      const idx = raw.indexOf(marker);
      if (idx >= 0) {
        try {
          const docId = decodeURIComponent(raw.slice(idx + marker.length).split(/[?#]/)[0]);
          return docId.startsWith('primary:')
            ? `Internal storage / ${docId.slice('primary:'.length)}`
            : docId;
        } catch {
          return raw;
        }
      }
    }
    return raw;
  };

  const displayLocation = fileInfo.savedPath
    ? formatLocation(fileInfo.savedPath)
    : fileInfo.folderPath
      ? formatLocation(fileInfo.folderPath)
      : isAndroid()
        ? 'Downloads'
        : 'Downloads Folder';

  const handleCopyPath = async () => {
    const textToCopy = fileInfo.savedPath || fileInfo.folderPath || fileInfo.filename;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  const handleManualOpen = async () => {
    setIsOpening(true);
    const success = await openExportedFolder(fileInfo);
    setIsOpening(false);
    setAutoOpened(success);
    setOpenFailed(!success);
    if (!success) {
      globalToast.error('Could not open the file manager. Copy the path below and open it manually.', 'Open Failed');
    }
  };

  const handleGmail = async () => {
    if (!fileInfo) return;
    const subject = encodeURIComponent(`Grade Export: ${fileInfo.filename}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find attached the JSON grade export for import in the Adviser Portal (Import Grades).\n\nFile: ${fileInfo.filename}\nSaved at: ${displayLocation}\nExported: ${new Date(fileInfo.timestamp).toLocaleString()}\n\n(Attach the file from the saved location above before sending.)`
    );

    if (await openExternalUrl(`mailto:?subject=${subject}&body=${body}`)) return;
    if (await openExternalUrl(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`)) return;
    globalToast.error('Could not open an email app or Gmail.', 'Open Failed');
  };

  const handleDriveUpload = async () => {
    if (!fileInfo) return;
    const driveUrl = googleDriveLink || 'https://drive.google.com';
    if (!(await openExternalUrl(driveUrl))) {
      globalToast.error('Could not open Google Drive.', 'Open Failed');
    }
  };

  const handleShare = async () => {
    if (fileInfo.content && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const bytes = typeof fileInfo.content === 'string'
          ? new TextEncoder().encode(fileInfo.content)
          : fileInfo.content instanceof Uint8Array
            ? fileInfo.content
            : await fileInfo.content.arrayBuffer();

        const blob = fileInfo.content instanceof Blob
          ? fileInfo.content
          : new Blob([bytes as unknown as BlobPart], { type: fileInfo.mimeType });

        const file = new File([blob], fileInfo.filename, { type: fileInfo.mimeType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileInfo.filename });
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.warn('Share error:', e);
        }
      }
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Few KB';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="ui-dialog-overlay z-[10000]">
      <section role="dialog" aria-modal="true" aria-labelledby="download-locator-title" className="ui-dialog max-w-lg">
        <header className="ui-dialog-header items-start">
          <div className="min-w-0">
            <h3 id="download-locator-title" className="ui-section-title">Downloaded File Locator</h3>
            <p className="ui-description">Folder locator and destination manager for your exported file</p>
          </div>
          <button type="button" onClick={() => setFileInfo(null)} className="ui-icon-button" aria-label="Close downloaded file locator"><X aria-hidden="true" className="size-5" /></button>
        </header>

        <div className="ui-dialog-body space-y-5">
          <div className="ui-panel space-y-4 p-4">
            <span className="ui-badge"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />Export Ready</span>
            <div className="flex items-start gap-3">
              <FileCode aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="break-all font-mono text-sm font-medium text-slate-800 dark:text-slate-100">{fileInfo.filename}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  <span>{formatBytes(fileInfo.fileSizeBytes)}</span><span aria-hidden="true">·</span><span>JSON Subject Grade File</span><span aria-hidden="true">·</span><span>Just now</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="ui-label flex items-center gap-2"><HardDrive aria-hidden="true" className="size-4" />Saved Folder Location:</p>
              <div className="flex flex-col items-start gap-2 sm:flex-row">
                <p className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">{displayLocation}</p>
                <button type="button" onClick={handleCopyPath} className="ui-button shrink-0" title="Copy full path to clipboard">
                  {copied ? <Check aria-hidden="true" className="size-4 text-emerald-600" /> : <Copy aria-hidden="true" className="size-4" />}
                  <span role="status">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div role="status" className="text-sm">
                {autoOpened && <p className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Opened in File Manager</p>}
                {!autoOpened && openFailed && <p className="flex items-start gap-2 text-red-700 dark:text-red-400"><X aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Couldn't open Files</p>}
              </div>
            </div>
          </div>

          <div className="ui-notice">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-2 leading-relaxed">
              <p><strong>Adviser Portal Import Ready:</strong> In the Adviser Portal, go to <span className="font-medium">Import Grades</span> and pick this file to consolidate class grades.</p>
              {isAndroid() ? (
                <p><strong>To upload to Drive:</strong> tap <em>Open Drive Folder</em>, then use <em>Upload</em> in Drive and pick this file from the saved location above.</p>
              ) : (
                <p><strong>To upload to Drive:</strong> Click <em>Open Saved Folder</em> to highlight the file, then click <em>Open Drive Folder</em> — drag &amp; drop the file from Explorer into the Drive tab in your browser.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button type="button" onClick={handleShare} className="ui-button" title="Send via Bluetooth, Drive, Files, or Messaging"><Share2 aria-hidden="true" className="size-4 shrink-0" />Share / Send</button>
            )}
            <button type="button" onClick={handleGmail} className="ui-button" title="Open Gmail compose with file details"><Mail aria-hidden="true" className="size-4 shrink-0" />Send via Gmail</button>
            <button type="button" onClick={handleDriveUpload} className="ui-button flex-wrap" title={isAndroid() ? 'Opens Google Drive — upload the saved file from there' : 'Opens your Drive folder in the browser — then drag & drop the file from the Explorer window into Drive'}>
              <CloudUpload aria-hidden="true" className="size-4 shrink-0" /><span>Open Drive Folder</span>
              {!isAndroid() && <span className="ui-badge">Drag &amp; Drop</span>}
            </button>
          </div>
        </div>
        <footer className="ui-dialog-footer">
          <button type="button" onClick={() => setFileInfo(null)} className="ui-button">Done</button>
          <button type="button" onClick={handleManualOpen} disabled={isOpening} aria-busy={isOpening} className="ui-button-primary">
            <FolderOpen aria-hidden="true" className="size-4 shrink-0" />{isOpening ? 'Opening Folder...' : 'Open Saved Folder'}
          </button>
        </footer>
      </section>
    </div>
  );
}
