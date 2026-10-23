import { AdviserClass, ImportedSubjectGrades, HonorsCriteria, HonorsLabel, PromotionStatus } from '../types';
import { getCalendar } from '../calendar/academicCalendar';

export interface SubjectGradeEntry {
  subjectName: string;
  isLanguageGroup?: boolean;
  isMAPEHGroup?: boolean;
  languageComponents?: string[];
  languageQuarters?: Record<string, Record<string, number | null>>; // componentName -> quarterKey -> grade
  quarters: Record<string, number | null>;
  finalGrade: number | null;
}

export interface StudentGradeRow {
  lrn: string;
  name: string;
  sex: 'Male' | 'Female';
  age?: number;
  birthdate?: string;
  trackStrand?: string;
  subjects: SubjectGradeEntry[];
  generalAverage: number | null;
  rank?: number;
  honorsLabel?: HonorsLabel;
  promotionStatus?: PromotionStatus;
}

export type GradeMatrix = StudentGradeRow[];

export const JHS_QUARTERS = getCalendar('Quarter').periods.map(p => p.id);
export const SHS_SEMESTERS = ['Semester 1', 'Semester 2'];

export const DEFAULT_SHS_TRACKS_STRANDS: string[] = [
  'Academic - STEM',
  'Academic - HUMSS',
  'Academic - ABM',
  'Academic - GAS',
  'TVL - Information & Communications Technology (ICT)',
  'TVL - Home Economics (HE)',
  'TVL - Industrial Arts (IA)',
  'TVL - Agri-Fishery Arts',
  'Arts and Design',
  'Sports'
];

export function getQuarterKeys(workspace: 'JHS' | 'SHS', calendarType: 'Quarter' | 'Trimester' = 'Quarter'): string[] {
  return getCalendar(calendarType).periods.map(p => p.id);
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

/** Whole-year age from an ISO (YYYY-MM-DD) or SF10 (MM/DD/YYYY) birthdate. */
export function calculateAge(birthdate: string | undefined, asOf: Date = new Date()): number | undefined {
  if (!birthdate) return undefined;
  const value = birthdate.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const year = iso ? Number(iso[1]) : us ? Number(us[3]) : NaN;
  const month = iso ? Number(iso[2]) : us ? Number(us[1]) : NaN;
  const day = iso ? Number(iso[3]) : us ? Number(us[2]) : NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return undefined;
  if (birth > asOf) return undefined;
  let age = asOf.getFullYear() - year;
  const hadBirthday = asOf.getMonth() > month - 1 || (asOf.getMonth() === month - 1 && asOf.getDate() >= day);
  if (!hadBirthday) age--;
  return age >= 0 ? age : undefined;
}

/**
 * Computes a subject's final rating without pretending missing periods are zero
 * or silently averaging a partial set of quarters.
 * - JHS / trimester: every period in the calendar is required.
 * - SHS: a semester is complete only when both of its quarters are present.
 */
export function computeSubjectFinal(
  qGrades: Record<string, number | null>,
  workspace: 'JHS' | 'SHS'
): number | null {
  const values = Object.values(qGrades);
  if (values.length === 0) return null;

  if (workspace === 'SHS') {
    const [q1, q2, q3, q4] = values;
    const sem1Any = q1 !== null || q2 !== null;
    const sem2Any = q3 !== null || q4 !== null;
    const sem1Complete = q1 !== null && q2 !== null;
    const sem2Complete = q3 !== null && q4 !== null;

    // A partially entered semester makes the subject incomplete.
    if ((sem1Any && !sem1Complete) || (sem2Any && !sem2Complete)) return null;
    if (sem1Complete && sem2Complete) return avg([q1, q2, q3, q4]);
    if (sem1Complete) return avg([q1, q2]);
    if (sem2Complete) return avg([q3, q4]);
    return null;
  }

  // All calendar periods are needed for a JHS/trimester final rating.
  if (values.some(v => v === null || v === undefined)) return null;
  return avg(values);
}

function getGrade(importedGrades: ImportedSubjectGrades[], subjectName: string, quarterKey: string, lrn: string): number | null {
  const entry = importedGrades.find(g => g.subjectName === subjectName && g.quarterKey === quarterKey);
  if (!entry) return null;
  const grade = entry.grades[lrn];
  return grade !== undefined ? grade : null;
}

function getLangGrade(importedGrades: ImportedSubjectGrades[], groupLabel: string, quarterKey: string, lrn: string, langSubject: string): number | null {
  const entry = importedGrades.find(g => g.subjectName === groupLabel && g.quarterKey === quarterKey && g.isLanguageGroup);
  if (!entry?.languageRawGrades) return null;
  // Direct key match first
  if (entry.languageRawGrades[langSubject] !== undefined) {
    const grade = entry.languageRawGrades[langSubject][lrn];
    return grade !== undefined ? grade : null;
  }
  // Normalize: 'Music/Arts' ↔ 'Music & Arts', 'PE/Health' ↔ 'PE & Health'
  const normalized = langSubject.replace('/', ' & ');
  const slashed = langSubject.replace(' & ', '/');
  const altKey = entry.languageRawGrades[normalized] !== undefined ? normalized
    : entry.languageRawGrades[slashed] !== undefined ? slashed
    : null;
  if (!altKey) return null;
  const grade = entry.languageRawGrades[altKey][lrn];
  return grade !== undefined ? grade : null;
}

export function buildGradeMatrix(adviserClass: AdviserClass): GradeMatrix {
  const { students, importedGrades, subjectOrder, languageGroups, workspace, manualPromotionStatus, honorsCriteria, promotionPassingGrade } = adviserClass;
  const quarterKeys = getQuarterKeys(workspace);
  const languageGroupLabels = new Set(languageGroups.map(lg => lg.label));
  const importedSubjectNames = Array.from(new Set(importedGrades.map(g => g.subjectName)));
  const addedLabels = new Set<string>();
  const allSubjects: Array<{ name: string; isLanguageGroup: boolean; isMAPEHGroup?: boolean; languageGroup?: typeof languageGroups[0] }> = [];
  // Default standard subject lists if subjectOrder is empty
  // For SHS, there are NO presets; only dynamically scraped/uploaded subjects are used.
  const defaultStandardSubjects = workspace === 'JHS'
    ? ['English', 'Filipino', 'Mathematics', 'Science', 'AP', 'MAPEH', 'Values Education', 'TLE']
    : [];

  const activeSubjectOrder = (subjectOrder && subjectOrder.length > 0)
    ? subjectOrder
    : defaultStandardSubjects;

  const orderedSubjects = [
    ...activeSubjectOrder,
    ...importedSubjectNames.filter(s => !activeSubjectOrder.includes(s))
  ];
  orderedSubjects.forEach(name => {
    if (addedLabels.has(name)) return;
    if (languageGroupLabels.has(name)) {
      const lg = languageGroups.find(g => g.label === name)!;
      const isMAPEH = name === 'MAPEH'; // Only the explicit MAPEH group is treated as composite MAPEH
      allSubjects.push({ name, isLanguageGroup: true, isMAPEHGroup: isMAPEH, languageGroup: lg });
    } else {
      allSubjects.push({ name, isLanguageGroup: false });
    }
    addedLabels.add(name);
  });

  const matrix: GradeMatrix = students.map(student => {
    const { lrn, name, sex } = student;
    const subjectEntries: SubjectGradeEntry[] = allSubjects.map(subj => {
      const qGrades: Record<string, number | null> = {};
      const langQuarters: Record<string, Record<string, number | null>> = {};
      
      if (subj.isLanguageGroup && subj.languageGroup) {
        subj.languageGroup.subjects.forEach(lang => {
          langQuarters[lang] = {};
        });
      }

      quarterKeys.forEach(qk => {
        if (subj.isLanguageGroup && subj.languageGroup) {
          const componentGrades = subj.languageGroup.subjects.map(s => {
            const g = getLangGrade(importedGrades, subj.name, qk, lrn, s);
            langQuarters[s][qk] = g;
            return g;
          });
          qGrades[qk] = avg(componentGrades);
        } else {
          qGrades[qk] = getGrade(importedGrades, subj.name, qk, lrn);
        }
      });
      return { 
        subjectName: subj.name, 
        isLanguageGroup: subj.isLanguageGroup, 
        isMAPEHGroup: subj.isMAPEHGroup,
        languageComponents: subj.languageGroup?.subjects,
        languageQuarters: langQuarters,
        quarters: qGrades, 
        finalGrade: computeSubjectFinal(qGrades, workspace)
      };
    });
    const stObj = adviserClass.students.find(s => s.lrn === lrn);
    // A general average is only meaningful once every subject has a complete final rating.
    const allSubjectsComplete = subjectEntries.length > 0 && subjectEntries.every(s => s.finalGrade !== null);
    return {
      lrn,
      name,
      sex,
      age: stObj?.age,
      birthdate: stObj?.birthdate,
      trackStrand: stObj?.trackStrand,
      subjects: subjectEntries,
      generalAverage: allSubjectsComplete ? avg(subjectEntries.map(s => s.finalGrade)) : null
    };
  });

  const ranked = [...matrix].filter(s => s.generalAverage !== null).sort((a, b) => (b.generalAverage ?? 0) - (a.generalAverage ?? 0));
  let rankCounter = 1;
  ranked.forEach((s, i) => {
    s.rank = (i > 0 && s.generalAverage === ranked[i - 1].generalAverage) ? ranked[i - 1].rank : rankCounter;
    rankCounter++;
  });
  matrix.forEach(row => {
    if (row.generalAverage !== null) row.honorsLabel = classifyHonors(row, honorsCriteria);
    row.promotionStatus = determinePromotion(row, promotionPassingGrade, manualPromotionStatus);
  });
  return matrix;
}

function classifyAverage(ga: number | null, minGrade: number, criteria: HonorsCriteria): HonorsLabel {
  if (ga === null) return null;
  if (ga >= criteria.highestHonors.minAverage && minGrade >= criteria.highestHonors.minAnySubject) return 'With Highest Honors';
  if (ga >= criteria.highHonors.minAverage && minGrade >= criteria.highHonors.minAnySubject) return 'With High Honors';
  if (ga >= criteria.honors.minAverage && minGrade >= criteria.honors.minAnySubject) return 'With Honors';
  return null;
}

export function classifyHonors(row: StudentGradeRow, criteria: HonorsCriteria): HonorsLabel {
  const ga = row.generalAverage;
  if (ga === null) return null;
  // Never award honors while any learning area still lacks a complete final rating.
  if (row.subjects.some(s => s.finalGrade === null)) return null;
  const allFinals = row.subjects.map(s => s.finalGrade).filter((g): g is number => g !== null);
  const minGrade = allFinals.length > 0 ? Math.min(...allFinals) : 0;
  return classifyAverage(ga, minGrade, criteria);
}

/**
 * Honors for a single quarter: average of the subjects already graded in that
 * quarter, with the minimum-grade rule applied to those same subjects.
 */
export function getQuarterHonors(
  row: StudentGradeRow,
  quarterKey: string,
  criteria: HonorsCriteria
): { average: number | null; honorsLabel: HonorsLabel; gradedSubjects: number } {
  const grades = row.subjects
    .map(s => s.quarters[quarterKey])
    .filter((g): g is number => g !== null);
  if (grades.length === 0) return { average: null, honorsLabel: null, gradedSubjects: 0 };
  const average = avg(grades);
  const minGrade = Math.min(...grades);
  return { average, honorsLabel: classifyAverage(average, minGrade, criteria), gradedSubjects: grades.length };
}

/** Subjects that at least one learner has been graded in for the given quarter. */
export function getQuarterTrackedSubjects(matrix: GradeMatrix, quarterKey: string): Set<string> {
  const tracked = new Set<string>();
  const subjects = matrix[0]?.subjects ?? [];
  subjects.forEach((subj, idx) => {
    if (matrix.some(row => row.subjects[idx]?.quarters[quarterKey] != null)) tracked.add(subj.subjectName);
  });
  return tracked;
}

/** Quarter-complete: every tracked subject, including composite components, has a grade. */
export function isQuarterComplete(row: StudentGradeRow, quarterKey: string, trackedSubjects: Set<string>): boolean {
  return row.subjects.every(subj => {
    if (!trackedSubjects.has(subj.subjectName)) return true;
    if (subj.isLanguageGroup && subj.languageComponents?.length) {
      return subj.languageComponents.every(c => subj.languageQuarters?.[c]?.[quarterKey] != null);
    }
    return subj.quarters[quarterKey] != null;
  });
}

export function determinePromotion(row: StudentGradeRow, passingGrade: number, manualOverrides: Record<string, 'Promoted' | 'Retained'>): PromotionStatus {
  if (manualOverrides[row.lrn]) return manualOverrides[row.lrn];
  if (row.subjects.length === 0) return 'To be Finalized';
  // Missing subject/quarter grades must block a promotion decision.
  if (row.subjects.some(s => s.finalGrade === null)) return 'To be Finalized';
  const allFinals = row.subjects.map(s => s.finalGrade).filter((g): g is number => g !== null);
  if (allFinals.length === 0) return 'To be Finalized';
  if (allFinals.some(g => g < passingGrade)) return 'To be Finalized';
  return 'Promoted';
}

export function getQuarterRanking(matrix: GradeMatrix, quarterKey: string): (StudentGradeRow & { quarterAverage: number | null })[] {
  return matrix.map(row => {
    const qGrades = row.subjects.map(s => s.quarters[quarterKey]).filter((g): g is number => g !== null);
    return { ...row, quarterAverage: avg(qGrades) };
  }).filter(r => r.quarterAverage !== null).sort((a, b) => (b.quarterAverage ?? 0) - (a.quarterAverage ?? 0));
}

export interface AttendanceSummary {
  lrn: string;
  months: Record<string, { schoolDays: number; daysAbsent: number; daysPresent: number }>;
  totalSchoolDays: number; totalDaysAbsent: number; totalDaysPresent: number;
}

export function computeAttendanceSummary(adviserClass: AdviserClass, lrn: string): AttendanceSummary {
  const { attendanceConfig, attendance } = adviserClass;
  const studentAttendance = attendance.find(a => a.studentLRN === lrn);
  const months: AttendanceSummary['months'] = {};
  let totalSchoolDays = 0, totalDaysAbsent = 0;
  attendanceConfig.months.forEach(month => {
    const schoolDays = attendanceConfig.schoolDaysPerMonth[month] || 0;
    const daysAbsent = studentAttendance?.months[month]?.daysAbsent ?? 0;
    months[month] = { schoolDays, daysAbsent, daysPresent: schoolDays - daysAbsent };
    totalSchoolDays += schoolDays; totalDaysAbsent += daysAbsent;
  });
  return { lrn, months, totalSchoolDays, totalDaysAbsent, totalDaysPresent: totalSchoolDays - totalDaysAbsent };
}

export function createDefaultAdviserClass(schoolYear: string, gradeLevel: string, section: string, workspace: 'JHS' | 'SHS'): AdviserClass {
  return {
    id: `${schoolYear}|${gradeLevel}|${section}`,
    schoolYear, gradeLevel, section, workspace,
    adviserName: '', principalName: '',
    students: [], subjectOrder: [],
    languageGroups: workspace === 'SHS' 
      ? [{ label: 'Languages', subjects: ['English', 'Filipino'] }] 
      : [{ label: 'MAPEH', subjects: ['Music & Arts', 'PE & Health'] }],
    honorsCriteria: {
      highestHonors: { minAverage: 98, minAnySubject: 90 },
      highHonors:    { minAverage: 95, minAnySubject: 85 },
      honors:        { minAverage: 90, minAnySubject: 80 },
    },
    promotionPassingGrade: 75,
    manualPromotionStatus: {}, observedValues: [], attendance: [],
    attendanceConfig: {
      months: ['June', 'July', 'August', 'September', 'October', 'November', 'January', 'February', 'March', 'April'],
      schoolDaysPerMonth: { June: 15, July: 23, August: 22, September: 21, October: 23, November: 20, January: 22, February: 20, March: 21, April: 10 }
    },
    importedGrades: [], overrideLog: [],
    availableTracksStrands: workspace === 'SHS' ? [...DEFAULT_SHS_TRACKS_STRANDS] : undefined,
  };
}
