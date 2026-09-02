import { getCalendar, getFirstPeriod } from './calendar/academicCalendar';
import { Project, SubjectType, SubjectWeight, Student, Assessment, QuarterData, LearnerObservedValues } from './types';

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
  if (rounded >= 97.50) return 99;
  if (rounded >= 96.00) return 98;
  if (rounded >= 95.00) return 97;
  if (rounded >= 94.00) return 96;
  if (rounded >= 93.00) return 95;
  if (rounded >= 92.00) return 94;
  if (rounded >= 91.00) return 93;
  if (rounded >= 90.00) return 92;
  if (rounded >= 89.00) return 91;
  if (rounded >= 88.00) return 90;
  if (rounded >= 87.00) return 89;
  if (rounded >= 86.00) return 88;
  if (rounded >= 85.00) return 87;
  if (rounded >= 84.00) return 86;
  if (rounded >= 83.00) return 85;
  if (rounded >= 82.00) return 84;
  if (rounded >= 81.00) return 83;
  if (rounded >= 80.00) return 82;
  if (rounded >= 79.00) return 81;
  if (rounded >= 78.00) return 80;
  if (rounded >= 77.00) return 79;
  if (rounded >= 76.00) return 78;
  if (rounded >= 75.00) return 77;
  if (rounded >= 73.00) return 76;
  if (rounded >= 70.00) return 75;
  if (rounded >= 68.00) return 74;
  if (rounded >= 66.00) return 73;
  if (rounded >= 64.00) return 72;
  if (rounded >= 62.00) return 71;
  if (rounded >= 60.00) return 70;
  if (rounded >= 58.00) return 69;
  if (rounded >= 56.00) return 68;
  if (rounded >= 54.00) return 67;
  if (rounded >= 52.00) return 66;
  if (rounded >= 50.00) return 65;
  if (rounded >= 48.00) return 64;
  if (rounded >= 46.00) return 63;
  if (rounded >= 43.00) return 62;
  if (rounded >= 40.00) return 61;
  return 60;
}


export interface SHSProfile {
  id: string;
  name: string;
  wow: number;
  ppt: number;
  qste: number;
}

export const SHS_PROFILES: SHSProfile[] = [
  { id: 'profile-1', name: 'Profile 1: Core Subjects & Academic Electives (WOW: 20%, PPT: 50%, Exam: 30%)', wow: 0.20, ppt: 0.50, qste: 0.30 },
  { id: 'profile-2', name: 'Profile 2: Field Exposure, Arts Apprenticeship, Creative Production & Innovation (WOW: 15%, PPT: 70%, Exam: 15%)', wow: 0.15, ppt: 0.70, qste: 0.15 },
  { id: 'profile-3', name: 'Profile 3: Arts, Sports, Health & Wellness Electives (WOW: 20%, PPT: 60%, Exam: 20%)', wow: 0.20, ppt: 0.60, qste: 0.20 },
  { id: 'profile-4', name: 'Profile 4: Research Electives, Design & Innovation (WOW: 40%, PPT: 60%, Exam: 0%)', wow: 0.40, ppt: 0.60, qste: 0.00 },
  { id: 'profile-5', name: 'Profile 5: TechPro Electives (WOW: 15%, PPT: 65%, Exam: 20%)', wow: 0.15, ppt: 0.65, qste: 0.20 },
  { id: 'profile-6', name: 'Profile 6: Work Immersion (WOW: 20%, PPT: 80%, Exam: 0%)', wow: 0.20, ppt: 0.80, qste: 0.00 }
];

// DepEd Order No. 8, s. 2015 — SHS Old Curriculum Presets
export const SHS_OLD_PROFILES: SHSProfile[] = [
  { id: 'old-core',         name: 'Core Subjects (WW: 25%, PT: 50%, QA: 25%)',                             wow: 0.25, ppt: 0.50, qste: 0.25 },
  { id: 'old-acad',         name: 'Academic Track — All Subjects (WW: 25%, PT: 45%, QA: 30%)',             wow: 0.25, ppt: 0.45, qste: 0.30 },
  { id: 'old-acad-immerse', name: 'Academic Track — Work Immersion/Research (WW: 20%, PT: 70%, QA: 10%)',  wow: 0.20, ppt: 0.70, qste: 0.10 },
  { id: 'old-tvl',          name: 'TVL/Sports/Arts & Design — All Subjects (WW: 20%, PT: 60%, QA: 20%)',   wow: 0.20, ppt: 0.60, qste: 0.20 },
  { id: 'old-tvl-immerse',  name: 'TVL/Sports/Arts & Design — Work Immersion (WW: 10%, PT: 80%, QA: 10%)', wow: 0.10, ppt: 0.80, qste: 0.10 },
];

// Flat list combining old + MATATAG profiles for utility lookups
export const ALL_SHS_PRESET_PROFILES: SHSProfile[] = [...SHS_OLD_PROFILES, ...SHS_PROFILES];


export const SUBJECT_DEFAULTS: Record<SubjectType, { wow: number; ppt: number; qste: number }> = {
  English: { wow: 0.30, ppt: 0.50, qste: 0.20 },
  Filipino: { wow: 0.30, ppt: 0.50, qste: 0.20 },
  Mathematics: { wow: 0.40, ppt: 0.40, qste: 0.20 },
  Science: { wow: 0.40, ppt: 0.40, qste: 0.20 },
  AP: { wow: 0.30, ppt: 0.50, qste: 0.20 },
  'Values Education': { wow: 0.30, ppt: 0.50, qste: 0.20 },
  'Music & Arts': { wow: 0.20, ppt: 0.60, qste: 0.20 },
  'PE & Health': { wow: 0.20, ppt: 0.60, qste: 0.20 },
  TLE: { wow: 0.20, ppt: 0.60, qste: 0.20 }
};

export function getSubjectWeights(
  subject: string,
  customWeights?: Record<string, { wow: number; ppt: number; qste: number }>,
  workspace?: 'JHS' | 'SHS',
  assessmentProfileId?: string,
  projectCustomWeights?: { wow: number; ppt: number; qste: number }
): { wow: number; ppt: number; qste: number } {
  if (workspace === 'SHS') {
    // Custom manual weights take priority when profile is 'custom'
    if (assessmentProfileId === 'custom' && projectCustomWeights) {
      return projectCustomWeights;
    }
    // Try ALL presets (old curriculum + MATATAG)
    const shsProfile = ALL_SHS_PRESET_PROFILES.find(p => p.id === assessmentProfileId);
    if (shsProfile) {
      return { wow: shsProfile.wow, ppt: shsProfile.ppt, qste: shsProfile.qste };
    }
  }

  const s = (subject || '').trim();
  const normalizedS = s.replace('/', ' & ');
  const slashedS = s.replace(' & ', '/');

  if (customWeights) {
    const found = customWeights[s] || customWeights[normalizedS] || customWeights[slashedS];
    if (found) {
      const wow = typeof found.wow === 'number' ? found.wow : typeof (found as any).ww === 'number' ? (found as any).ww : undefined;
      const ppt = typeof found.ppt === 'number' ? found.ppt : typeof (found as any).pt === 'number' ? (found as any).pt : undefined;
      const qste = typeof found.qste === 'number' ? found.qste : typeof (found as any).qa === 'number' ? (found as any).qa : undefined;

      if (wow !== undefined && ppt !== undefined && qste !== undefined) {
        return { wow, ppt, qste };
      }
    }
  }

  // Direct key lookup in SUBJECT_DEFAULTS
  if (SUBJECT_DEFAULTS[s as SubjectType]) {
    return SUBJECT_DEFAULTS[s as SubjectType];
  }
  if (SUBJECT_DEFAULTS[normalizedS as SubjectType]) {
    return SUBJECT_DEFAULTS[normalizedS as SubjectType];
  }

  // Common DepEd subject mappings & case-insensitive matching
  const lower = s.toLowerCase();
  if (lower.includes('math') || lower.includes('algebra') || lower.includes('geom') || lower.includes('trig') || lower.includes('stat') || lower.includes('calc')) {
    return SUBJECT_DEFAULTS.Mathematics; // 40, 40, 20
  }
  if (lower.includes('sci') || lower.includes('bio') || lower.includes('chem') || lower.includes('phys')) {
    return SUBJECT_DEFAULTS.Science; // 40, 40, 20
  }
  if (lower.includes('mapeh') || lower.includes('music') || lower.includes('art')) {
    return SUBJECT_DEFAULTS['Music & Arts']; // 20, 60, 20
  }
  if (lower.includes('pe') || lower.includes('health') || lower.includes('physi')) {
    return SUBJECT_DEFAULTS['PE & Health']; // 20, 60, 20
  }
  if (lower.includes('tle') || lower.includes('epp') || lower.includes('tvl') || lower.includes('tech') || lower.includes('agri') || lower.includes('ict')) {
    return SUBJECT_DEFAULTS.TLE; // 20, 60, 20
  }
  if (lower.includes('english') || lower.includes('eng')) {
    return SUBJECT_DEFAULTS.English; // 30, 50, 20
  }
  if (lower.includes('filipino') || lower.includes('fil') || lower.includes('tagalog')) {
    return SUBJECT_DEFAULTS.Filipino; // 30, 50, 20
  }
  if (lower.includes('ap') || lower.includes('araling') || lower.includes('soc') || lower.includes('history')) {
    return SUBJECT_DEFAULTS.AP; // 30, 50, 20
  }
  if (lower.includes('value') || lower.includes('esp') || lower.includes('edukasyon') || lower.includes('conduct')) {
    return SUBJECT_DEFAULTS['Values Education']; // 30, 50, 20
  }

  // Default DepEd Order No. 8 fallback (30% WW / 50% PT / 20% QA)
  return { wow: 0.30, ppt: 0.50, qste: 0.20 };
}

export function getSubjectWeightsLabel(
  type: string,
  customWeights?: Record<string, { wow: number; ppt: number; qste: number }>,
  workspace?: 'JHS' | 'SHS',
  assessmentProfileId?: string,
  projectCustomWeights?: { wow: number; ppt: number; qste: number }
) {
  const w = getSubjectWeights(type, customWeights, workspace, assessmentProfileId, projectCustomWeights);
  return `Written/Oral Works (${Math.round(w.wow * 100)}%) / Performance/ Product tasks (${Math.round(w.ppt * 100)}%) / Quarterly/Term Exams (${Math.round(w.qste * 100)}%)`;
}

export function getEffectiveScore(
  originalScore: number | undefined,
  reassessmentScore: number | undefined,
  perfectScore: number,
  settings?: { enabled: boolean; masteryThreshold: number; policy: 'Average' | 'Highest' | 'Replacement' } | null,
  assessmentEnabled?: boolean
): number | undefined {
  if (originalScore === undefined) return undefined;
  if (!settings?.enabled || !assessmentEnabled) return originalScore;

  const threshold = settings.masteryThreshold ?? 75;
  const pct = (originalScore / perfectScore) * 100;
  if (pct >= threshold) return originalScore; // Retain original if mastered

  if (reassessmentScore !== undefined) {
    const policy = settings.policy || 'Average';
    if (policy === 'Highest') {
      return Math.max(originalScore, reassessmentScore);
    } else if (policy === 'Replacement') {
      return reassessmentScore;
    } else {
      return Math.round(((originalScore + reassessmentScore) / 2) * 100) / 100;
    }
  }

  return originalScore;
}

export function getLearnerReassessmentStatus(
  originalScore: number | undefined,
  reassessmentScore: number | undefined,
  perfectScore: number,
  settings?: { enabled: boolean; masteryThreshold: number } | null,
  assessmentEnabled?: boolean
): 'Normal' | 'Mastered' | 'Eligible' | 'Reassessed' {
  if (originalScore === undefined) return 'Normal';
  const threshold = settings?.masteryThreshold ?? 75;
  const pct = (originalScore / perfectScore) * 100;

  if (pct >= threshold) return 'Mastered';
  if (settings?.enabled && assessmentEnabled) {
    return reassessmentScore !== undefined ? 'Reassessed' : 'Eligible';
  }
  return 'Normal';
}

// Compute complete grade metrics for a student inside a Project for a specific quarter
export function computeProjectStudentGrade(
  project: Project,
  studentId: string,
  customWeights?: Record<string, { wow: number; ppt: number; qste: number }>,
  quarterId?: string
) {
  const qId = quarterId || project.lastActiveQuarter || getFirstPeriod();
  const qData = project.quarters?.[qId];

  // If the quarter data doesn't exist, return empty stats
  if (!qData) {
    return {
      wowRawSum: 0, wowMaxSum: 0, wowPercentage: 0, weightedWOW: 0,
      pptRawSum: 0, pptMaxSum: 0, pptPercentage: 0, weightedPPT: 0,
      qsteRawSum: 0, qsteMaxSum: 0, qstePercentage: 0, weightedQSTE: 0,
      initialGrade: 0, finalGrade: 0, remarks: '-', isPassing: false, hasScores: false
    };
  }

  const wwAssessments = qData.assessments.filter(a => a.category === 'WOW');
  const ptAssessments = qData.assessments.filter(a => a.category === 'PPT');
  const qeAssessments = qData.assessments.filter(a => a.category === 'QSTE');

  const studentScores = qData.scores[studentId] || {};
  const studentReassessmentScores = qData.reassessmentScores?.[studentId] || {};
  const settings = project.reassessmentSettings;

  // Compute Written/Oral Works raw percentages using effective scores
  let wowRawSum = 0;
  let wowMaxSum = 0;
  let wwGradesCount = 0;
  wwAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      const effScore = getEffectiveScore(score, studentReassessmentScores[a.id], a.perfectScore, settings, a.reassessmentEnabled);
      wowRawSum += effScore !== undefined ? effScore : score;
      wowMaxSum += a.perfectScore;
      wwGradesCount++;
    }
  });
  const wowPercentage = wowMaxSum > 0 ? (wowRawSum / wowMaxSum) * 100 : 0;

  // Compute Performance/ Product tasks raw percentages using effective scores
  let pptRawSum = 0;
  let pptMaxSum = 0;
  let ptGradesCount = 0;
  ptAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      const effScore = getEffectiveScore(score, studentReassessmentScores[a.id], a.perfectScore, settings, a.reassessmentEnabled);
      pptRawSum += effScore !== undefined ? effScore : score;
      pptMaxSum += a.perfectScore;
      ptGradesCount++;
    }
  });
  const pptPercentage = pptMaxSum > 0 ? (pptRawSum / pptMaxSum) * 100 : 0;

  // Compute Quarterly/Term Exams raw percentages using effective scores
  let qsteRawSum = 0;
  let qsteMaxSum = 0;
  let qeGradesCount = 0;
  qeAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      const effScore = getEffectiveScore(score, studentReassessmentScores[a.id], a.perfectScore, settings, a.reassessmentEnabled);
      qsteRawSum += effScore !== undefined ? effScore : score;
      qsteMaxSum += a.perfectScore;
      qeGradesCount++;
    }
  });
  const qstePercentage = qsteMaxSum > 0 ? (qsteRawSum / qsteMaxSum) * 100 : 0;

  // Determine actual weights (from custom weights, defaults, or SHS profiles)
  const weights = getSubjectWeights(
    project.subject,
    customWeights,
    project.workspace,
    project.assessmentProfileId,
    project.customWeights
  );

  const weightedWOW = wowPercentage * weights.wow;
  const weightedPPT = pptPercentage * weights.ppt;
  const weightedQSTE = qstePercentage * weights.qste;

  const initialGrade = weightedWOW + weightedPPT + weightedQSTE;
  
  // 0-Based vs Adjusted Transmutation Grade depending on active project depedPolicy
  const finalGrade = project.depedPolicy === '2015'
    ? Math.round(initialGrade)
    : transmuteGrade2027(initialGrade);

  const isPassing = finalGrade >= project.passingGrade;
  const remarks = isPassing ? "Passed" : "Needs Intervention";

  // Check if student has entered any marks
  const hasScores = (wwGradesCount > 0 || ptGradesCount > 0 || qeGradesCount > 0);

  return {
    wowRawSum: Math.round(wowRawSum * 100) / 100,
    wowMaxSum,
    wowPercentage: Math.round(wowPercentage * 100) / 100,
    weightedWOW: Math.round(weightedWOW * 100) / 100,

    pptRawSum: Math.round(pptRawSum * 100) / 100,
    pptMaxSum,
    pptPercentage: Math.round(pptPercentage * 100) / 100,
    weightedPPT: Math.round(weightedPPT * 100) / 100,

    qsteRawSum: Math.round(qsteRawSum * 100) / 100,
    qsteMaxSum,
    qstePercentage: Math.round(qstePercentage * 100) / 100,
    weightedQSTE: Math.round(weightedQSTE * 100) / 100,

    initialGrade: Math.round(initialGrade * 100) / 100,
    finalGrade,
    remarks,
    isPassing,
    hasScores
  };
}
