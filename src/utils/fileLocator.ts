import { isAndroid, isTauri, isDesktop } from './platform';
import { globalToast } from '../context/ToastContext';

export interface ExportedFileInfo {
  filename: string;
  savedPath?: string;
  folderPath?: string;
  fileSizeBytes?: number;
  timestamp: number;
  mimeType: string;
  content?: string | Uint8Array | Blob;
  isJson?: boolean;
}

type FileLocatorListener = (info: ExportedFileInfo) => void;

class FileLocatorManager {
  private listeners: Set<FileLocatorListener> = new Set();
  private lastExportedFile: ExportedFileInfo | null = null;

  subscribe(listener: FileLocatorListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(info: ExportedFileInfo) {
    this.lastExportedFile = info;
    this.listeners.forEach(fn => fn(info));
  }

  getLastFile(): ExportedFileInfo | null {
    return this.lastExportedFile;
  }
}

export const fileLocator = new FileLocatorManager();

/**
 * Automatically opens or reveals the folder/file location on Desktop & Android.
 */
export async function openExportedFolder(info: ExportedFileInfo): Promise<boolean> {
  const target = info.savedPath || info.folderPath || '';

  // 1. Desktop Tauri: Invoke native Rust open_folder command (Explorer / Finder / xdg-open)
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_folder', { path: target || info.filename });
      return true;
    } catch (err) {
      console.warn('[Desktop Tauri] open_folder invoke failed:', err);
    }
  }

  // 2. Android: Try to launch Downloads / Files app or Web Share
  if (isAndroid()) {
    // If Web Share API is available with file, user can open directly with Files app
    if (info.content && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const bytes = typeof info.content === 'string'
          ? new TextEncoder().encode(info.content)
          : info.content instanceof Uint8Array
            ? info.content
            : await info.content.arrayBuffer();

        const blob = info.content instanceof Blob
          ? info.content
          : new Blob([bytes as unknown as BlobPart], { type: info.mimeType || 'application/json' });

        const file = new File([blob], info.filename, { type: info.mimeType || 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: info.filename,
          });
          return true;
        }
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') return false;
        console.warn('[Android] share fallback in openExportedFolder:', shareErr);
      }
    }

    // Try opening Android downloads intent scheme
    try {
      const intentUrl = 'content://com.android.providers.downloads.documents/root/downloads';
      window.open(intentUrl, '_blank');
      return true;
    } catch (e) {
      console.warn('[Android] intent open failed:', e);
    }
  }

  // 3. Fallback: Copy path to clipboard
  if (target) {
    try {
      await navigator.clipboard.writeText(target);
      globalToast.info(`File location copied: ${target}`, 'Path Copied');
      return true;
    } catch {
      // ignore
    }
  }

  return false;
}
