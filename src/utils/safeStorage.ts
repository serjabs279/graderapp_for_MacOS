/**
 * Quota-safe localStorage access.
 *
 * A QuotaExceededError from a project save used to abort before the AppData
 * mirror ran, so the only durable copy was skipped. These helpers never throw
 * and sacrifice developer logs first, since they share the same quota bucket
 * but are the only expendable data.
 */

export const ERROR_LOG_KEY = 'srphs_dev_error_log';

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (key !== ERROR_LOG_KEY) {
      try {
        localStorage.removeItem(ERROR_LOG_KEY);
        localStorage.setItem(key, value);
        return true;
      } catch {}
    }
    console.error(`[storage] Failed to persist "${key}"`, error);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}
