import {
  Assessment,
  GradeAdjustmentEntry,
  GradebookSnapshot,
  Project,
  QuarterData,
  Student,
  SubjectGradeExportJSON,
} from '../types';

export type RestoreMode = 'replace' | 'merge';

export interface ParsedGradebookBackup {
  file: SubjectGradeExportJSON;
  snapshot: GradebookSnapshot;
  project: Project;
}

export interface RestoreIdentityCheck {
  blockers: string[];
  warnings: string[];
}

export interface QuarterRestorePreview {
  quarterKey: string;
  isNewForCurrent: boolean;
  backupAssessments: number;
  backupFilledScores: number;
  currentAssessments: number;
  currentFilledScores: number;
}

export interface RestorePreview {
  backupStudents: number;
  matchedStudents: number;
  newStudents: number;
  missingStudents: number;
  backupFilledScores: number;
  quarters: QuarterRestorePreview[];
}

const CHECKPOINT_PREFIX = 'srphs_gradebook_restore_checkpoint_';

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeLrn(value: unknown): string {
  return String(value ?? '').trim();
}

function countFilledScores(data: QuarterData | undefined): number {
  if (!data?.scores) return 0;
  let count = 0;
  Object.values(data.scores).forEach(row => {
    Object.values(row ?? {}).forEach(score => {
      if (typeof score === 'number' && Number.isFinite(score)) count++;
    });
  });
  return count;
}

function assertQuarterData(key: string, data: unknown): asserts data is QuarterData {
  const quarter = data as QuarterData | null;
  if (!quarter || typeof quarter !== 'object') {
    throw new Error(`The backup is missing data for "${key}".`);
  }
  if (!Array.isArray(quarter.assessments)) {
    throw new Error(`The backup for "${key}" has no assessment list.`);
  }
  if (!quarter.scores || typeof quarter.scores !== 'object' || Array.isArray(quarter.scores)) {
    throw new Error(`The backup for "${key}" has no score records.`);
  }
}

/**
 * Parses a JSON exported from the teacher gradebook and requires the embedded
 * full-project snapshot that makes raw-score restore possible.
 */
export function parseGradebookBackupText(text: string): ParsedGradebookBackup {
  let parsed: SubjectGradeExportJSON;
  try {
    parsed = JSON.parse(text) as SubjectGradeExportJSON;
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The selected file is not a gradebook JSON file.');
  }
  if (parsed.exportType !== 'SRPHS_SUBJECT_GRADES') {
    throw new Error('This is not a gradebook file. Choose a JSON exported with "Export for Adviser (JSON)".');
  }
  if (!parsed.gradebookSnapshot) {
    throw new Error(
      'This file only contains final quarter grades. It was exported before gradebook snapshots were added, so it can be imported in the Adviser Portal but cannot restore raw scores here.'
    );
  }

  const snapshot = parsed.gradebookSnapshot;
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported backup version (${String(snapshot.schemaVersion)}). Update the app to restore this file.`);
  }

  const project = snapshot.project;
  if (!project || typeof project !== 'object') {
    throw new Error('The backup does not contain a gradebook.');
  }
  if (!project.subject || !project.gradeLevel || !project.section) {
    throw new Error('The backup is missing the subject, grade level, or section.');
  }
  if (!Array.isArray(project.students)) {
    throw new Error('The backup has no student roster.');
  }
  if (!project.quarters || typeof project.quarters !== 'object' || Array.isArray(project.quarters)) {
    throw new Error('The backup has no quarter records.');
  }

  Object.entries(project.quarters).forEach(([key, data]) => assertQuarterData(key, data));

  return { file: parsed, snapshot, project };
}

/**
 * Compares the backup identity with the gradebook that would receive it.
 * A different class/year is a hard blocker; a renamed subject is a warning.
 */
export function checkRestoreIdentity(current: Project, backup: Project): RestoreIdentityCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (normalizeText(current.schoolYear) !== normalizeText(backup.schoolYear)) {
    blockers.push(`School year differs: this gradebook is ${current.schoolYear || 'unset'}, the backup is ${backup.schoolYear || 'unset'}.`);
  }
  if (normalizeText(current.gradeLevel) !== normalizeText(backup.gradeLevel)) {
    blockers.push(`Grade level differs: this gradebook is ${current.gradeLevel}, the backup is ${backup.gradeLevel}.`);
  }
  if (normalizeText(current.section) !== normalizeText(backup.section)) {
    blockers.push(`Section differs: this gradebook is ${current.section}, the backup is ${backup.section}.`);
  }

  const currentUid = String(current.subjectUID ?? '').trim();
  const backupUid = String(backup.subjectUID ?? '').trim();
  const sameUid = Boolean(currentUid && backupUid && currentUid === backupUid);
  if (normalizeText(current.subject) !== normalizeText(backup.subject)) {
    if (sameUid) {
      warnings.push(`Subject name differs: this gradebook is "${current.subject}", the backup is "${backup.subject}". The Subject UID matches, so this is treated as a rename.`);
    } else {
      blockers.push(`Subject differs: this gradebook is "${current.subject}", the backup is "${backup.subject}".`);
    }
  }

  if (currentUid && backupUid && currentUid !== backupUid) {
    warnings.push(`Subject UID differs (${currentUid} vs ${backupUid}).`);
  }

  return { blockers, warnings };
}

export function buildRestorePreview(current: Project, backup: Project): RestorePreview {
  const backupLrnSet = new Set(backup.students.map(s => normalizeLrn(s.lrn)).filter(Boolean));
  const currentLrnSet = new Set(current.students.map(s => normalizeLrn(s.lrn)).filter(Boolean));

  let matchedStudents = 0;
  let newStudents = 0;
  backup.students.forEach(student => {
    const lrn = normalizeLrn(student.lrn);
    if (current.students.some(s => s.id === student.id) || (lrn && currentLrnSet.has(lrn))) {
      matchedStudents++;
    } else {
      newStudents++;
    }
  });

  const missingStudents = current.students.filter(student => {
    const lrn = normalizeLrn(student.lrn);
    return !(lrn && backupLrnSet.has(lrn)) && !backup.students.some(s => s.id === student.id);
  }).length;

  const quarters: QuarterRestorePreview[] = Object.entries(backup.quarters).map(([quarterKey, backupQuarter]) => {
    const currentQuarter = current.quarters?.[quarterKey];
    return {
      quarterKey,
      isNewForCurrent: !currentQuarter,
      backupAssessments: backupQuarter.assessments.length,
      backupFilledScores: countFilledScores(backupQuarter),
      currentAssessments: currentQuarter?.assessments.length ?? 0,
      currentFilledScores: countFilledScores(currentQuarter),
    };
  });

  return {
    backupStudents: backup.students.length,
    matchedStudents,
    newStudents,
    missingStudents,
    backupFilledScores: quarters.reduce((sum, q) => sum + q.backupFilledScores, 0),
    quarters,
  };
}

function makeUniqueId(base: string, usedIds: Set<string>): string {
  const root = base && base.trim() ? base : `restored-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let candidate = root;
  let suffix = 1;
  while (usedIds.has(candidate)) {
    candidate = `${root}-r${suffix++}`;
  }
  return candidate;
}

function remapScoreRows(
  source: Record<string, Record<string, number>> | undefined,
  studentIdMap: Map<string, string>,
  assessmentIdMap?: Map<string, string>
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  Object.entries(source ?? {}).forEach(([studentId, rows]) => {
    const mappedStudentId = studentIdMap.get(studentId);
    if (!mappedStudentId) return;
    const row: Record<string, number> = {};
    Object.entries(rows ?? {}).forEach(([assessmentId, score]) => {
      if (typeof score !== 'number' || !Number.isFinite(score)) return;
      const mappedAssessmentId = assessmentIdMap ? assessmentIdMap.get(assessmentId) : assessmentId;
      if (mappedAssessmentId) row[mappedAssessmentId] = score;
    });
    result[mappedStudentId] = row;
  });
  return result;
}

/**
 * Replace restores the backup as-is (keeping the current project id).
 * Merge adds whatever is missing from the backup and lets backup values win
 * on overlapping students/assessments, while keeping current-only data.
 */
export function applyGradebookRestore(current: Project, backup: Project, mode: RestoreMode): Project {
  if (mode === 'replace') {
    return {
      ...backup,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
  }

  const mergedStudents: Student[] = current.students.map(student => ({ ...student }));
  const studentsById = new Map(mergedStudents.map(student => [student.id, student]));
  const studentsByLrn = new Map<string, Student>();
  mergedStudents.forEach(student => {
    const lrn = normalizeLrn(student.lrn);
    if (lrn) studentsByLrn.set(lrn, student);
  });
  const usedStudentIds = new Set(mergedStudents.map(student => student.id));
  const studentIdMap = new Map<string, string>();

  backup.students.forEach(backupStudent => {
    const lrn = normalizeLrn(backupStudent.lrn);
    const match = studentsById.get(backupStudent.id) || (lrn ? studentsByLrn.get(lrn) : undefined);
    if (match) {
      studentIdMap.set(backupStudent.id, match.id);
      if (!match.lrn && backupStudent.lrn) match.lrn = backupStudent.lrn;
      if (!match.studentNumber && backupStudent.studentNumber) match.studentNumber = backupStudent.studentNumber;
      return;
    }

    const newId = makeUniqueId(backupStudent.id, usedStudentIds);
    usedStudentIds.add(newId);
    const restoredStudent: Student = { ...backupStudent, id: newId };
    mergedStudents.push(restoredStudent);
    studentsById.set(newId, restoredStudent);
    if (lrn) studentsByLrn.set(lrn, restoredStudent);
    studentIdMap.set(backupStudent.id, newId);
  });

  const mergedQuarters: Record<string, QuarterData> = { ...current.quarters };

  Object.entries(backup.quarters).forEach(([quarterKey, backupQuarter]) => {
    const currentQuarter = current.quarters?.[quarterKey];

    if (!currentQuarter) {
      mergedQuarters[quarterKey] = {
        ...backupQuarter,
        assessments: backupQuarter.assessments.map(assessment => ({ ...assessment })),
        scores: remapScoreRows(backupQuarter.scores, studentIdMap),
        reassessmentScores: backupQuarter.reassessmentScores
          ? remapScoreRows(backupQuarter.reassessmentScores, studentIdMap)
          : backupQuarter.reassessmentScores,
        adjustments: Object.entries(backupQuarter.adjustments ?? {}).reduce<Record<string, GradeAdjustmentEntry>>(
          (acc, [studentId, entry]) => {
            const mappedStudentId = studentIdMap.get(studentId);
            if (mappedStudentId) acc[mappedStudentId] = { ...entry, studentId: mappedStudentId };
            return acc;
          },
          {}
        ),
      };
      return;
    }

    const assessments: Assessment[] = currentQuarter.assessments.map(assessment => ({ ...assessment }));
    const assessmentById = new Map(assessments.map(assessment => [assessment.id, assessment]));
    const assessmentBySignature = new Map(
      assessments.map(assessment => [`${assessment.category}|${normalizeText(assessment.name)}`, assessment])
    );
    const usedAssessmentIds = new Set(assessments.map(assessment => assessment.id));
    const assessmentIdMap = new Map<string, string>();

    backupQuarter.assessments.forEach(backupAssessment => {
      const signature = `${backupAssessment.category}|${normalizeText(backupAssessment.name)}`;
      let match = assessmentById.get(backupAssessment.id) || assessmentBySignature.get(signature);
      if (!match) {
        const newId = makeUniqueId(backupAssessment.id, usedAssessmentIds);
        usedAssessmentIds.add(newId);
        const restoredAssessment: Assessment = { ...backupAssessment, id: newId };
        assessments.push(restoredAssessment);
        assessmentById.set(newId, restoredAssessment);
        assessmentBySignature.set(signature, restoredAssessment);
        match = restoredAssessment;
      }
      assessmentIdMap.set(backupAssessment.id, match.id);
    });

    const scores = { ...currentQuarter.scores };
    Object.entries(remapScoreRows(backupQuarter.scores, studentIdMap, assessmentIdMap)).forEach(
      ([studentId, rows]) => {
        scores[studentId] = { ...(scores[studentId] ?? {}), ...rows };
      }
    );

    let reassessmentScores = currentQuarter.reassessmentScores;
    if (backupQuarter.reassessmentScores) {
      reassessmentScores = { ...(currentQuarter.reassessmentScores ?? {}) };
      Object.entries(remapScoreRows(backupQuarter.reassessmentScores, studentIdMap, assessmentIdMap)).forEach(
        ([studentId, rows]) => {
          reassessmentScores![studentId] = { ...(reassessmentScores![studentId] ?? {}), ...rows };
        }
      );
    }

    const adjustments = { ...(currentQuarter.adjustments ?? {}) };
    Object.entries(backupQuarter.adjustments ?? {}).forEach(([studentId, entry]) => {
      const mappedStudentId = studentIdMap.get(studentId);
      if (mappedStudentId) adjustments[mappedStudentId] = { ...entry, studentId: mappedStudentId };
    });

    const orderedAssessments = assessments
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((assessment, index) => ({ ...assessment, order: index }));

    mergedQuarters[quarterKey] = {
      ...currentQuarter,
      assessments: orderedAssessments,
      scores,
      reassessmentScores,
      adjustmentModeEnabled: Boolean(currentQuarter.adjustmentModeEnabled || backupQuarter.adjustmentModeEnabled),
      adjustments,
    };
  });

  // Keep the backup's chronological quarter order, then append current-only quarters.
  const orderedQuarters: Record<string, QuarterData> = {};
  Object.keys(backup.quarters).forEach(quarterKey => {
    if (mergedQuarters[quarterKey]) orderedQuarters[quarterKey] = mergedQuarters[quarterKey];
  });
  Object.keys(mergedQuarters).forEach(quarterKey => {
    if (!(quarterKey in orderedQuarters)) orderedQuarters[quarterKey] = mergedQuarters[quarterKey];
  });

  return {
    ...current,
    students: mergedStudents,
    quarters: orderedQuarters,
    reassessmentSettings: current.reassessmentSettings ?? backup.reassessmentSettings,
    updatedAt: new Date().toISOString(),
  };
}

export function saveRestoreCheckpoint(project: Project): boolean {
  try {
    localStorage.setItem(`${CHECKPOINT_PREFIX}${project.id}`, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}

export function loadRestoreCheckpoint(projectId: string): Project | null {
  try {
    const raw = localStorage.getItem(`${CHECKPOINT_PREFIX}${projectId}`);
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function clearRestoreCheckpoint(projectId: string): void {
  try {
    localStorage.removeItem(`${CHECKPOINT_PREFIX}${projectId}`);
  } catch {
    // Ignore storage failures; the checkpoint is only a convenience.
  }
}
