import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge } from '../adviserUtils.ts';

const asOf = new Date(2026, 9, 22); // 2026-10-22

test('calculates age from an ISO birthdate', () => {
  assert.equal(calculateAge('1996-08-02', asOf), 30);
  assert.equal(calculateAge('2008-10-22', asOf), 18);
  assert.equal(calculateAge('2008-12-31', asOf), 17);
  assert.equal(calculateAge('2026-10-22', asOf), 0);
});

test('accepts SF10 slash dates and rejects invalid values', () => {
  assert.equal(calculateAge('08/02/1996', asOf), 30);
  assert.equal(calculateAge('', asOf), undefined);
  assert.equal(calculateAge(undefined, asOf), undefined);
  assert.equal(calculateAge('not-a-date', asOf), undefined);
  assert.equal(calculateAge('1996-02-30', asOf), undefined);
  assert.equal(calculateAge('2030-01-01', asOf), undefined);
});
