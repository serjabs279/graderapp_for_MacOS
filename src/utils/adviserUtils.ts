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
  subjects: SubjectGradeEntry[];
  generalAverage: number | null;
  rank?: number;
  honorsLabel?: HonorsLabel;
  promotionStatus?: PromotionStatus;
}

export type GradeMatrix = StudentGradeRow[];

export const JHS_QUARTERS = getCalendar('Quarter').periods.map(p => p.id);
export const SHS_SEMESTERS = ['Semester 1', 'Semester 2'];

export function getQuarterKeys(workspace: 'JHS' | 'SHS', calendarType: 'Quarter' | 'Trimester' = 'Quarter'): string[] {
  return getCalendar(calendarType).periods.map(p => p.id);
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
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
        finalGrade: avg(Object.values(qGrades)) 
      };
    });
    const stObj = adviserClass.students.find(s => s.lrn === lrn);
    return { lrn, name, sex, age: stObj?.age, subjects: subjectEntries, generalAverage: avg(subjectEntries.map(s => s.finalGrade)) };
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

export function classifyHonors(row: StudentGradeRow, criteria: HonorsCriteria): HonorsLabel {
  const ga = row.generalAverage;
  if (ga === null) return null;
  const allFinals = row.subjects.map(s => s.finalGrade).filter((g): g is number => g !== null);
  const minGrade = allFinals.length > 0 ? Math.min(...allFinals) : 0;
  if (ga >= criteria.highestHonors.minAverage && minGrade >= criteria.highestHonors.minAnySubject) return 'With Highest Honors';
  if (ga >= criteria.highHonors.minAverage && minGrade >= criteria.highHonors.minAnySubject) return 'With High Honors';
  if (ga >= criteria.honors.minAverage && minGrade >= criteria.honors.minAnySubject) return 'With Honors';
  return null;
}

export function determinePromotion(row: StudentGradeRow, passingGrade: number, manualOverrides: Record<string, 'Promoted' | 'Retained'>): PromotionStatus {
  if (manualOverrides[row.lrn]) return manualOverrides[row.lrn];
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
  };
}
