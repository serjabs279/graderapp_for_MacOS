import { isAndroid, isTauri } from './platform';
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

const DOCUMENT_MARKER = '/document/';
const EXTERNAL_STORAGE_PREFIX = '/storage/emulated/0/';

function decodeAndroidDocId(uri: string): string | null {
  const idx = uri.indexOf(DOCUMENT_MARKER);
  if (idx === -1) return null;
  const encoded = uri.slice(idx + DOCUMENT_MARKER.length).split(/[?#]/)[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function buildAndroidDocUri(baseUri: string, docId: string): string {
  const idx = baseUri.indexOf(DOCUMENT_MARKER);
  const base = idx === -1
    ? 'content://com.android.externalstorage.documents/document/'
    : baseUri.slice(0, idx + DOCUMENT_MARKER.length);
  return base + encodeURIComponent(docId);
}

/** SAF folder URI for the folder that contains the saved file. */
function androidFolderUri(info: ExportedFileInfo): string | null {
  if (info.savedPath?.startsWith('content://')) {
    const docId = decodeAndroidDocId(info.savedPath);
    if (!docId) return null;
    const cut = docId.lastIndexOf('/');
    if (cut <= 0) return null;
    return buildAndroidDocUri(info.savedPath, docId.slice(0, cut));
  }

  const folderPath = info.folderPath
    || (info.savedPath?.includes('/') ? info.savedPath.slice(0, info.savedPath.lastIndexOf('/')) : undefined);
  if (folderPath?.startsWith(EXTERNAL_STORAGE_PREFIX)) {
    return buildAndroidDocUri(
      'content://com.android.externalstorage.documents/document/',
      'primary:' + folderPath.slice(EXTERNAL_STORAGE_PREFIX.length)
    );
  }
  return null;
}

/** SAF document URI for the saved file itself. */
function androidFileUri(info: ExportedFileInfo): string | null {
  if (info.savedPath?.startsWith('content://')) return info.savedPath;
  if (info.savedPath?.startsWith(EXTERNAL_STORAGE_PREFIX)) {
    return buildAndroidDocUri(
      'content://com.android.externalstorage.documents/document/',
      'primary:' + info.savedPath.slice(EXTERNAL_STORAGE_PREFIX.length)
    );
  }
  return null;
}

async function shareExportedFile(info: ExportedFileInfo): Promise<boolean> {
  if (!info.content || typeof navigator === 'undefined' || !navigator.share) return false;

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
    if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;

    await navigator.share({ files: [file], title: info.filename });
    return true;
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('[Share] Could not share exported file:', err);
    }
    return false;
  }
}

/**
 * Opens the folder (or file) that holds the exported file.
 * Returns true only when a native intent / share sheet actually launched.
 */
export async function openExportedFolder(info: ExportedFileInfo): Promise<boolean> {
  const target = info.savedPath || info.folderPath || '';

  // Android is checked first: a Tauri Android build also reports isTauri(), but the
  // desktop `open_folder` command is a no-op there.
  if (isAndroid() && isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      const candidates = [androidFolderUri(info), androidFileUri(info)]
        .filter((uri): uri is string => !!uri);

      for (const uri of candidates) {
        try {
          await openUrl(uri);
          return true;
        } catch (err) {
          console.warn('[Android] Could not open:', uri, err);
        }
      }
    } catch (err) {
      console.warn('[Android] Opener plugin unavailable:', err);
    }
    return shareExportedFile(info);
  }

  // Plain browser on Android: no access to local folders, offer the share sheet instead.
  if (isAndroid()) {
    if (await shareExportedFile(info)) return true;
    return false;
  }

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_folder', { path: target || info.filename });
      return true;
    } catch (err) {
      console.warn('[Desktop Tauri] open_folder invoke failed:', err);
      return false;
    }
  }

  if (target) {
    try {
      await navigator.clipboard.writeText(target);
      globalToast.info(`File location copied: ${target}`, 'Path Copied');
    } catch {
      // ignore
    }
  }

  return false;
}

/** Opens an http(s)/mailto URL with the system default handler. */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return true;
    } catch (err) {
      console.warn('[Tauri] openUrl failed:', err);
      return false;
    }
  }

  if (typeof window === 'undefined') return false;
  try {
    return window.open(url, '_blank', 'noopener,noreferrer') !== null;
  } catch {
    return false;
  }
}
