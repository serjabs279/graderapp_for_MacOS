import { Assessment, Project, QuarterData, Student } from '../types';

/**
 * Importer for TSEK's "GradeApp scores" export (SRPHS_EXAM_SCORES v1.0).
 *
 * Design rules:
 * - LRNs decide whether the file belongs to this section. Any learner in the
 *   file that is not in the gradebook blocks the whole import.
 * - Grade level and section must match; subject / school year only warn.
 * - Only raw points are imported. TSEK's transmuted grade is ignored.
 * - Learners without a result, or with incomplete/review-flagged results, are
 *   left blank instead of being scored as zero.
 */

export const TSEK_SCORES_EXPORT_TYPE = 'SRPHS_EXAM_SCORES';
export const SUPPORTED_TSEK_SCORE_VERSIONS = ['1.0'];

export type TsekCategoryShort = 'WW' | 'PT' | 'QE';
export type GradebookCategory = 'WOW' | 'PPT' | 'QSTE';

const CATEGORY_MAP: Record<TsekCategoryShort, GradebookCategory> = {
  WW: 'WOW',
  PT: 'PPT',
  QE: 'QSTE',
};

export interface TsekLearnerEntry {
  lrn: string;
  studentName: string;
  status?: string;
}

export interface TsekResultEntry {
  lrn: string;
  studentName: string;
  pointsEarned: number | null;
  pointsPossible: number | null;
  writtenPointsPossible: number;
  writtenPointsEarned: number;
  manualScored: number;
  manualCount: number;
  manualComplete: boolean;
  needsReview: boolean;
}

export interface TsekScoresFile {
  version: string;
  exportType: typeof TSEK_SCORES_EXPORT_TYPE;
  exportTimestamp: string;
  source: string;
  subjectUID: string;
  subjectName: string;
  schoolYear: string;
  gradeLevel: string;
  section: string;
  teacherName: string;
  workspace: 'JHS' | 'SHS' | '';
  quarterKey: string;
  category: TsekCategoryShort;
  categoryLabel: string;
  assessmentName: string;
  examCode: string;
  totalPoints: number;
  learners: TsekLearnerEntry[];
  results: TsekResultEntry[];
}

export type TsekCheckState = 'match' | 'mismatch' | 'missing';

export interface TsekFieldCheck {
  key: 'gradeLevel' | 'section' | 'subject' | 'schoolYear';
  label: string;
  gradebook: string;
  file: string;
  state: TsekCheckState;
}

export type TsekRowStatus =
  | 'score'
  | 'missing-result'
  | 'needs-review'
  | 'incomplete'
  | 'invalid'
  | 'unmatched';

export interface TsekStudentRow {
  lrn: string;
  studentId?: string;
  name: string;
  score: number | null;
  possible: number;
  status: TsekRowStatus;
  note: string;
}

export type TsekImportLevel = 'ready' | 'warning' | 'blocked';

export interface TsekImportPlan {
  file: TsekScoresFile;
  quarterKey: string;
  category: GradebookCategory;
  categoryLabel: string;
  assessmentName: string;
  perfectScore: number;
  checks: TsekFieldCheck[];
  rosterCount: number;
  matchedCount: number;
  unknownLrns: string[];
  extraActiveLrns: string[];
  missingResultCount: number;
  rows: TsekStudentRow[];
  existingAssessment: Assessment | null;
  existingScoreCount: number;
  importableScoreCount: number;
  blockers: string[];
  warnings: string[];
  level: TsekImportLevel;
  confirmPhrase: string;
  isReimport: boolean;
}

export interface TsekPlanOptions {
  quarterKey?: string;
  overwriteExisting?: boolean;
}

export interface TsekApplyOptions {
  overwriteExisting?: boolean;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** LRNs are compared as digits/letters only, without spaces or dashes. */
export function normalizeLrn(value: unknown): string {
  return text(value).replace(/[\s-]+/g, '');
}

/** Section / name comparison ignores punctuation, case, and extra spaces. */
export function normalizeLabel(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** "Grade 10" and "10" are the same level. */
export function normalizeGradeLevel(value: unknown): string {
  return normalizeLabel(value).replace(/\bgrade\b/g, '').replace(/\s+/g, '');
}

function subjectMatches(gradebook: string, file: string): boolean {
  const a = normalizeLabel(gradebook).replace(/\s+/g, '');
  const b = normalizeLabel(file).replace(/\s+/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.startsWith(short);
}

function parseLearner(raw: unknown, index: number): TsekLearnerEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Learner #${index + 1} in the file is malformed.`);
  }
  const entry = raw as Record<string, unknown>;
  const lrn = normalizeLrn(entry.lrn);
  if (!lrn) {
    throw new Error(`Learner #${index + 1} in the file has no LRN.`);
  }
  return {
    lrn,
    studentName: text(entry.studentName) || text(entry.name) || lrn,
    status: text(entry.status) || 'Active',
  };
}

function parseResult(raw: unknown, index: number): TsekResultEntry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Result #${index + 1} in the file is malformed.`);
  }
  const entry = raw as Record<string, unknown>;
  const lrn = normalizeLrn(entry.lrn);
  if (!lrn) {
    throw new Error(`Result #${index + 1} in the file has no LRN.`);
  }
  return {
    lrn,
    studentName: text(entry.studentName) || lrn,
    pointsEarned: numberOrNull(entry.pointsEarned),
    pointsPossible: numberOrNull(entry.pointsPossible),
    writtenPointsPossible: numberOrNull(entry.writtenPointsPossible) ?? 0,
    writtenPointsEarned: numberOrNull(entry.writtenPointsEarned) ?? 0,
    manualScored: numberOrNull(entry.manualScored) ?? 0,
    manualCount: numberOrNull(entry.manualCount) ?? 0,
    manualComplete: entry.manualComplete !== false,
    needsReview: entry.needsReview === true,
  };
}

/**
 * Parses and structurally validates a TSEK score file. Business-rule checks
 * (section match, LRN match, skipped rows) happen in planTsekImport.
 */
export function parseTsekScores(textValue: string): TsekScoresFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textValue);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The selected file is not a TSEK exam score file.');
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.exportType !== TSEK_SCORES_EXPORT_TYPE) {
    throw new Error(
      'This is not a TSEK exam score file. In TSEK, use "Export GradeApp scores" (SRPHS_EXAM_SCORES) and try again.'
    );
  }

  const version = text(obj.version);
  if (!SUPPORTED_TSEK_SCORE_VERSIONS.includes(version)) {
    throw new Error(
      `Unsupported TSEK score version "${version || 'missing'}". This app supports: ${SUPPORTED_TSEK_SCORE_VERSIONS.join(', ')}.`
    );
  }

  const requiredFields = [
    'subjectName',
    'gradeLevel',
    'section',
    'schoolYear',
    'quarterKey',
    'assessmentName',
    'examCode',
  ] as const;
  for (const field of requiredFields) {
    if (!text(obj[field])) {
      throw new Error(`The TSEK file is missing "${field}". Re-export it from TSEK.`);
    }
  }

  const category = text(obj.category).toUpperCase() as TsekCategoryShort;
  if (!(category in CATEGORY_MAP)) {
    throw new Error(`Unknown TSEK category "${text(obj.category)}". Expected WW, PT, or QE.`);
  }

  if (!Array.isArray(obj.learners) || obj.learners.length === 0) {
    throw new Error('The TSEK file has no learner roster.');
  }
  if (!Array.isArray(obj.results)) {
    throw new Error('The TSEK file has no results list.');
  }

  const workspace = text(obj.workspace).toUpperCase();
  return {
    version,
    exportType: TSEK_SCORES_EXPORT_TYPE,
    exportTimestamp: text(obj.exportTimestamp),
    source: text(obj.source),
    subjectUID: text(obj.subjectUID) || 'N/A',
    subjectName: text(obj.subjectName),
    schoolYear: text(obj.schoolYear),
    gradeLevel: text(obj.gradeLevel),
    section: text(obj.section),
    teacherName: text(obj.teacherName),
    workspace: workspace === 'SHS' ? 'SHS' : workspace === 'JHS' ? 'JHS' : '',
    quarterKey: text(obj.quarterKey),
    category,
    categoryLabel: text(obj.categoryLabel) || category,
    assessmentName: text(obj.assessmentName),
    examCode: text(obj.examCode),
    totalPoints: numberOrNull(obj.totalPoints) ?? 0,
    learners: obj.learners.map(parseLearner),
    results: obj.results.map(parseResult),
  };
}

interface FieldCheckInput {
  key: TsekFieldCheck['key'];
  label: string;
  gradebook: string;
  file: string;
  matches: boolean;
  severity: 'block' | 'warn';
  mismatchMessage: string;
  checks: TsekFieldCheck[];
  blockers: string[];
  warnings: string[];
}

function addFieldCheck(input: FieldCheckInput): void {
  const gradebook = text(input.gradebook);
  const file = text(input.file);
  const state: TsekCheckState =
    !gradebook || !file ? 'missing' : input.matches ? 'match' : 'mismatch';

  input.checks.push({
    key: input.key,
    label: input.label,
    gradebook: gradebook || 'Not recorded',
    file: file || 'Not recorded',
    state,
  });

  if (state === 'mismatch') {
    if (input.severity === 'block') input.blockers.push(input.mismatchMessage);
    else input.warnings.push(input.mismatchMessage);
  }
}

function buildRow(
  learner: TsekLearnerEntry,
  result: TsekResultEntry | undefined,
  student: Student | undefined,
  perfectScore: number
): TsekStudentRow {
  const possible = result?.pointsPossible && result.pointsPossible > 0
    ? result.pointsPossible
    : perfectScore;

  if (!student) {
    return {
      lrn: learner.lrn,
      name: learner.studentName,
      score: null,
      possible,
      status: 'unmatched',
      note: 'Not in this gradebook.',
    };
  }

  if (!result) {
    return {
      lrn: learner.lrn,
      studentId: student.id,
      name: student.name || learner.studentName,
      score: null,
      possible,
      status: 'missing-result',
      note: 'No result in the file; left blank.',
    };
  }

  if (result.needsReview) {
    return {
      lrn: learner.lrn,
      studentId: student.id,
      name: student.name || learner.studentName,
      score: null,
      possible,
      status: 'needs-review',
      note: 'Flagged for review in TSEK; skipped.',
    };
  }

  if (!result.manualComplete || result.manualScored < result.manualCount) {
    return {
      lrn: learner.lrn,
      studentId: student.id,
      name: student.name || learner.studentName,
      score: null,
      possible,
      status: 'incomplete',
      note: 'Written scores are incomplete; skipped.',
    };
  }

  const earned = result.pointsEarned;
  if (earned === null || earned < 0 || !Number.isFinite(possible) || possible <= 0 || earned > possible) {
    return {
      lrn: learner.lrn,
      studentId: student.id,
      name: student.name || learner.studentName,
      score: null,
      possible,
      status: 'invalid',
      note: 'Score is missing or outside 0 – possible points; skipped.',
    };
  }

  return {
    lrn: learner.lrn,
    studentId: student.id,
    name: student.name || learner.studentName,
    score: earned,
    possible,
    status: 'score',
    note: result.writtenPointsPossible > 0
      ? `Scanned ${Math.max(0, earned - result.writtenPointsEarned)} + written ${result.writtenPointsEarned}.`
      : '',
  };
}

/**
 * Plans an import without mutating anything. The UI renders this plan, and
 * only then calls applyTsekImport.
 */
export function planTsekImport(
  file: TsekScoresFile,
  project: Project,
  options: TsekPlanOptions = {}
): TsekImportPlan {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: TsekFieldCheck[] = [];

  const quarterKeys = Object.keys(project.quarters ?? {});
  const preferredQuarter = text(options.quarterKey) || file.quarterKey;
  const quarterKey = quarterKeys.includes(preferredQuarter)
    ? preferredQuarter
    : project.lastActiveQuarter && quarterKeys.includes(project.lastActiveQuarter)
      ? project.lastActiveQuarter
      : quarterKeys[0] ?? '';

  if (!quarterKey) {
    blockers.push('This gradebook has no quarters, so there is nowhere to put the scores.');
  }

  addFieldCheck({
    key: 'gradeLevel',
    label: 'Grade level',
    gradebook: project.gradeLevel,
    file: file.gradeLevel,
    matches: normalizeGradeLevel(project.gradeLevel) === normalizeGradeLevel(file.gradeLevel),
    severity: 'block',
    mismatchMessage: `Grade level mismatch: this gradebook is "${project.gradeLevel}", but the file says "${file.gradeLevel}".`,
    checks,
    blockers,
    warnings,
  });

  addFieldCheck({
    key: 'section',
    label: 'Section',
    gradebook: project.section,
    file: file.section,
    matches: normalizeLabel(project.section) === normalizeLabel(file.section),
    severity: 'block',
    mismatchMessage: `Wrong section: this gradebook is "${project.section}", but the file says "${file.section}". The import was stopped.`,
    checks,
    blockers,
    warnings,
  });

  addFieldCheck({
    key: 'subject',
    label: 'Subject',
    gradebook: project.subject,
    file: file.subjectName,
    matches: subjectMatches(project.subject, file.subjectName),
    severity: 'warn',
    mismatchMessage: `Subject differs: this gradebook is "${project.subject}", but the file says "${file.subjectName}". Check that you are importing into the right subject.`,
    checks,
    blockers,
    warnings,
  });

  addFieldCheck({
    key: 'schoolYear',
    label: 'School year',
    gradebook: project.schoolYear,
    file: file.schoolYear,
    matches: normalizeLabel(project.schoolYear) === normalizeLabel(file.schoolYear),
    severity: 'warn',
    mismatchMessage: `School year differs: this gradebook is "${project.schoolYear}", but the file says "${file.schoolYear}".`,
    checks,
    blockers,
    warnings,
  });

  if (file.workspace && project.workspace && file.workspace !== project.workspace) {
    warnings.push(
      `The file was made in the ${file.workspace} workspace, but this gradebook is ${project.workspace}.`
    );
  }

  const category = CATEGORY_MAP[file.category];

  // One exam must have a single possible-points value; otherwise the scores
  // are not comparable inside one assessment column.
  const possibleScores = file.results
    .map(r => r.pointsPossible)
    .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);
  const uniquePossible = Array.from(new Set(possibleScores));
  if (uniquePossible.length === 0) {
    blockers.push('The file contains no scored results, so there is nothing to import.');
  } else if (uniquePossible.length > 1) {
    blockers.push(
      `The results use different possible points (${uniquePossible.join(', ')}). Re-export the exam so every learner has the same total.`
    );
  }
  const perfectScore = uniquePossible[0] ?? file.totalPoints;

  const projectByLrn = new Map<string, Student>();
  project.students.forEach(student => {
    const key = normalizeLrn(student.lrn);
    if (key) projectByLrn.set(key, student);
  });

  const fileLrnSet = new Set<string>();
  const duplicateFileLrns: string[] = [];
  file.learners.forEach(learner => {
    if (fileLrnSet.has(learner.lrn)) duplicateFileLrns.push(learner.lrn);
    else fileLrnSet.add(learner.lrn);
  });
  if (duplicateFileLrns.length > 0) {
    blockers.push(`The file lists the same LRN more than once: ${duplicateFileLrns.slice(0, 5).join(', ')}.`);
  }

  const unknownLrns = file.learners
    .filter(learner => !projectByLrn.has(learner.lrn))
    .map(learner => `${learner.studentName} (${learner.lrn})`);
  if (unknownLrns.length > 0) {
    blockers.push(
      `This file has ${unknownLrns.length} learner(s) who are not in this gradebook: ${unknownLrns.slice(0, 5).join(', ')}${unknownLrns.length > 5 ? ', …' : ''}. This looks like a different section, so nothing was imported.`
    );
  }

  const extraActiveLrns = project.students
    .filter(student => (student.status ?? 'Active') === 'Active' && !fileLrnSet.has(normalizeLrn(student.lrn)))
    .map(student => `${student.name} (${student.lrn})`);
  if (extraActiveLrns.length > 0 && extraActiveLrns.length < project.students.length) {
    warnings.push(
      `${extraActiveLrns.length} active learner(s) in this gradebook are not in the file and will stay blank: ${extraActiveLrns.slice(0, 5).join(', ')}${extraActiveLrns.length > 5 ? ', …' : ''}.`
    );
  }

  const resultByLrn = new Map<string, TsekResultEntry>();
  const duplicateResultLrns: string[] = [];
  file.results.forEach(result => {
    if (resultByLrn.has(result.lrn)) duplicateResultLrns.push(result.lrn);
    else resultByLrn.set(result.lrn, result);
  });
  if (duplicateResultLrns.length > 0) {
    blockers.push(`The file has more than one result for: ${duplicateResultLrns.slice(0, 5).join(', ')}.`);
  }

  const rows = file.learners.map(learner =>
    buildRow(learner, resultByLrn.get(learner.lrn), projectByLrn.get(learner.lrn), perfectScore)
  );

  const missingResultCount = rows.filter(row => row.status === 'missing-result').length;
  if (missingResultCount > 0) {
    warnings.push(`${missingResultCount} learner(s) have no result in the file and will be left blank, not zero.`);
  }
  const reviewCount = rows.filter(row => row.status === 'needs-review').length;
  if (reviewCount > 0) {
    warnings.push(`${reviewCount} learner(s) were flagged for review in TSEK and will be skipped.`);
  }
  const incompleteCount = rows.filter(row => row.status === 'incomplete').length;
  if (incompleteCount > 0) {
    warnings.push(`${incompleteCount} learner(s) have incomplete written scores and will be skipped.`);
  }
  const invalidCount = rows.filter(row => row.status === 'invalid').length;
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} learner(s) have a score outside the allowed range and will be skipped.`);
  }

  const quarter: QuarterData | undefined = quarterKey ? project.quarters[quarterKey] : undefined;
  let existingAssessment: Assessment | null = null;
  let isReimport = false;

  if (quarter) {
    const byCode = quarter.assessments.find(
      assessment => assessment.externalSource?.examCode === file.examCode
    );
    if (byCode) {
      existingAssessment = byCode;
      isReimport = true;
    } else {
      const usedInAnotherQuarter = Object.entries(project.quarters).find(
        ([key, data]) =>
          key !== quarterKey &&
          data.assessments.some(assessment => assessment.externalSource?.examCode === file.examCode)
      );
      if (usedInAnotherQuarter) {
        blockers.push(
          `This exam (${file.examCode}) was already imported into ${usedInAnotherQuarter[0]}. Choose that quarter instead of importing it twice.`
        );
      }

      const byName = quarter.assessments.find(
        assessment =>
          assessment.category === category &&
          normalizeLabel(assessment.name) === normalizeLabel(file.assessmentName)
      );
      if (byName) {
        if (byName.externalSource && byName.externalSource.examCode !== file.examCode) {
          blockers.push(
            `"${byName.name}" already belongs to exam ${byName.externalSource.examCode}. Rename the existing assessment before importing ${file.examCode}.`
          );
        } else if (byName.perfectScore !== perfectScore) {
          blockers.push(
            `"${byName.name}" already exists with ${byName.perfectScore} points, but this file totals ${perfectScore}. Rename one of them or correct the perfect score first.`
          );
        } else {
          existingAssessment = byName;
        }
      }
    }

    if (existingAssessment && existingAssessment.perfectScore !== perfectScore) {
      warnings.push(
        `This re-import changes "${existingAssessment.name}" from ${existingAssessment.perfectScore} to ${perfectScore} points.`
      );
    }
  }

  const existingScoreCount = existingAssessment
    ? rows.filter(row => {
        if (row.status !== 'score' || !row.studentId) return false;
        return quarter?.scores[row.studentId]?.[existingAssessment!.id] !== undefined;
      }).length
    : 0;

  const importableScoreCount = rows.filter(row => row.status === 'score').length;
  if (importableScoreCount === 0 && blockers.length === 0) {
    blockers.push('No learner in this file has a complete score to import.');
  }

  if (options.overwriteExisting && existingScoreCount > 0) {
    warnings.push(`${existingScoreCount} existing score(s) will be overwritten.`);
  }

  const level: TsekImportLevel =
    blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready';

  return {
    file,
    quarterKey,
    category,
    categoryLabel: file.categoryLabel,
    assessmentName: existingAssessment?.name ?? file.assessmentName,
    perfectScore,
    checks,
    rosterCount: file.learners.length,
    matchedCount: file.learners.length - unknownLrns.length,
    unknownLrns,
    extraActiveLrns,
    missingResultCount,
    rows,
    existingAssessment,
    existingScoreCount,
    importableScoreCount,
    blockers,
    warnings,
    level,
    confirmPhrase: text(file.section).replace(/\s+/g, ' ').toUpperCase() || 'IMPORT',
    isReimport,
  };
}

function uniqueAssessmentId(assessments: Assessment[], base: string): string {
  let id = base;
  let suffix = 2;
  while (assessments.some(assessment => assessment.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

/**
 * Applies a planned import. Blocked plans throw, so a caller cannot bypass the
 * section/LRN checks by mistake.
 */
export function applyTsekImport(
  project: Project,
  plan: TsekImportPlan,
  options: TsekApplyOptions = {}
): Project {
  if (plan.level === 'blocked') {
    throw new Error(plan.blockers[0] || 'This file cannot be imported into this gradebook.');
  }

  const quarter = project.quarters[plan.quarterKey];
  if (!quarter) {
    throw new Error(`The quarter "${plan.quarterKey}" no longer exists.`);
  }

  const importedAt = new Date().toISOString();
  let assessments = quarter.assessments.map(assessment => ({ ...assessment }));
  let assessmentId: string;

  if (plan.existingAssessment) {
    assessmentId = plan.existingAssessment.id;
    assessments = assessments.map(assessment =>
      assessment.id === assessmentId
        ? {
            ...assessment,
            perfectScore: plan.perfectScore,
            externalSource: {
              app: 'tsek' as const,
              examCode: plan.file.examCode,
              exportTimestamp: plan.file.exportTimestamp,
              importedAt,
            },
          }
        : assessment
    );
  } else {
    const safeCode = plan.file.examCode.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'exam';
    const safeQuarter = plan.quarterKey.replace(/[^a-z0-9]/gi, '');
    assessmentId = uniqueAssessmentId(assessments, `ass-tsek-${safeCode}-${safeQuarter}`);
    const maxOrder = assessments.length > 0
      ? Math.max(...assessments.map(assessment => assessment.order))
      : -1;
    assessments.push({
      id: assessmentId,
      name: plan.assessmentName,
      category: plan.category,
      perfectScore: plan.perfectScore,
      order: maxOrder + 1,
      date: importedAt.split('T')[0],
      externalSource: {
        app: 'tsek',
        examCode: plan.file.examCode,
        exportTimestamp: plan.file.exportTimestamp,
        importedAt,
      },
    });

    const rank: Record<Assessment['category'], number> = { WOW: 0, PPT: 1, QSTE: 2 };
    assessments = assessments
      .sort((a, b) => (rank[a.category] - rank[b.category]) || (a.order - b.order))
      .map((assessment, index) => ({ ...assessment, order: index }));
  }

  const scores: Record<string, Record<string, number>> = { ...quarter.scores };
  const overwrite = options.overwriteExisting === true;
  let written = 0;
  const skipped: string[] = [];

  plan.rows.forEach(row => {
    if (row.status !== 'score' || !row.studentId || row.score === null) return;
    const current = scores[row.studentId]?.[assessmentId];
    if (current !== undefined && !overwrite) {
      skipped.push(row.name);
      return;
    }
    scores[row.studentId] = {
      ...(scores[row.studentId] ?? {}),
      [assessmentId]: row.score,
    };
    written += 1;
  });

  if (written === 0) {
    throw new Error(
      skipped.length > 0
        ? `All ${skipped.length} learner(s) with a score in this file already have a score for this exam. Turn on "Overwrite existing scores" to replace them.`
        : 'No learner in this file had a complete score to write.'
    );
  }

  return {
    ...project,
    quarters: {
      ...project.quarters,
      [plan.quarterKey]: {
        ...quarter,
        assessments,
        scores,
      },
    },
    lastActiveQuarter: plan.quarterKey,
  };
}
