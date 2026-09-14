/**
 * tauriPersistence.ts
 *
 * Dual-layer data persistence for SRPHS Grading App running in Tauri.
 *
 * WHY THIS EXISTS:
 * Tauri stores WebView data (localStorage) in a WebView cache directory.
 * When a user uninstalls and reinstalls the app, that cache is wiped.
 * The Tauri AppData directory ($APPDATA/edu.srphsi.gradeapp) is NEVER wiped
 * by an uninstall/reinstall — so we use it as a permanent backup.
 *
 * Strategy:
 *   • Every localStorage write ALSO writes to AppData/data/*.json
 *   • On startup, if localStorage is empty, read from AppData first
 *   • Only fall back to SEED_PROJECTS if BOTH sources are empty (genuine fresh install)
 *
 * Degrades gracefully in browser / non-Tauri mode (no-ops all file operations).
 */

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function getTauriFs() {
  if (!isTauri()) return null;
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    return fs;
  } catch {
    return null;
  }
}

const DATA_DIR = 'data';

// Map localStorage keys → AppData filenames
const FILE_MAP: Record<string, string> = {
  srphs_projects_p2:     'projects.json',
  srphs_adviser_classes: 'adviser_classes.json',
  srphs_settings_p2:     'settings.json',
};

async function ensureDataDir(fs: Awaited<ReturnType<typeof getTauriFs>>): Promise<void> {
  if (!fs) return;
  try {
    const { BaseDirectory } = fs;
    const exists = await fs.exists(DATA_DIR, { baseDir: BaseDirectory.AppData }).catch(() => false);
    if (!exists) {
      await fs.mkdir(DATA_DIR, { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
    }
  } catch {}
}

/**
 * Save to both localStorage AND AppData file backup.
 */
export async function persistSave(key: string, value: string): Promise<void> {
  // Always write localStorage
  try { localStorage.setItem(key, value); } catch {}

  // Also write to AppData file (Tauri only)
  const fileName = FILE_MAP[key];
  if (!fileName) return;

  const fs = await getTauriFs();
  if (!fs) return;

  try {
    await ensureDataDir(fs);
    const { BaseDirectory } = fs;
    await fs.writeTextFile(`${DATA_DIR}/${fileName}`, value, { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.warn('[persist] AppData write failed:', e);
  }
}

/**
 * Load a value: try localStorage first, then AppData file.
 * Returns null if not found in either.
 */
export async function persistLoad(key: string): Promise<string | null> {
  // Try localStorage first (fast path)
  const localValue = localStorage.getItem(key);
  if (localValue !== null) return localValue;

  // Fall back to AppData file (Tauri only)
  const fileName = FILE_MAP[key];
  if (!fileName) return null;

  const fs = await getTauriFs();
  if (!fs) return null;

  try {
    const { BaseDirectory } = fs;
    const filePath = `${DATA_DIR}/${fileName}`;
    const exists = await fs.exists(filePath, { baseDir: BaseDirectory.AppData }).catch(() => false);
    if (!exists) return null;

    const content = await fs.readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    if (content && content.trim().length > 2) {
      // Restore to localStorage so future reads are instant
      try { localStorage.setItem(key, content); } catch {}
      console.info(`[persist] Recovered "${key}" from AppData backup (${content.length} bytes).`);
      return content;
    }
    return null;
  } catch (e) {
    console.warn('[persist] AppData read failed:', e);
    return null;
  }
}

/**
 * Call once after initial load — syncs any existing localStorage data to
 * AppData files if the AppData files don't exist yet. This protects
 * existing users upgrading from an older version without file backup.
 */
export async function bootstrapAppDataBackup(): Promise<void> {
  const fs = await getTauriFs();
  if (!fs) return;

  await ensureDataDir(fs);
  const { BaseDirectory } = fs;

  for (const [key, fileName] of Object.entries(FILE_MAP)) {
    const localValue = localStorage.getItem(key);
    if (!localValue) continue;

    try {
      const filePath = `${DATA_DIR}/${fileName}`;
      const exists = await fs.exists(filePath, { baseDir: BaseDirectory.AppData }).catch(() => false);
      if (!exists) {
        await fs.writeTextFile(filePath, localValue, { baseDir: BaseDirectory.AppData });
        console.info(`[persist] Bootstrapped AppData backup for "${key}".`);
      }
    } catch {}
  }
}
