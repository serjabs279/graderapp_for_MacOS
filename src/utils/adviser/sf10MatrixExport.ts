import { AdviserClass, GlobalSettings } from '../../types';
import { GradeMatrix, computeAttendanceSummary } from '../adviserUtils';
import { exportFile } from '../fileExportAdapter';
import { globalToast } from '../../context/ToastContext';

export interface SF10LearnerNameParts {
  lastName: string;
  firstName: string;
  middleName: string;
  nameExtension: string;
}

export interface SF10SubjectRecord {
  subjectName: string;
  classification?: 'Core' | 'Applied' | 'Specialized' | 'General';
  quarters: Record<string, number | null>;
  finalRating: number | null;
  actionTaken: 'Passed' | 'Failed' | 'Incomplete';
  isComposite?: boolean;
  components?: Array<{
    name: string;
    quarters: Record<string, number | null>;
  }>;
}

export interface SF10LearnerRecord {
  lrn: string;
  fullName: string;
  nameParts: SF10LearnerNameParts;
  sex: 'Male' | 'Female';
  age?: number;
  birthdate?: string;
  trackStrand?: string;
  scholasticRecord: {
    subjects: SF10SubjectRecord[];
    generalAverage: number | null;
    actionTaken: 'Promoted' | 'Retained' | 'Conditional' | 'Pending';
    honors?: string | null;
    rank?: number;
  };
  attendanceSummary: {
    totalSchoolDays: number;
    totalDaysPresent: number;
    totalDaysAbsent: number;
  };
}

export interface GradeMatrixSF10ExportJSON {
  exportType: 'DEPED_SF10_GRADE_MATRIX';
  version: '1.0';
  generatedAt: string;
  schoolInfo: {
    schoolName: string;
    schoolId?: string;
    district?: string;
    division?: string;
    region?: string;
  };
  classInfo: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    workspace: 'JHS' | 'SHS';
    trackStrand?: string;
    adviserName: string;
    principalName: string;
    passingGrade: number;
  };
  subjectsSummary: Array<{
    name: string;
    isComposite: boolean;
    components?: string[];
  }>;
  totalStudents: number;
  students: SF10LearnerRecord[];
}

/**
 * Parses full student name (commonly "LASTNAME, FIRSTNAME M. EXT" or "LASTNAME, FIRSTNAME")
 * into discrete parts matching DepEd SF10 specifications.
 */
export function parseLearnerName(rawName: string): SF10LearnerNameParts {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return { lastName: '', firstName: '', middleName: '', nameExtension: '' };
  }

  // Extensions list
  const knownExtensions = ['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V', 'VI'];

  if (trimmed.includes(',')) {
    const [lastPart, ...restParts] = trimmed.split(',');
    const lastName = lastPart.trim().toUpperCase();
    const rest = restParts.join(',').trim();
    const tokens = rest.split(/\s+/).filter(Boolean);

    let nameExtension = '';
    const filteredTokens: string[] = [];

    for (const token of tokens) {
      if (knownExtensions.includes(token.toUpperCase())) {
        nameExtension = token.toUpperCase();
      } else {
        filteredTokens.push(token);
      }
    }

    if (filteredTokens.length === 0) {
      return { lastName, firstName: '', middleName: '', nameExtension };
    }

    // If last token looks like a middle initial or middle name (e.g., "A." or single letter or "SANTOS")
    // When there are >= 2 words in first names, assume last word is middle name if >= 2 words
    if (filteredTokens.length > 1) {
      const middleName = filteredTokens[filteredTokens.length - 1];
      const firstName = filteredTokens.slice(0, filteredTokens.length - 1).join(' ');
      return { lastName, firstName, middleName, nameExtension };
    } else {
      return { lastName, firstName: filteredTokens[0], middleName: '', nameExtension };
    }
  }

  // Fallback if no comma: "FIRSTNAME [MIDDLENAME] LASTNAME"
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { lastName: tokens[0], firstName: '', middleName: '', nameExtension: '' };
  }

  let nameExtension = '';
  const cleanTokens: string[] = [];
  for (const t of tokens) {
    if (knownExtensions.includes(t.toUpperCase())) {
      nameExtension = t.toUpperCase();
    } else {
      cleanTokens.push(t);
    }
  }

  const lastName = cleanTokens[cleanTokens.length - 1];
  const firstName = cleanTokens[0];
  const middleName = cleanTokens.length > 2 ? cleanTokens.slice(1, cleanTokens.length - 1).join(' ') : '';

  return { lastName, firstName, middleName, nameExtension };
}

/**
 * Builds standard DepEd SF-10 Grade Matrix export payload
 */
export function buildSF10GradeMatrixJSON(
  adviserClass: AdviserClass,
  gradeMatrix: GradeMatrix,
  globalSettings: GlobalSettings
): GradeMatrixSF10ExportJSON {
  const passingGrade = adviserClass.promotionPassingGrade ?? 75;

  // Compile subjects summary
  const subjectsSummary: GradeMatrixSF10ExportJSON['subjectsSummary'] = [];
  if (gradeMatrix.length > 0) {
    gradeMatrix[0].subjects.forEach(subj => {
      subjectsSummary.push({
        name: subj.subjectName,
        isComposite: !!subj.isLanguageGroup,
        components: subj.languageComponents
      });
    });
  }

  // Compile student rows
  const students: SF10LearnerRecord[] = gradeMatrix.map(row => {
    // Attendance
    let att = { totalSchoolDays: 0, totalDaysPresent: 0, totalDaysAbsent: 0 };
    try {
      const summary = computeAttendanceSummary(adviserClass, row.lrn);
      att = {
        totalSchoolDays: summary.totalSchoolDays,
        totalDaysPresent: summary.totalDaysPresent,
        totalDaysAbsent: summary.totalDaysAbsent
      };
    } catch {
      // fallback
    }

    // Subjects
    const subjectRecords: SF10SubjectRecord[] = row.subjects.map(subj => {
      let actionTaken: SF10SubjectRecord['actionTaken'] = 'Incomplete';
      if (subj.finalGrade !== null && subj.finalGrade !== undefined) {
        actionTaken = subj.finalGrade >= passingGrade ? 'Passed' : 'Failed';
      }

      const record: SF10SubjectRecord = {
        subjectName: subj.subjectName,
        quarters: { ...subj.quarters },
        finalRating: subj.finalGrade,
        actionTaken,
        isComposite: !!subj.isLanguageGroup
      };

      if (subj.isLanguageGroup && subj.languageComponents && subj.languageQuarters) {
        record.components = subj.languageComponents.map(comp => ({
          name: comp,
          quarters: subj.languageQuarters ? (subj.languageQuarters[comp] ?? {}) : {}
        }));
      }

      return record;
    });

    // Promotion Action Taken
    let promotionAction: SF10LearnerRecord['scholasticRecord']['actionTaken'] = 'Pending';
    if (row.promotionStatus === 'Promoted') {
      promotionAction = 'Promoted';
    } else if (row.promotionStatus === 'Retained') {
      promotionAction = 'Retained';
    } else if (row.generalAverage !== null) {
      const hasFailedSubject = subjectRecords.some(s => s.actionTaken === 'Failed');
      promotionAction = (row.generalAverage >= passingGrade && !hasFailedSubject) ? 'Promoted' : 'Retained';
    }

    return {
      lrn: row.lrn,
      fullName: row.name,
      nameParts: parseLearnerName(row.name),
      sex: row.sex,
      age: row.age,
      birthdate: row.birthdate,
      trackStrand: row.trackStrand || adviserClass.trackStrand || '',
      scholasticRecord: {
        subjects: subjectRecords,
        generalAverage: row.generalAverage,
        actionTaken: promotionAction,
        honors: row.honorsLabel || null,
        rank: row.rank
      },
      attendanceSummary: att
    };
  });

  return {
    exportType: 'DEPED_SF10_GRADE_MATRIX',
    version: '1.0',
    generatedAt: new Date().toISOString(),
    schoolInfo: {
      schoolName: globalSettings.schoolName || 'Department of Education School',
      schoolId: adviserClass.schoolId || globalSettings.schoolId || '',
      district: adviserClass.district || globalSettings.district || '',
      division: adviserClass.division || globalSettings.division || '',
      region: adviserClass.region || globalSettings.region || ''
    },
    classInfo: {
      schoolYear: adviserClass.schoolYear,
      gradeLevel: adviserClass.gradeLevel,
      section: adviserClass.section,
      workspace: adviserClass.workspace,
      trackStrand: adviserClass.trackStrand,
      adviserName: adviserClass.adviserName,
      principalName: adviserClass.principalName,
      passingGrade
    },
    subjectsSummary,
    totalStudents: students.length,
    students
  };
}

/**
 * Exports the grade matrix to a JSON file via fileExportAdapter (supporting Desktop and Android)
 */
export async function exportGradeMatrixJSON(
  adviserClass: AdviserClass,
  gradeMatrix: GradeMatrix,
  globalSettings: GlobalSettings
): Promise<boolean> {
  try {
    const data = buildSF10GradeMatrixJSON(adviserClass, gradeMatrix, globalSettings);
    const jsonString = JSON.stringify(data, null, 2);

    const safeSy = (adviserClass.schoolYear || '').replace(/[^a-zA-Z0-9]/g, '-');
    const safeGrade = (adviserClass.gradeLevel || '').replace(/[^a-zA-Z0-9]/g, '_');
    const safeSection = (adviserClass.section || '').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `SF10_GradeMatrix_${safeGrade}_${safeSection}_${safeSy}.json`;

    const saved = await exportFile({
      filename,
      content: jsonString,
      mimeType: 'application/json',
      title: 'Export Grade Matrix JSON for SF-10'
    });

    if (saved) {
      globalToast.success(
        `Grade matrix JSON exported successfully (${data.totalStudents} learners). Saved as "${filename}".`,
        'SF-10 JSON Export'
      );
    }
    return saved;
  } catch (err: any) {
    console.error('Grade Matrix JSON export failed:', err);
    globalToast.error(
      'Failed to export grade matrix JSON: ' + (err?.message || String(err)),
      'Export Failed'
    );
    return false;
  }
}
