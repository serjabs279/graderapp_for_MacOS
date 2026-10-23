import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProjectStudentGrade,
  getDefaultDepedPolicy,
  getEffectiveScore,
  getSubjectWeights,
  transmuteGrade,
  transmuteGrade2027,
} from '../../utils.ts';
import type { Project } from '../../types.ts';

function makeProject(overrides: Record<string, unknown> = {}): Project {
  return {
    id: 'project-1',
    schoolName: 'SRPHS',
    schoolYear: '2026-2027',
    gradeLevel: 'Grade 7',
    section: 'Rizal',
    subject: 'English',
    teacherName: 'Test Teacher',
    passingGrade: 75,
    depedPolicy: '2015',
    students: [{ id: 'student-1', name: 'DELA CRUZ, JUAN', lrn: '123456789012' }],
    quarters: {
      'Quarter 1': {
        assessments: [
          { id: 'ww-1', name: 'Written Work 1', category: 'WOW', perfectScore: 20, order: 0 },
          { id: 'pt-1', name: 'Performance Task 1', category: 'PPT', perfectScore: 50, order: 1 },
          { id: 'qe-1', name: 'Quarterly Exam', category: 'QSTE', perfectScore: 50, order: 2 },
        ],
        scores: {
          'student-1': { 'ww-1': 20, 'pt-1': 40, 'qe-1': 40 },
        },
      },
    },
    lastActiveQuarter: 'Quarter 1',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Project;
}

test('DO 8 s. 2015 transmutation boundaries', () => {
  assert.equal(transmuteGrade(100), 100);
  assert.equal(transmuteGrade(98.4), 99);
  assert.equal(transmuteGrade(60), 75);
  assert.equal(transmuteGrade(4.68), 61);
  assert.equal(transmuteGrade(0), 60);
});

test('MATATAG adjusted transmutation boundaries', () => {
  assert.equal(transmuteGrade2027(99.5), 100);
  assert.equal(transmuteGrade2027(70), 75);
  assert.equal(transmuteGrade2027(69.99), 74);
  assert.equal(transmuteGrade2027(0), 60);
});

test('policy defaults switch in SY 2027-2028', () => {
  assert.equal(getDefaultDepedPolicy('2026-2027'), '2015');
  assert.equal(getDefaultDepedPolicy('2027-2028'), '2027');
  assert.equal(getDefaultDepedPolicy(undefined), '2015');
  assert.equal(getDefaultDepedPolicy('not-a-year'), '2015');
});

test('subject weights use core, TLE, and MAPEH defaults', () => {
  assert.deepEqual(getSubjectWeights('English'), { wow: 0.2, ppt: 0.5, qste: 0.3 });
  assert.deepEqual(getSubjectWeights('TLE'), { wow: 0.2, ppt: 0.6, qste: 0.2 });
  assert.deepEqual(getSubjectWeights('Music & Arts'), { wow: 0.2, ppt: 0.6, qste: 0.2 });
  assert.deepEqual(getSubjectWeights('English', undefined, undefined, undefined, { wow: 0.3, ppt: 0.4, qste: 0.3 }), { wow: 0.3, ppt: 0.4, qste: 0.3 });
});

test('effective score honors mastery and each reassessment policy', () => {
  const settings = { enabled: true, masteryThreshold: 75, policy: 'Average' as const };
  assert.equal(getEffectiveScore(80, 90, 100, settings, true), 80);
  assert.equal(getEffectiveScore(10, 20, 100, settings, true), 15);
  assert.equal(getEffectiveScore(10, 20, 100, { ...settings, policy: 'Highest' }, true), 20);
  assert.equal(getEffectiveScore(10, 20, 100, { ...settings, policy: 'Replacement' }, true), 20);
  assert.equal(getEffectiveScore(10, undefined, 100, settings, true), 10);
  assert.equal(getEffectiveScore(10, 20, 100, { ...settings, enabled: false }, true), 10);
  assert.equal(getEffectiveScore(10, 20, 100, settings, false), 10);
  assert.equal(getEffectiveScore(undefined, 20, 100, settings, true), undefined);
});

test('computes weighted grade, passing remark, and raw totals', () => {
  const result = computeProjectStudentGrade(makeProject(), 'student-1');
  assert.equal(result.wowPercentage, 100);
  assert.equal(result.pptPercentage, 80);
  assert.equal(result.qstePercentage, 80);
  assert.equal(result.initialGrade, 84);
  assert.equal(result.rawFinalGrade, 84);
  assert.equal(result.finalGrade, 84);
  assert.equal(result.isPassing, true);
  assert.equal(result.remarks, 'Passed');
  assert.equal(result.hasScores, true);
});

test('applies an approved grade adjustment over the computed grade', () => {
  const project = makeProject();
  project.quarters['Quarter 1'].adjustmentModeEnabled = true;
  project.quarters['Quarter 1'].adjustments = {
    'student-1': { studentId: 'student-1', adjustedGrade: 90, reason: 'Approved appeal' },
  } as never;

  const result = computeProjectStudentGrade(project, 'student-1');
  assert.equal(result.rawFinalGrade, 84);
  assert.equal(result.finalGrade, 90);
  assert.equal(result.isPassing, true);
});

test('returns empty metrics for a missing quarter', () => {
  const result = computeProjectStudentGrade(makeProject(), 'student-1', undefined, 'Quarter 4');
  assert.equal(result.hasScores, false);
  assert.equal(result.finalGrade, 0);
  assert.equal(result.remarks, '-');
  assert.equal(result.isPassing, false);
});

test('marks failing learners for intervention', () => {
  const project = makeProject({
    quarters: {
      'Quarter 1': {
        assessments: [
          { id: 'ww-1', name: 'Written Work 1', category: 'WOW', perfectScore: 20, order: 0 },
        ],
        scores: { 'student-1': { 'ww-1': 2 } },
      },
    },
  });
  const result = computeProjectStudentGrade(project, 'student-1');
  assert.equal(result.initialGrade, 2);
  assert.equal(result.finalGrade, 2);
  assert.equal(result.isPassing, false);
  assert.equal(result.remarks, 'Needs Intervention');
});
