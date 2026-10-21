import React, { useState, useEffect } from 'react';
import { fileLocator, ExportedFileInfo, openExportedFolder } from '../utils/fileLocator';
import { isAndroid, isTauri, isDesktop } from '../utils/platform';
import { useApp } from '../context/AppContext';
import {
  FolderOpen, FileCode, CheckCircle2, Copy, Check, Share2,
  X, ExternalLink, HardDrive, DownloadCloud, Sparkles, Mail, CloudUpload
} from 'lucide-react';

export default function DownloadedFileLocatorModal() {
  const { globalSettings } = useApp();
  const [fileInfo, setFileInfo] = useState<ExportedFileInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const googleDriveLink = globalSettings.googleDriveLink || '';

  useEffect(() => {
    const unsubscribe = fileLocator.subscribe((info) => {
      // Only pop up when a JSON file is exported (or when specifically requested)
      if (info.isJson || info.filename.toLowerCase().endsWith('.json')) {
        setFileInfo(info);
        setCopied(false);
        setAutoOpened(false);

        // Automatically trigger opening the folder where the exported file is
        setTimeout(async () => {
          setIsOpening(true);
          const success = await openExportedFolder(info);
          setIsOpening(false);
          if (success) {
            setAutoOpened(true);
          }
        }, 300);
      }
    });

    return unsubscribe;
  }, []);

  if (!fileInfo) return null;

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
    await openExportedFolder(fileInfo);
    setIsOpening(false);
    setAutoOpened(true);
  };

  /** Opens any URL in the system default browser — works in both Tauri and plain browser */
  const openInBrowser = async (url: string) => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_url', { url });
        return;
      } catch (err) {
        console.warn('[Tauri] open_url failed, falling back to window.open:', err);
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGmail = () => {
    if (!fileInfo) return;
    const subject = encodeURIComponent(`Grade Export: ${fileInfo.filename}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find the attached JSON grade export below.\n\nFile: ${fileInfo.filename}\nSaved at: ${fileInfo.savedPath || fileInfo.folderPath || 'Downloads Folder'}\nExported: ${new Date(fileInfo.timestamp).toLocaleString()}\n\nPlease import this file in the Adviser Portal under Import Grades.`
    );
    openInBrowser(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`);
  };

  const handleDriveUpload = () => {
    if (!fileInfo) return;
    const driveUrl = googleDriveLink || 'https://drive.google.com';
    openInBrowser(driveUrl);
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
          await navigator.share({
            files: [file],
            title: fileInfo.filename,
          });
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

  const displayLocation = fileInfo.savedPath
    ? fileInfo.savedPath
    : fileInfo.folderPath
      ? fileInfo.folderPath
      : isAndroid()
        ? 'Downloads (/storage/emulated/0/Download)'
        : 'Downloads Folder';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Downloaded File Locator
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Export Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Folder locator and destination manager for your exported file
              </p>
            </div>
          </div>
          <button
            onClick={() => setFileInfo(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* File Card */}
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={fileInfo.filename}>
                  {fileInfo.filename}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{formatBytes(fileInfo.fileSizeBytes)}</span>
                  <span>•</span>
                  <span>JSON Subject Grade File</span>
                  <span>•</span>
                  <span>Just now</span>
                </div>
              </div>
            </div>

            {/* Folder Location Row */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Saved Folder Location:
                </span>
                {autoOpened && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Opened in File Manager
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate" title={displayLocation}>
                  {displayLocation}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="px-2.5 py-1.5 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="Copy full path to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Teacher Guidance / Info Pill */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-3.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <div><strong>Adviser Portal Import Ready:</strong> In the Adviser Portal, go to <span className="font-semibold underline">Import Grades</span> and pick this file to consolidate class grades.</div>
              <div className="text-amber-700 dark:text-amber-400 flex items-start gap-1">
                <span className="shrink-0 font-black">☁</span>
                <span><strong>To upload to Drive:</strong> Click <em>Open Saved Folder</em> to highlight the file, then click <em>Open Drive Folder</em> — drag &amp; drop the file from Explorer into the Drive tab in your browser.</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Row 1: Primary folder / share actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleManualOpen}
                disabled={isOpening}
                className="w-full sm:flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>{isOpening ? 'Opening Folder...' : 'Open Saved Folder'}</span>
              </button>

              {/* Mobile / Android Web Share */}
              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Send via Bluetooth, Drive, Files, or Messaging"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share / Send</span>
                </button>
              )}
            </div>

            {/* Row 2: Cloud send actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Gmail Compose */}
              <button
                type="button"
                onClick={handleGmail}
                className="w-full sm:flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Open Gmail compose with file details"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send via Gmail</span>
              </button>

              {/* Google Drive — opens folder, user drags file in */}
              <button
                type="button"
                onClick={handleDriveUpload}
                className="w-full sm:flex-1 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Opens your Drive folder in the browser — then drag & drop the file from the Explorer window into Drive"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Open Drive Folder</span>
                <span className="text-[9px] font-bold bg-blue-200/60 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">Drag &amp; Drop</span>
              </button>
            </div>

            {/* Done */}
            <button
              type="button"
              onClick={() => setFileInfo(null)}
              className="w-full py-2 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
