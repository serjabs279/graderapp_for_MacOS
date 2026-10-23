import { isAndroid, isTauri } from './platform';

export interface PickedTextFile {
  name: string;
  text: string;
}

function fileNameFromPath(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the raw value when it is not URI-encoded.
  }
  decoded = decoded.split('?')[0];
  const separator = Math.max(decoded.lastIndexOf('/'), decoded.lastIndexOf('\\'), decoded.lastIndexOf(':'));
  const name = decoded.slice(separator + 1);
  return name || 'gradebook-backup.json';
}

function pickWithBrowserInput(): Promise<PickedTextFile | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        cleanup();
        resolve({ name: file.name, text });
      } catch (err) {
        cleanup();
        resolve(null);
        console.error('[Import] Could not read the selected file:', err);
      }
    });

    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });

    input.click();
  });
}

/**
 * Opens the platform file picker and reads the chosen JSON as text.
 * On Android the dialog returns a content:// URI, which the fs plugin reads via SAF.
 */
export async function pickJsonBackupFile(): Promise<PickedTextFile | null> {
  if (!isTauri()) {
    return pickWithBrowserInput();
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    directory: false,
    title: 'Select gradebook JSON backup',
    // SAF only filters by MIME type and some file managers label JSON as
    // octet-stream, so Android shows every file and the app validates content.
    filters: isAndroid() ? undefined : [{ name: 'JSON Backup', extensions: ['json'] }],
  });

  if (!selected || Array.isArray(selected)) return null;

  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  try {
    const text = await readTextFile(selected);
    return { name: fileNameFromPath(selected), text };
  } catch (err: any) {
    throw new Error(`Could not read the selected file. ${err?.message ?? String(err)}`);
  }
}
