import { isAndroid, isTauri, isDesktop } from './platform';
import { globalToast } from '../context/ToastContext';

/**
 * fileExportAdapter.ts
 *
 * Handles file exports across platforms:
 * - Desktop (Tauri & Web): Native Save File Picker / dialog or browser download
 * - Android (Tauri):
 *     1. Calls native dialog.save() -> Launches Android Storage Access Framework (SAF)
 *        document picker so user selects EXACT folder/name (Downloads, SD card, Drive, etc.).
 *     2. Writes the bytes to the selected URI/path using @tauri-apps/plugin-fs.
 *     3. Fallback: If SAF picker is dismissed or unsupported, attempts direct write or share.
 */

export interface ExportFileOptions {
  filename: string;
  content: string | Uint8Array | Blob;
  mimeType?: string;
  title?: string;
}

/** Convert any content type into Uint8Array bytes */
async function toBytes(content: string | Uint8Array | Blob): Promise<Uint8Array> {
  if (content instanceof Uint8Array) return content;
  if (typeof content === 'string') return new TextEncoder().encode(content);
  const buffer = await content.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * ANDROID path:
 * Prompts user with Android SAF document creator ("Save As" picker).
 */
async function saveOnAndroid(
  filename: string,
  content: string | Uint8Array | Blob,
  mimeType: string
): Promise<boolean> {
  try {
    const bytes = await toBytes(content);
    const ext = filename.split('.').pop() ?? '*';

    // 1. Try Tauri dialog plugin save() - on Android this triggers ACTION_CREATE_DOCUMENT
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await save({
        defaultPath: filename,
        filters: [
          {
            name: ext.toUpperCase() + ' File',
            extensions: [ext],
          },
        ],
      });

      if (selectedPath) {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        await writeFile(selectedPath, bytes);
        globalToast.success(`Saved to selected location.`, 'File Saved');
        return true;
      } else {
        // User cancelled the file picker dialog
        return false;
      }
    } catch (dialogErr) {
      console.warn('[Android] SAF dialog.save failed or unavailable, trying fallback:', dialogErr);
    }

    // 2. Fallback: Web Share API if available with files
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const blob = content instanceof Blob ? content : new Blob([bytes as unknown as BlobPart], { type: mimeType });
        const file = new File([blob], filename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
          });
          globalToast.success(`File shared / saved successfully.`, 'Export Completed');
          return true;
        }
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') return false;
        console.warn('[Android] Web share fallback failed:', shareErr);
      }
    }

    // 3. Fallback: Write directly to Download directory via fs plugin
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      const { BaseDirectory } = fs;
      await fs.writeFile(filename, bytes, { baseDir: BaseDirectory.Download });
      globalToast.success(`"${filename}" saved to Downloads folder.`, 'File Saved');
      return true;
    } catch (fsErr) {
      console.error('[Android] FS Download write failed:', fsErr);
    }

    throw new Error('Could not open Android save picker or write file.');
  } catch (err: any) {
    console.error('[Android] Export error:', err);
    globalToast.error(
      `Could not save "${filename}". Error: ${err?.message ?? String(err)}`,
      'Save Failed'
    );
    return false;
  }
}

/**
 * DESKTOP path (Tauri or Browser):
 * Tries the native OS "Save As" dialog (Tauri dialog or Chromium showSaveFilePicker),
 * falling back to standard anchor download.
 */
async function saveOnDesktop(
  filename: string,
  content: string | Uint8Array | Blob,
  mimeType: string
): Promise<boolean> {
  const bytes = await toBytes(content);
  const blob = content instanceof Blob ? content : new Blob([bytes as unknown as BlobPart], { type: mimeType });

  // 1. If running inside Desktop Tauri, use dialog.save()
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const ext = filename.split('.').pop() ?? '*';
      const selectedPath = await save({
        defaultPath: filename,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (selectedPath) {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        await writeFile(selectedPath, bytes);
        globalToast.success(`"${filename}" saved successfully.`, 'File Saved');
        return true;
      }
      return false; // User cancelled
    } catch (e) {
      console.warn('[Desktop Tauri] dialog.save failed, falling back to browser picker', e);
    }
  }

  // 2. Try Chromium File System Access API
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop() ?? '';
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{
          createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
        }>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: filename, accept: { [mimeType]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return false; // User cancelled
    }
  }

  // 3. Fallback: Browser anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

/**
 * Main export function.
 */
export async function exportFile({
  filename,
  content,
  mimeType = 'application/octet-stream',
}: ExportFileOptions): Promise<boolean> {
  if (isAndroid() && isTauri()) {
    return saveOnAndroid(filename, content, mimeType);
  }
  return saveOnDesktop(filename, content, mimeType);
}
