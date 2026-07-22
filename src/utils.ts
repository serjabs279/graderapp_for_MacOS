import { Project, SubjectType } from './types';

// DepEd Order No. 8, s. 2015 Transmutation Table
export function transmuteGrade(initialGrade: number): number {
  const rounded = Math.round(initialGrade * 100) / 100;
  if (rounded >= 100) return 100;
  if (rounded >= 98.4) return 99;
  if (rounded >= 96.8) return 98;
  if (rounded >= 95.2) return 97;
  if (rounded >= 93.6) return 96;
  if (rounded >= 92.0) return 95;
  if (rounded >= 90.4) return 94;
  if (rounded >= 88.8) return 93;
  if (rounded >= 87.2) return 92;
  if (rounded >= 85.6) return 91;
  if (rounded >= 84.0) return 90;
  if (rounded >= 82.4) return 89;
  if (rounded >= 80.8) return 88;
  if (rounded >= 79.2) return 87;
  if (rounded >= 77.6) return 86;
  if (rounded >= 76.0) return 85;
  if (rounded >= 74.4) return 84;
  if (rounded >= 72.8) return 83;
  if (rounded >= 71.2) return 82;
  if (rounded >= 69.6) return 81;
  if (rounded >= 68.0) return 80;
  if (rounded >= 66.4) return 79;
  if (rounded >= 64.8) return 78;
  if (rounded >= 63.2) return 77;
  if (rounded >= 61.6) return 76;
  if (rounded >= 60.0) return 75;
  if (rounded >= 56.0) return 74;
  if (rounded >= 52.0) return 73;
  if (rounded >= 48.0) return 72;
  if (rounded >= 44.0) return 71;
  if (rounded >= 40.0) return 70;
  if (rounded >= 36.0) return 69;
  if (rounded >= 32.0) return 68;
  if (rounded >= 28.0) return 67;
  if (rounded >= 24.0) return 66;
  if (rounded >= 20.0) return 65;
  if (rounded >= 16.0) return 64;
  if (rounded >= 12.0) return 63;
  if (rounded >= 8.0) return 62;
  if (rounded >= 4.68) return 61;
  return 60;
}

// DepEd MATATAG SY 2027-2028 Adjusted Transmutation Table (Table 4)
export function transmuteGrade2027(initialGrade: number): number {
  const rounded = Math.round(initialGrade * 100) / 100;
  
  if (rounded >= 99.50) return 100;
  if (rounded >= 98.32) return 99;
  if (rounded >= 97.14) return 98;
  if (rounded >= 95.96) return 97;
  if (rounded >= 94.78) return 96;
  if (rounded >= 93.60) return 95;
  if (rounded >= 92.42) return 94;
  if (rounded >= 91.24) return 93;
  if (rounded >= 90.06) return 92;
  if (rounded >= 88.88) return 91;
  if (rounded >= 87.70) return 90;
  if (rounded >= 86.52) return 89;
  if (rounded >= 85.34) return 88;
  if (rounded >= 84.16) return 87;
  if (rounded >= 82.98) return 86;
  if (rounded >= 81.80) return 85;
  if (rounded >= 80.62) return 84;
  if (rounded >= 79.44) return 83;
  if (rounded >= 78.26) return 82;
  if (rounded >= 77.08) return 81;
  if (rounded >= 75.90) return 80;
  if (rounded >= 74.72) return 79;
  if (rounded >= 73.54) return 78;
  if (rounded >= 72.36) return 77;
  if (rounded >= 71.18) return 76;
  if (rounded >= 70.00) return 75;
  if (rounded >= 65.34) return 74;
  if (rounded >= 60.67) return 73;
  if (rounded >= 56.01) return 72;
  if (rounded >= 51.34) return 71;
  if (rounded >= 46.67) return 70;
  if (rounded >= 42.01) return 69;
  if (rounded >= 37.34) return 68;
  if (rounded >= 32.68) return 67;
  if (rounded >= 28.01) return 66;
  if (rounded >= 23.35) return 65;
  if (rounded >= 18.68) return 64;
  if (rounded >= 14.01) return 63;
  if (rounded >= 9.35) return 62;
  if (rounded >= 4.68) return 61;
  return 60;
}


export interface SHSProfile {
  id: string;
  name: string;
  ww: number;
  pt: number;
  qa: number;
}

export const SHS_PROFILES: SHSProfile[] = [
  { id: 'profile-1', name: 'Profile 1: Core Subjects & Academic Electives (WW: 20%, PT: 50%, Exam: 30%)', ww: 0.20, pt: 0.50, qa: 0.30 },
  { id: 'profile-2', name: 'Profile 2: Field Exposure, Arts Apprenticeship, Creative Production & Innovation (WW: 15%, PT: 70%, Exam: 15%)', ww: 0.15, pt: 0.70, qa: 0.15 },
  { id: 'profile-3', name: 'Profile 3: Arts, Sports, Health & Wellness Electives (WW: 20%, PT: 60%, Exam: 20%)', ww: 0.20, pt: 0.60, qa: 0.20 },
  { id: 'profile-4', name: 'Profile 4: Research Electives, Design & Innovation (WW: 40%, PT: 60%, Exam: 0%)', ww: 0.40, pt: 0.60, qa: 0.00 },
  { id: 'profile-5', name: 'Profile 5: TechPro Electives (WW: 15%, PT: 65%, Exam: 20%)', ww: 0.15, pt: 0.65, qa: 0.20 },
  { id: 'profile-6', name: 'Profile 6: Work Immersion (WW: 20%, PT: 80%, Exam: 0%)', ww: 0.20, pt: 0.80, qa: 0.00 }
];

export const SUBJECT_DEFAULTS: Record<SubjectType, { ww: number; pt: number; qa: number }> = {
  English: { ww: 0.30, pt: 0.50, qa: 0.20 },
  Filipino: { ww: 0.30, pt: 0.50, qa: 0.20 },
  Mathematics: { ww: 0.40, pt: 0.40, qa: 0.20 },
  Science: { ww: 0.40, pt: 0.40, qa: 0.20 },
  AP: { ww: 0.30, pt: 0.50, qa: 0.20 },
  'Values Education': { ww: 0.30, pt: 0.50, qa: 0.20 },
  MAPEH: { ww: 0.20, pt: 0.60, qa: 0.20 },
  TLE: { ww: 0.20, pt: 0.60, qa: 0.20 }
};

export function getSubjectWeightsLabel(type: SubjectType, customWeights?: Record<SubjectType, { ww: number; pt: number; qa: number }>) {
  const w = (customWeights && customWeights[type]) || SUBJECT_DEFAULTS[type] || { ww: 0.30, pt: 0.50, qa: 0.20 };
  return `Written Works (${Math.round(w.ww * 100)}%) / Performance Tasks (${Math.round(w.pt * 100)}%) / Quarterly Exam (${Math.round(w.qa * 100)}%)`;
}

// Compute complete grade metrics for a student inside a Project
export function computeProjectStudentGrade(project: Project, studentId: string) {
  const wwAssessments = project.assessments.filter(a => a.category === 'WW');
  const ptAssessments = project.assessments.filter(a => a.category === 'PT');
  const qeAssessments = project.assessments.filter(a => a.category === 'QE');

  const studentScores = project.scores[studentId] || {};

  // Compute Written Works raw percentages
  let wwRawSum = 0;
  let wwMaxSum = 0;
  let wwGradesCount = 0;
  wwAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      wwRawSum += score;
      wwMaxSum += a.perfectScore;
      wwGradesCount++;
    }
  });
  const wwPercentage = wwMaxSum > 0 ? (wwRawSum / wwMaxSum) * 100 : 0;

  // Compute Performance Tasks raw percentages
  let ptRawSum = 0;
  let ptMaxSum = 0;
  let ptGradesCount = 0;
  ptAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      ptRawSum += score;
      ptMaxSum += a.perfectScore;
      ptGradesCount++;
    }
  });
  const ptPercentage = ptMaxSum > 0 ? (ptRawSum / ptMaxSum) * 100 : 0;

  // Compute Quarterly Exam raw percentages
  let qeRawSum = 0;
  let qeMaxSum = 0;
  let qeGradesCount = 0;
  qeAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      qeRawSum += score;
      qeMaxSum += a.perfectScore;
      qeGradesCount++;
    }
  });
  const qePercentage = qeMaxSum > 0 ? (qeRawSum / qeMaxSum) * 100 : 0;

  // Determine actual weights (from custom weights, defaults, or SHS profiles)
  let weights = { ww: 0.30, pt: 0.50, qa: 0.20 };
  if (project.workspace === 'SHS') {
    const shsProfile = SHS_PROFILES.find(p => p.id === project.assessmentProfileId);
    if (shsProfile) {
      weights = { ww: shsProfile.ww, pt: shsProfile.pt, qa: shsProfile.qa };
    }
  } else {
    weights = SUBJECT_DEFAULTS[project.subject as SubjectType] || { ww: 0.30, pt: 0.50, qa: 0.20 };
  }

  const weightedWW = wwPercentage * weights.ww;
  const weightedPT = ptPercentage * weights.pt;
  const weightedQA = qePercentage * weights.qa;

  const initialGrade = weightedWW + weightedPT + weightedQA;
  
  // 0-Based vs Adjusted Transmutation Grade depending on active project depedPolicy
  const finalGrade = project.depedPolicy === '2015'
    ? Math.round(initialGrade)
    : transmuteGrade2027(initialGrade);

  const isPassing = finalGrade >= project.passingGrade;
  const remarks = isPassing ? "Passed" : "Needs Intervention";

  // Check if student has entered any marks
  const hasScores = (wwGradesCount > 0 || ptGradesCount > 0 || qeGradesCount > 0);

  return {
    wwRawSum,
    wwMaxSum,
    wwPercentage: Math.round(wwPercentage * 100) / 100,
    weightedWW: Math.round(weightedWW * 100) / 100,

    ptRawSum,
    ptMaxSum,
    ptPercentage: Math.round(ptPercentage * 100) / 100,
    weightedPT: Math.round(weightedPT * 100) / 100,

    qeRawSum,
    qeMaxSum,
    qePercentage: Math.round(qePercentage * 100) / 100,
    weightedQA: Math.round(weightedQA * 100) / 100,

    initialGrade: Math.round(initialGrade * 100) / 100,
    finalGrade,
    remarks,
    isPassing,
    hasScores
  };
}
