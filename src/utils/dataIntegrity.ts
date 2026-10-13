import { Project, AdviserClass } from '../types';

export type IssueSeverity = 'critical' | 'warning' | 'info';
export type IssueCategory = 'scores' | 'students' | 'assessments' | 'adviser' | 'attendance';

export interface IntegrityIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  location: string;
  fixSuggestion?: string;
}

export interface IntegrityReport {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalIssues: number;
  issues: IntegrityIssue[];
  scannedAt: string;
  isHealthy: boolean;
}

export function runDataIntegrityCheck(
  projects: Project[] = [],
  adviserClasses: AdviserClass[] = []
): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  // 1. Audit Projects (Teacher Grading Hub)
  projects.forEach((project) => {
    const projectLoc = `${project.subject || 'Subject'} (${project.gradeLevel || ''} - ${project.section || ''})`;

    // Check duplicate student LRNs in project
    const lrnSet = new Set<string>();
    project.students?.forEach((student) => {
      if (!student.name || student.name.trim() === '') {
        issues.push({
          id: `proj-blank-name-${project.id}-${student.id}`,
          severity: 'warning',
          category: 'students',
          title: 'Blank Student Name',
          description: `A student record has an empty name in class ${project.section}.`,
          location: projectLoc,
          fixSuggestion: 'Update the student name in Class Manager or Masterlist.'
        });
      }

      if (student.lrn) {
        const cleanLrn = student.lrn.trim();
        if (lrnSet.has(cleanLrn)) {
          issues.push({
            id: `proj-dup-lrn-${project.id}-${cleanLrn}`,
            severity: 'critical',
            category: 'students',
            title: 'Duplicate Student LRN',
            description: `LRN ${cleanLrn} (${student.name}) is duplicated in this section.`,
            location: projectLoc,
            fixSuggestion: 'Check and assign the correct unique 12-digit LRN to the student.'
          });
        } else {
          lrnSet.add(cleanLrn);
        }

        if (cleanLrn.length !== 12 || !/^\d+$/.test(cleanLrn)) {
          issues.push({
            id: `proj-invalid-lrn-fmt-${project.id}-${student.id}`,
            severity: 'info',
            category: 'students',
            title: 'Non-Standard LRN Format',
            description: `LRN "${student.lrn}" for ${student.name} is not a standard 12-digit number.`,
            location: projectLoc,
            fixSuggestion: 'Verify DepEd 12-digit LRN when available.'
          });
        }
      }
    });

    // Check Quarters & Assessment Scores
    if (project.quarters) {
      Object.entries(project.quarters).forEach(([quarterKey, quarterData]) => {
        if (!quarterData) return;
        const qLoc = `${projectLoc} • ${quarterKey}`;

        const assessments = quarterData.assessments || [];
        const assessMap = new Map(assessments.map((a) => [a.id, a]));

        // Check assessment integrity
        assessments.forEach((assessment) => {
          if (!assessment.perfectScore || assessment.perfectScore <= 0 || isNaN(assessment.perfectScore)) {
            issues.push({
              id: `proj-invalid-ps-${project.id}-${quarterKey}-${assessment.id}`,
              severity: 'critical',
              category: 'assessments',
              title: 'Invalid Perfect Score (HPS)',
              description: `Assessment "${assessment.name || 'Unnamed'}" has an invalid perfect score: ${assessment.perfectScore}.`,
              location: qLoc,
              fixSuggestion: 'Edit the assessment and set the Highest Possible Score to a number greater than 0.'
            });
          }
        });

        // Check scores
        if (quarterData.scores) {
          Object.entries(quarterData.scores).forEach(([studentId, studentScores]) => {
            const student = project.students?.find((s) => s.id === studentId);
            const studentName = student ? student.name : `Student ID ${studentId}`;

            Object.entries(studentScores || {}).forEach(([assessId, score]) => {
              const assess = assessMap.get(assessId);

              if (score === null || score === undefined) return;

              if (isNaN(score) || !isFinite(score)) {
                issues.push({
                  id: `proj-nan-score-${project.id}-${quarterKey}-${studentId}-${assessId}`,
                  severity: 'critical',
                  category: 'scores',
                  title: 'Corrupted Score Value (NaN/Infinity)',
                  description: `${studentName} has a corrupted score (${score}) for "${assess?.name || assessId}".`,
                  location: qLoc,
                  fixSuggestion: 'Re-enter the student score in Class Manager.'
                });
                return;
              }

              if (score < 0) {
                issues.push({
                  id: `proj-neg-score-${project.id}-${quarterKey}-${studentId}-${assessId}`,
                  severity: 'critical',
                  category: 'scores',
                  title: 'Negative Score Detected',
                  description: `${studentName} has a negative score (${score}) for "${assess?.name || assessId}".`,
                  location: qLoc,
                  fixSuggestion: 'Scores cannot be negative. Reset or correct the score.'
                });
              }

              if (assess && assess.perfectScore > 0 && score > assess.perfectScore) {
                issues.push({
                  id: `proj-overflow-score-${project.id}-${quarterKey}-${studentId}-${assessId}`,
                  severity: 'critical',
                  category: 'scores',
                  title: 'Score Exceeds Perfect Score',
                  description: `${studentName} has score ${score} exceeding the perfect score ${assess.perfectScore} in "${assess.name}".`,
                  location: qLoc,
                  fixSuggestion: 'Check for typos or adjust the assessment Highest Possible Score.'
                });
              }
            });
          });
        }
      });
    }
  });

  // 2. Audit Adviser Classes
  adviserClasses.forEach((adviserClass) => {
    const classLoc = `Advisory ${adviserClass.gradeLevel || ''} - ${adviserClass.section || ''} (${adviserClass.schoolYear || ''})`;

    const advLrnSet = new Set<string>();
    adviserClass.students?.forEach((student) => {
      if (!student.name || student.name.trim() === '') {
        issues.push({
          id: `adv-blank-name-${adviserClass.id}-${student.lrn}`,
          severity: 'warning',
          category: 'students',
          title: 'Blank Adviser Student Name',
          description: `A student has an empty name in advisory class ${adviserClass.section}.`,
          location: classLoc,
          fixSuggestion: 'Edit student details in Adviser Portal Masterlist.'
        });
      }

      if (student.lrn) {
        const cleanLrn = student.lrn.trim();
        if (advLrnSet.has(cleanLrn)) {
          issues.push({
            id: `adv-dup-lrn-${adviserClass.id}-${cleanLrn}`,
            severity: 'critical',
            category: 'students',
            title: 'Duplicate LRN in Advisory Class',
            description: `LRN ${cleanLrn} is listed more than once in ${adviserClass.section}.`,
            location: classLoc,
            fixSuggestion: 'Remove or edit the duplicate student record in Masterlist.'
          });
        } else {
          advLrnSet.add(cleanLrn);
        }
      }
    });

    // Audit Imported Subject Grades
    adviserClass.importedGrades?.forEach((imported) => {
      const impLoc = `${classLoc} • ${imported.subjectName || 'Subject'} (${imported.quarterKey || ''})`;

      Object.entries(imported.grades || {}).forEach(([lrn, grade]) => {
        if (grade === null || grade === undefined) return;

        if (isNaN(grade) || !isFinite(grade)) {
          issues.push({
            id: `adv-nan-grade-${adviserClass.id}-${imported.subjectUID}-${lrn}`,
            severity: 'critical',
            category: 'adviser',
            title: 'Corrupted Final Subject Grade (NaN)',
            description: `Student LRN ${lrn} has a non-numeric final grade (${grade}) in ${imported.subjectName}.`,
            location: impLoc,
            fixSuggestion: 'Re-import or re-enter the grade in Grade Matrix.'
          });
          return;
        }

        if (grade < 50 || grade > 100) {
          issues.push({
            id: `adv-range-grade-${adviserClass.id}-${imported.subjectUID}-${lrn}`,
            severity: 'warning',
            category: 'adviser',
            title: 'Grade Outside Standard DepEd Range (50-100)',
            description: `Student LRN ${lrn} has a final quarterly grade of ${grade} in ${imported.subjectName}.`,
            location: impLoc,
            fixSuggestion: 'DepEd quarterly transmuted grades typically range from 60 to 100. Confirm if correct.'
          });
        }

        // Check if student exists in adviser student list
        if (!advLrnSet.has(lrn.trim())) {
          issues.push({
            id: `adv-unlinked-grade-${adviserClass.id}-${imported.subjectUID}-${lrn}`,
            severity: 'info',
            category: 'adviser',
            title: 'Grade for Unlisted Student',
            description: `Imported grade found for LRN ${lrn}, but student is not in the Advisory Masterlist.`,
            location: impLoc,
            fixSuggestion: 'Add the student to the Advisory Masterlist or re-import the subject.'
          });
        }
      });
    });

    // Audit Attendance Records
    if (adviserClass.attendance && adviserClass.attendanceConfig) {
      const daysConfig = adviserClass.attendanceConfig.schoolDaysPerMonth || {};

      adviserClass.attendance.forEach((attRecord) => {
        const student = adviserClass.students?.find((s) => s.lrn === attRecord.studentLRN);
        const studentLabel = student ? student.name : `LRN ${attRecord.studentLRN}`;

        Object.entries(attRecord.months || {}).forEach(([month, mData]) => {
          const maxDays = daysConfig[month] ?? mData.schoolDays ?? 31;
          if (mData.daysAbsent > maxDays && maxDays > 0) {
            issues.push({
              id: `adv-att-overflow-${adviserClass.id}-${attRecord.studentLRN}-${month}`,
              severity: 'warning',
              category: 'attendance',
              title: 'Days Absent Exceeds School Days',
              description: `${studentLabel} has ${mData.daysAbsent} days absent in ${month}, but total school days is ${maxDays}.`,
              location: `${classLoc} • Attendance (${month})`,
              fixSuggestion: 'Correct student days absent in the Attendance Tab.'
            });
          }
        });
      });
    }
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    criticalCount,
    warningCount,
    infoCount,
    totalIssues: issues.length,
    issues,
    scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isHealthy: criticalCount === 0 && warningCount === 0
  };
}
