import * as XLSX from 'xlsx';
import { Project } from '../types';
import { computeProjectStudentGrade } from '../utils';

export function exportTeacherGradebookExcel(project: Project, selectedQuarters: string[]) {
  const data: any[][] = [];

  // ── Top information block ──────────────────────────────────────────
  data.push(['Subject UID', project.subjectUID ?? 'N/A']);
  data.push(['Subject Name', project.subject]);
  data.push(['School Year', project.schoolYear]);
  data.push(['Grade Level', project.gradeLevel]);
  data.push(['Section', project.section]);
  data.push(['Teacher', project.teacherName ?? '']);
  data.push([]);

  // ── Table Headers ─────────────────────────────────────────────────
  const headers = ['LRN', 'Student Name'];
  selectedQuarters.forEach(q => headers.push(q));
  headers.push('Remarks');
  data.push(headers);

  // ── Compute final grade per student per quarter ────────────────────
  const activeStudents = project.students.filter(s => s.status === 'Active');

  activeStudents.forEach(student => {
    const row: any[] = [student.lrn, student.name];

    selectedQuarters.forEach(qKey => {
      const computed = computeProjectStudentGrade(project, student.id, undefined, qKey);
      // Only include the grade if the student has actual score data in that quarter
      const qData = project.quarters?.[qKey];
      const hasAnyScore = qData
        ? Object.keys(qData.scores[student.id] ?? {}).length > 0
        : false;
      row.push(hasAnyScore ? computed.finalGrade : '');
    });

    row.push(''); // Remarks – adviser fills this during consolidation
    data.push(row);
  });

  // ── Build & Style Workbook ─────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-column widths (approximate)
  const colWidths = [
    { wch: 20 }, // LRN
    { wch: 30 }, // Student Name
    ...selectedQuarters.map(() => ({ wch: 14 })),
    { wch: 16 }, // Remarks
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Official Grades');

  // ── Filename ───────────────────────────────────────────────────────
  const isConsolidated =
    selectedQuarters.length === Object.keys(project.quarters).length &&
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
    .replace(/[^a-zA-Z0-9_\-]/g, '') + '.xlsx';

  XLSX.writeFile(wb, filename);
}
