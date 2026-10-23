import test from 'node:test';
import assert from 'node:assert/strict';
import { safeSetItem, safeRemoveItem, ERROR_LOG_KEY } from '../safeStorage.ts';

class QuotaStorage {
  private store = new Map<string, string>();
  failAll = false;
  failUnlessLogCleared = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failAll) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    if (this.failUnlessLogCleared && key !== ERROR_LOG_KEY && this.store.has(ERROR_LOG_KEY)) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

test('writes normally when quota is available', () => {
  const storage = new QuotaStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;

  assert.equal(safeSetItem('srphs_projects_p2', '[]'), true);
  assert.equal(storage.getItem('srphs_projects_p2'), '[]');
});

test('drops developer logs to make room for project data', () => {
  const storage = new QuotaStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  storage.setItem(ERROR_LOG_KEY, '["old log"]');
  storage.failUnlessLogCleared = true;

  assert.equal(safeSetItem('srphs_projects_p2', '[{"id":"p1"}]'), true);
  assert.equal(storage.has(ERROR_LOG_KEY), false);
  assert.equal(storage.getItem('srphs_projects_p2'), '[{"id":"p1"}]');
});

test('returns false instead of throwing when storage is fully unavailable', () => {
  const storage = new QuotaStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
  storage.failAll = true;
  const originalError = console.error;
  console.error = () => {};

  try {
    assert.equal(safeSetItem('srphs_projects_p2', '[]'), false);
    assert.doesNotThrow(() => safeRemoveItem('srphs_projects_p2'));
  } finally {
    console.error = originalError;
  }
});
