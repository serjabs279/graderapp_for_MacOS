import { ArchiveFile, ArchiveValidationResult, SUPPORTED_ARCHIVE_VERSIONS } from '../types';

/**
 * Shared archive validator for both restore and any future read-only archive
 * feature. Version compatibility is controlled by SUPPORTED_ARCHIVE_VERSIONS.
 */
export function validateArchive(text: string): ArchiveValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, archive: null, error: 'Invalid JSON: The file could not be parsed. Please make sure it is a valid archive file.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.metadata) {
    return { valid: false, archive: null, error: 'Missing metadata block. This does not appear to be a versioned SRPHS archive. It may be an older backup format.' };
  }

  const meta = obj.metadata as Record<string, unknown>;
  const required = ['archiveVersion', 'schoolYear', 'calendarType', 'createdAt', 'createdBy'];
  for (const field of required) {
    if (!meta[field]) {
      return { valid: false, archive: null, error: `Missing required metadata field: "${field}". The archive may be corrupted.` };
    }
  }

  if (!SUPPORTED_ARCHIVE_VERSIONS.includes(String(meta.archiveVersion))) {
    return {
      valid: false, archive: null,
      error: `Unsupported archive version: "${meta.archiveVersion}". This application supports: ${SUPPORTED_ARCHIVE_VERSIONS.join(', ')}.`
    };
  }

  if (!Array.isArray(obj.projects)) {
    return { valid: false, archive: null, error: 'Archive is missing the "projects" array. The file may be incomplete or corrupted.' };
  }

  return { valid: true, archive: obj as unknown as ArchiveFile, error: null };
}
