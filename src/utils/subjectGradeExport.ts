import { Project, SubjectGradeExportJSON } from '../types';
import { computeProjectStudentGrade } from '../utils';

/**
 * Generates a structured JSON object containing subject grade data per quarter for active students.
 */
export function generateSubjectGradeJSON(project: Project, selectedQuarters: string[]): SubjectGradeExportJSON {
  const activeStudents = project.students.filter(s => s.status === 'Active');

  const quartersData = selectedQuarters.map(qKey => {
    const gradesList: { lrn: string; studentName: string; grade: number }[] = [];

    activeStudents.forEach(student => {
      const qData = project.quarters?.[qKey];
      const hasAnyScore = qData
        ? Object.keys(qData.scores[student.id] ?? {}).length > 0
        : false;

      if (hasAnyScore) {
        const computed = computeProjectStudentGrade(project, student.id, undefined, qKey);
        if (typeof computed.finalGrade === 'number' && !isNaN(computed.finalGrade)) {
          gradesList.push({
            lrn: student.lrn,
            studentName: student.name,
            grade: computed.finalGrade,
          });
        }
      }
    });

    return {
      quarterKey: qKey,
      grades: gradesList,
    };
  });

  return {
    version: '1.0',
    exportType: 'SRPHS_SUBJECT_GRADES',
    exportTimestamp: new Date().toISOString(),
    subjectUID: project.subjectUID || 'N/A',
    subjectName: project.subject,
    schoolYear: project.schoolYear,
    gradeLevel: project.gradeLevel,
    section: project.section,
    teacherName: project.teacherName || '',
    workspace: project.workspace || 'JHS',
    quarters: quartersData,
  };
}

/**
 * Triggers a browser file download of the Subject Grade JSON file.
 */
export function exportTeacherGradebookJSON(project: Project, selectedQuarters: string[]) {
  const exportData = generateSubjectGradeJSON(project, selectedQuarters);
  const jsonStr = JSON.stringify(exportData, null, 2);

  const isConsolidated =
    selectedQuarters.length === Object.keys(project.quarters || {}).length &&
    selectedQuarters.length > 0;
  const qStr = isConsolidated
    ? 'Consolidated'
    : selectedQuarters.map(q => q.replace(/\s+/g, '')).join('_');

  const filename = [
    project.subject,
    project.gradeLevel,
    project.section,
    qStr,
  ]
    .join('_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '') + '.json';

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', url);
  linkElement.setAttribute('download', filename);
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses a JSON string exported from teacher gradebook.
 */
export function parseGradeJSON(jsonContent: string): SubjectGradeExportJSON {
  const parsed = JSON.parse(jsonContent);
  
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON format.');
  }

  if (parsed.exportType !== 'SRPHS_SUBJECT_GRADES') {
    throw new Error('File is not a valid SRPHS Subject Grade JSON file.');
  }

  if (!parsed.subjectName || !Array.isArray(parsed.quarters)) {
    throw new Error('Missing required subject or quarter information in JSON file.');
  }

  return parsed as SubjectGradeExportJSON;
}
