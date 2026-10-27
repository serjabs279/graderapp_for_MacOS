import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTsekImport,
  normalizeGradeLevel,
  normalizeLabel,
  normalizeLrn,
  parseTsekScores,
  planTsekImport,
} from '../tsekScoresImport.ts';
import type { Project } from '../../types.ts';

const LRN_JUAN = '123456789012';
const LRN_ANA = '123456789013';
const LRN_MARK = '123456789014';
const LRN_LIZA = '123456789015';

function makeRawFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: '1.0',
    exportType: 'SRPHS_EXAM_SCORES',
    exportTimestamp: '2026-10-27T02:00:00.000Z',
    source: 'TSEK',
    subjectUID: 'N/A',
    subjectName: 'TLE 10',
    schoolYear: '2026-2027',
    gradeLevel: 'Grade 10',
    section: 'ST. THOMAS AQUINAS',
    teacherName: 'RICHMOND C. JABLA',
    workspace: 'JHS',
    quarterKey: '2nd Quarter',
    category: 'QE',
    categoryLabel: 'Quarterly Exam',
    assessmentName: 'Quarterly Examination',
    examCode: 'EX-3UNAFD',
    itemCount: 50,
    totalPoints: 50,
    learners: [
      { lrn: LRN_JUAN, studentName: 'DELA CRUZ, JUAN' },
      { lrn: LRN_ANA, studentName: 'REYES, ANA' },
    ],
    results: [
      {
        lrn: LRN_JUAN,
        studentName: 'DELA CRUZ, JUAN',
        pointsEarned: 26,
        pointsPossible: 50,
        percentage: 52,
        grade: 73,
        manualComplete: true,
        needsReview: false,
      },
      {
        lrn: LRN_ANA,
        studentName: 'REYES, ANA',
        pointsEarned: 41,
        pointsPossible: 50,
        percentage: 82,
        grade: 89,
        manualComplete: true,
        needsReview: false,
      },
    ],
    ...overrides,
  };
}

function makeProject(overrides: Record<string, unknown> = {}): Project {
  return {
    id: 'project-1',
    schoolName: 'SRPHS',
    schoolYear: '2026-2027',
    gradeLevel: 'Grade 10',
    section: 'ST. THOMAS AQUINAS',
    subject: 'TLE 10',
    teacherName: 'RICHMOND C. JABLA',
    passingGrade: 75,
    depedPolicy: '2015',
    workspace: 'JHS',
    students: [
      { id: 'student-juan', lrn: LRN_JUAN, name: 'DELA CRUZ, JUAN', sex: 'Male', status: 'Active' },
      { id: 'student-ana', lrn: LRN_ANA, name: 'REYES, ANA', sex: 'Female', status: 'Active' },
    ],
    quarters: {
      '1st Quarter': { assessments: [], scores: {} },
      '2nd Quarter': { assessments: [], scores: {} },
      '3rd Quarter': { assessments: [], scores: {} },
      '4th Quarter': { assessments: [], scores: {} },
    },
    lastActiveQuarter: '2nd Quarter',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Project;
}

const parse = (overrides: Record<string, unknown> = {}) => parseTsekScores(JSON.stringify(makeRawFile(overrides)));

test('normalizes LRNs, labels, and grade levels for comparison', () => {
  assert.equal(normalizeLrn(' 1234-5678 9012 '), '123456789012');
  assert.equal(normalizeLabel('  ST. THOMAS   AQUINAS '), 'st thomas aquinas');
  assert.equal(normalizeGradeLevel('Grade 10'), normalizeGradeLevel('10'));
});

test('rejects files that are not TSEK score exports', () => {
  assert.throws(() => parseTsekScores('not json'), /not valid JSON/);
  assert.throws(() => parseTsekScores(JSON.stringify({ exportType: 'SOMETHING_ELSE' })), /not a TSEK exam score file/);
  assert.throws(() => parse({ version: '2.0' }), /Unsupported TSEK score version/);
  assert.throws(() => parse({ examCode: '' }), /missing "examCode"/);
  assert.throws(() => parse({ category: 'EX' }), /Unknown TSEK category/);
  assert.throws(() => parse({ learners: [] }), /no learner roster/);
});

test('maps TSEK categories to gradebook categories and ignores the transmuted grade', () => {
  const file = parse();
  const plan = planTsekImport(file, makeProject());

  assert.equal(plan.category, 'QSTE');
  assert.equal(plan.perfectScore, 50);
  assert.equal(plan.level, 'ready');
  assert.equal(plan.importableScoreCount, 2);

  const juan = plan.rows.find(row => row.lrn === LRN_JUAN);
  assert.equal(juan?.score, 26, 'raw points are imported, not the transmuted grade');
  assert.equal(juan?.status, 'score');
  assert.equal(plan.confirmPhrase, 'ST. THOMAS AQUINAS');

  assert.equal(planTsekImport(parse({ category: 'WW', assessmentName: 'Quiz 1' }), makeProject()).category, 'WOW');
  assert.equal(planTsekImport(parse({ category: 'PT', assessmentName: 'Task 1' }), makeProject()).category, 'PPT');
});

test('works in an SHS gradebook and only warns about a workspace mismatch', () => {
  const project = makeProject({
    workspace: 'SHS',
    gradeLevel: 'Grade 11',
    section: 'STEM 1',
    subject: 'TLE 10',
  });
  const file = parse({ gradeLevel: 'Grade 11', section: 'STEM 1' });
  const plan = planTsekImport(file, project);

  assert.equal(plan.level, 'warning');
  assert.equal(plan.blockers.length, 0);
  assert.ok(plan.warnings.some(warning => /JHS workspace/.test(warning)));

  const imported = applyTsekImport(project, plan);
  const quarter = imported.quarters['2nd Quarter'];
  assert.equal(quarter.assessments[0].category, 'QSTE');
  assert.equal(quarter.scores['student-juan'][quarter.assessments[0].id], 26);
});

test('an unknown learner LRN blocks the whole file as a wrong section', () => {
  const file = parse({
    learners: [
      { lrn: LRN_JUAN, studentName: 'DELA CRUZ, JUAN' },
      { lrn: LRN_ANA, studentName: 'REYES, ANA' },
      { lrn: '999999999999', studentName: 'SOMEONE ELSE' },
    ],
  });
  const plan = planTsekImport(file, makeProject());

  assert.equal(plan.level, 'blocked');
  assert.ok(plan.blockers.some(blocker => /different section/i.test(blocker)));
  assert.equal(plan.rows.find(row => row.lrn === '999999999999')?.status, 'unmatched');
  assert.throws(() => applyTsekImport(makeProject(), plan), /different section/i);
});

test('grade level and section mismatches stop the import', () => {
  const file = parse();

  const wrongGrade = planTsekImport(file, makeProject({ gradeLevel: 'Grade 9' }));
  assert.equal(wrongGrade.level, 'blocked');
  assert.ok(wrongGrade.blockers.some(blocker => /Grade level mismatch/.test(blocker)));

  const wrongSection = planTsekImport(file, makeProject({ section: 'ST. LUKE' }));
  assert.equal(wrongSection.level, 'blocked');
  assert.ok(wrongSection.blockers.some(blocker => /Wrong section/.test(blocker)));

  const wrongSubject = planTsekImport(file, makeProject({ subject: 'English' }));
  assert.equal(wrongSubject.level, 'warning');
  assert.ok(wrongSubject.warnings.some(warning => /Subject differs/.test(warning)));
});

test('missing results stay blank instead of being scored zero', () => {
  const file = parse({
    learners: [
      { lrn: LRN_JUAN, studentName: 'DELA CRUZ, JUAN' },
      { lrn: LRN_ANA, studentName: 'REYES, ANA' },
      { lrn: LRN_MARK, studentName: 'SANTOS, MARK' },
    ],
  });
  const project = makeProject({
    students: [
      { id: 'student-juan', lrn: LRN_JUAN, name: 'DELA CRUZ, JUAN', sex: 'Male', status: 'Active' },
      { id: 'student-ana', lrn: LRN_ANA, name: 'REYES, ANA', sex: 'Female', status: 'Active' },
      { id: 'student-mark', lrn: LRN_MARK, name: 'SANTOS, MARK', sex: 'Male', status: 'Active' },
    ],
  });

  const plan = planTsekImport(file, project);
  const mark = plan.rows.find(row => row.lrn === LRN_MARK);
  assert.equal(mark?.status, 'missing-result');
  assert.equal(mark?.score, null);
  assert.ok(plan.warnings.some(warning => /left blank, not zero/.test(warning)));

  const imported = applyTsekImport(project, plan);
  const quarter = imported.quarters['2nd Quarter'];
  assert.equal(quarter.scores['student-mark'], undefined);
  assert.equal(Object.keys(quarter.scores).length, 2);
});

test('skips review-flagged and incomplete written scores while importing the rest', () => {
  const file = parse({
    learners: [
      { lrn: LRN_JUAN, studentName: 'DELA CRUZ, JUAN' },
      { lrn: LRN_ANA, studentName: 'REYES, ANA' },
      { lrn: LRN_MARK, studentName: 'SANTOS, MARK' },
      { lrn: LRN_LIZA, studentName: 'GARCIA, LIZA' },
    ],
    results: [
      { lrn: LRN_JUAN, pointsEarned: 26, pointsPossible: 50, manualComplete: true, needsReview: false },
      { lrn: LRN_ANA, pointsEarned: 41, pointsPossible: 50, manualComplete: true, needsReview: true },
      { lrn: LRN_MARK, pointsEarned: 10, pointsPossible: 50, manualComplete: false, manualScored: 1, manualCount: 2 },
      { lrn: LRN_LIZA, pointsEarned: 30, pointsPossible: 50, manualComplete: true, needsReview: false },
    ],
  });
  const project = makeProject({
    students: [
      { id: 'student-juan', lrn: LRN_JUAN, name: 'DELA CRUZ, JUAN', sex: 'Male', status: 'Active' },
      { id: 'student-ana', lrn: LRN_ANA, name: 'REYES, ANA', sex: 'Female', status: 'Active' },
      { id: 'student-mark', lrn: LRN_MARK, name: 'SANTOS, MARK', sex: 'Male', status: 'Active' },
      { id: 'student-liza', lrn: LRN_LIZA, name: 'GARCIA, LIZA', sex: 'Female', status: 'Active' },
    ],
  });

  const plan = planTsekImport(file, project);
  assert.equal(plan.rows.find(row => row.lrn === LRN_ANA)?.status, 'needs-review');
  assert.equal(plan.rows.find(row => row.lrn === LRN_MARK)?.status, 'incomplete');
  assert.equal(plan.importableScoreCount, 2);

  const imported = applyTsekImport(project, plan);
  assert.deepEqual(Object.keys(imported.quarters['2nd Quarter'].scores).sort(), ['student-juan', 'student-liza']);
});

test('extra active learners only warn, and their scores stay blank', () => {
  const project = makeProject({
    students: [
      { id: 'student-juan', lrn: LRN_JUAN, name: 'DELA CRUZ, JUAN', sex: 'Male', status: 'Active' },
      { id: 'student-ana', lrn: LRN_ANA, name: 'REYES, ANA', sex: 'Female', status: 'Active' },
      { id: 'student-mark', lrn: LRN_MARK, name: 'SANTOS, MARK', sex: 'Male', status: 'Active' },
    ],
  });
  const plan = planTsekImport(parse(), project);

  assert.equal(plan.level, 'warning');
  assert.equal(plan.blockers.length, 0);
  assert.ok(plan.warnings.some(warning => /not in the file and will stay blank/.test(warning)));
});

test('applies raw scores into the correct quarter and category column', () => {
  const project = makeProject({
    quarters: {
      ...makeProject().quarters,
      '2nd Quarter': {
        assessments: [
          { id: 'ww-1', name: 'Written Work 1', category: 'WOW', perfectScore: 20, order: 0 },
        ],
        scores: { 'student-juan': { 'ww-1': 18 } },
      },
    },
  });
  const plan = planTsekImport(parse(), project);
  const imported = applyTsekImport(project, plan);

  const quarter = imported.quarters['2nd Quarter'];
  assert.equal(quarter.assessments.length, 2);
  const created = quarter.assessments.find(assessment => assessment.externalSource?.examCode === 'EX-3UNAFD');
  assert.ok(created, 'the exam column records its TSEK exam code');
  assert.equal(created?.category, 'QSTE');
  assert.equal(created?.perfectScore, 50);
  assert.equal(created?.name, 'Quarterly Examination');

  assert.equal(quarter.scores['student-juan'][created!.id], 26);
  assert.equal(quarter.scores['student-ana'][created!.id], 41);
  assert.equal(quarter.scores['student-juan']['ww-1'], 18, 'other assessment scores are untouched');
  assert.equal(imported.lastActiveQuarter, '2nd Quarter');
  assert.equal(imported.quarters['1st Quarter'].assessments.length, 0);
});

test('re-importing the same exam updates the existing column and never duplicates it', () => {
  const project = makeProject();
  const first = applyTsekImport(project, planTsekImport(parse(), project));
  const createdId = first.quarters['2nd Quarter'].assessments[0].id;

  const secondPlan = planTsekImport(parse(), first);
  assert.equal(secondPlan.isReimport, true);
  assert.equal(secondPlan.existingAssessment?.id, createdId);
  assert.equal(secondPlan.existingScoreCount, 2);

  assert.throws(() => applyTsekImport(first, secondPlan), /already have a score/);

  const changed = parse({
    results: [
      { lrn: LRN_JUAN, pointsEarned: 40, pointsPossible: 50, manualComplete: true },
      { lrn: LRN_ANA, pointsEarned: 45, pointsPossible: 50, manualComplete: true },
    ],
  });
  const changedPlan = planTsekImport(changed, first, { overwriteExisting: true });
  const updated = applyTsekImport(first, changedPlan, { overwriteExisting: true });

  const quarter = updated.quarters['2nd Quarter'];
  assert.equal(quarter.assessments.length, 1);
  assert.equal(quarter.scores['student-juan'][createdId], 40);
  assert.equal(quarter.scores['student-ana'][createdId], 45);
});

test('blocks the same exam code from being placed in two quarters', () => {
  const project = makeProject();
  const imported = applyTsekImport(project, planTsekImport(parse(), project));

  const elsewhere = planTsekImport(parse(), imported, { quarterKey: '3rd Quarter' });
  assert.equal(elsewhere.level, 'blocked');
  assert.ok(elsewhere.blockers.some(blocker => /already imported into 2nd Quarter/.test(blocker)));
});

test('blocks a same-name column with a different perfect score', () => {
  const project = makeProject({
    quarters: {
      ...makeProject().quarters,
      '2nd Quarter': {
        assessments: [
          { id: 'qe-old', name: 'Quarterly Examination', category: 'QSTE', perfectScore: 60, order: 0 },
        ],
        scores: {},
      },
    },
  });
  const plan = planTsekImport(parse(), project);

  assert.equal(plan.level, 'blocked');
  assert.ok(plan.blockers.some(blocker => /already exists with 60 points/.test(blocker)));
});

test('blocks inconsistent possible points and empty scoring', () => {
  const inconsistent = planTsekImport(
    parse({
      results: [
        { lrn: LRN_JUAN, pointsEarned: 26, pointsPossible: 50, manualComplete: true },
        { lrn: LRN_ANA, pointsEarned: 20, pointsPossible: 40, manualComplete: true },
      ],
    }),
    makeProject()
  );
  assert.equal(inconsistent.level, 'blocked');
  assert.ok(inconsistent.blockers.some(blocker => /different possible points/.test(blocker)));

  const noScores = planTsekImport(parse({ results: [] }), makeProject());
  assert.equal(noScores.level, 'blocked');
  assert.ok(noScores.blockers.some(blocker => /no scored results|complete score/.test(blocker)));
});

test('matches LRNs even when the file spaces or dashes them', () => {
  const plan = planTsekImport(
    parse({
      learners: [
        { lrn: '1234 5678 9012', studentName: 'DELA CRUZ, JUAN' },
        { lrn: '1234-5678-9013', studentName: 'REYES, ANA' },
      ],
      results: [
        { lrn: '1234 5678 9012', pointsEarned: 26, pointsPossible: 50, manualComplete: true },
        { lrn: '1234-5678-9013', pointsEarned: 41, pointsPossible: 50, manualComplete: true },
      ],
    }),
    makeProject()
  );

  assert.equal(plan.level, 'ready');
  assert.equal(plan.matchedCount, 2);
});
