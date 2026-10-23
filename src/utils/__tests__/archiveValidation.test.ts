import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArchive } from '../archiveValidation.ts';

const metadata = {
  archiveVersion: '1.0',
  appVersion: '2.0.0',
  schoolYear: '2026-2027',
  calendarType: 'Quarter',
  createdAt: '2026-10-22T00:00:00.000Z',
  createdBy: 'Test Adviser',
  totalProjects: 0,
  totalStudents: 0,
  totalAdviserClasses: 0,
};

test('accepts a supported archive', () => {
  const result = validateArchive(JSON.stringify({ metadata, projects: [], adviserClasses: [], globalSettings: {} }));
  assert.equal(result.valid, true);
  assert.equal(result.error, null);
  assert.equal(result.archive?.metadata.schoolYear, '2026-2027');
});

test('rejects malformed JSON', () => {
  const result = validateArchive('{not json');
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /Invalid JSON/);
});

test('rejects a missing metadata block', () => {
  const result = validateArchive(JSON.stringify({ projects: [] }));
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /Missing metadata/);
});

test('rejects a missing required metadata field', () => {
  const { createdBy: _omit, ...incomplete } = metadata;
  const result = validateArchive(JSON.stringify({ metadata: incomplete, projects: [] }));
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /createdBy/);
});

test('rejects unsupported archive versions with the supported list', () => {
  for (const version of ['0.9', '2.0']) {
    const result = validateArchive(JSON.stringify({ metadata: { ...metadata, archiveVersion: version }, projects: [] }));
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /Unsupported archive version/);
    assert.match(result.error ?? '', /1\.0/);
  }
});

test('rejects an archive without a projects array', () => {
  const result = validateArchive(JSON.stringify({ metadata }));
  assert.equal(result.valid, false);
  assert.match(result.error ?? '', /projects/);
});
