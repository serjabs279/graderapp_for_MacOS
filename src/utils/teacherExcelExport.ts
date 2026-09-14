import * as XLSX from 'xlsx';
import { Project } from '../types';
import { computeProjectStudentGrade } from '../utils';
import { globalToast } from '../context/ToastContext';

export function exportTeacherGradebookExcel(
  project: Project,
  selectedQuarters: string[],
  customWeights?: Record<string, { wow: number; ppt: number; qste: number }>
) {
  try {
    const wb = XLSX.utils.book_new();
    const activeStudents = project.students.filter(s => s.status === 'Active' || !s.status);

    // ── 1. Create a detailed Sheet for each selected Quarter ──────────
    selectedQuarters.forEach(qKey => {
      const qData = project.quarters?.[qKey];
      const sheetData: any[][] = [];

      // Top info metadata
      sheetData.push(['SAN ROQUE PARISH HIGH SCHOOL, INCORPORATED']);
      sheetData.push([`Electronic Class Record — ${qKey}`]);
      sheetData.push(['Subject UID', project.subjectUID ?? 'N/A']);
      sheetData.push(['Subject', project.subject]);
      sheetData.push(['School Year', project.schoolYear]);
      sheetData.push(['Grade Level & Section', `${project.gradeLevel} - ${project.section}`]);
      sheetData.push(['Teacher', project.teacherName ?? '']);
      sheetData.push([]);

      // Filter assessments for this quarter by category
      const wwList = qData?.assessments.filter(a => a.category === 'WOW') || [];
      const ptList = qData?.assessments.filter(a => a.category === 'PPT') || [];
      const qeList = qData?.assessments.filter(a => a.category === 'QSTE') || [];

      // Row 1: Category Header Groupings
      const headerRow1: any[] = ['LRN', 'Learner Name', 'Sex'];
      wwList.forEach((a, idx) => headerRow1.push(`WW ${idx + 1}`));
      if (wwList.length > 0) {
        headerRow1.push('WW Total', 'WW %', 'WW Weighted');
      }

      ptList.forEach((a, idx) => headerRow1.push(`PT ${idx + 1}`));
      if (ptList.length > 0) {
        headerRow1.push('PT Total', 'PT %', 'PT Weighted');
      }

      qeList.forEach((a, idx) => headerRow1.push(`Exam ${idx + 1}`));
      if (qeList.length > 0) {
        headerRow1.push('Exam Total', 'Exam %', 'Exam Weighted');
      }

      headerRow1.push('Initial Grade', 'Quarterly Grade', 'Remarks');
      sheetData.push(headerRow1);

      // Row 2: Assessment Names & Highest Possible Score (HPS)
      const hpsRow: any[] = ['', 'Highest Possible Score', ''];
      wwList.forEach(a => hpsRow.push(a.perfectScore));
      if (wwList.length > 0) {
        const totalWwHps = wwList.reduce((sum, a) => sum + a.perfectScore, 0);
        hpsRow.push(totalWwHps, '100%', '');
      }

      ptList.forEach(a => hpsRow.push(a.perfectScore));
      if (ptList.length > 0) {
        const totalPtHps = ptList.reduce((sum, a) => sum + a.perfectScore, 0);
        hpsRow.push(totalPtHps, '100%', '');
      }

      qeList.forEach(a => hpsRow.push(a.perfectScore));
      if (qeList.length > 0) {
        const totalQeHps = qeList.reduce((sum, a) => sum + a.perfectScore, 0);
        hpsRow.push(totalQeHps, '100%', '');
      }

      hpsRow.push('', '', '');
      sheetData.push(hpsRow);

      // Student Rows (split by sex for clean school format)
      const isM = (s: typeof activeStudents[0]) => (s.sex || '').toLowerCase().startsWith('m');
      const maleList = activeStudents.filter(isM);
      const femaleList = activeStudents.filter(s => !isM(s));

      const addStudentGroup = (groupLabel: string, students: typeof activeStudents) => {
        if (students.length === 0) return;
        sheetData.push([`-- ${groupLabel} (${students.length}) --`]);

        students.forEach(st => {
          const scores = qData?.scores?.[st.id] || {};
          const reassessScores = qData?.reassessmentScores?.[st.id] || {};
          const computed = computeProjectStudentGrade(project, st.id, customWeights, qKey);
          const stRow: any[] = [st.lrn, st.name, st.sex || ''];

          // WW raw scores
          wwList.forEach(a => {
            const sc = scores[a.id];
            const rsc = reassessScores[a.id];
            const val = rsc !== undefined ? rsc : sc;
            stRow.push(val !== undefined ? val : '');
          });
          if (wwList.length > 0) {
            stRow.push(computed.wowRawSum, `${computed.wowPercentage}%`, computed.weightedWOW);
          }

          // PT raw scores
          ptList.forEach(a => {
            const sc = scores[a.id];
            const rsc = reassessScores[a.id];
            const val = rsc !== undefined ? rsc : sc;
            stRow.push(val !== undefined ? val : '');
          });
          if (ptList.length > 0) {
            stRow.push(computed.pptRawSum, `${computed.pptPercentage}%`, computed.weightedPPT);
          }

          // Exam raw scores
          qeList.forEach(a => {
            const sc = scores[a.id];
            const rsc = reassessScores[a.id];
            const val = rsc !== undefined ? rsc : sc;
            stRow.push(val !== undefined ? val : '');
          });
          if (qeList.length > 0) {
            stRow.push(computed.qsteRawSum, `${computed.qstePercentage}%`, computed.weightedQSTE);
          }

          stRow.push(computed.initialGrade, computed.finalGrade, computed.remarks);
          sheetData.push(stRow);
        });
      };

      addStudentGroup('MALE LEARNERS', maleList);
      addStudentGroup('FEMALE LEARNERS', femaleList);

      const wsQuarter = XLSX.utils.aoa_to_sheet(sheetData);
      // Auto column widths
      wsQuarter['!cols'] = [
        { wch: 16 }, // LRN
        { wch: 28 }, // Learner Name
        { wch: 8 },  // Sex
        ...headerRow1.slice(3).map(() => ({ wch: 12 }))
      ];

      const safeSheetName = qKey.replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsQuarter, safeSheetName);
    });

    // ── 2. Add a Consolidated Summary Sheet if more than 1 quarter is selected ──
    if (selectedQuarters.length > 1) {
      const summaryData: any[][] = [];
      summaryData.push(['SAN ROQUE PARISH HIGH SCHOOL, INCORPORATED']);
      summaryData.push(['Consolidated Grade Summary Sheet']);
      summaryData.push(['Subject', project.subject]);
      summaryData.push(['Grade & Section', `${project.gradeLevel} - ${project.section}`]);
      summaryData.push(['School Year', project.schoolYear]);
      summaryData.push([]);

      const sumHeaders = ['LRN', 'Student Name', 'Sex', ...selectedQuarters, 'Final Rating', 'Remarks'];
      summaryData.push(sumHeaders);

      activeStudents.forEach(st => {
        const row: any[] = [st.lrn, st.name, st.sex || ''];
        let quarterSum = 0;
        let quarterCount = 0;

        selectedQuarters.forEach(qKey => {
          const qData = project.quarters?.[qKey];
          const hasAnyScore = qData
            ? Object.keys(qData.scores[st.id] ?? {}).length > 0
            : false;
          const computed = computeProjectStudentGrade(project, st.id, customWeights, qKey);
          if (hasAnyScore) {
            row.push(computed.finalGrade);
            quarterSum += computed.finalGrade;
            quarterCount++;
          } else {
            row.push('');
          }
        });

        const finalRating = quarterCount > 0 ? Math.round(quarterSum / quarterCount) : '';
        const remarks = finalRating !== '' ? (Number(finalRating) >= (project.passingGrade || 75) ? 'Passed' : 'Failed') : '';
        row.push(finalRating, remarks);
        summaryData.push(row);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 18 },
        { wch: 30 },
        { wch: 8 },
        ...selectedQuarters.map(() => ({ wch: 14 })),
        { wch: 14 },
        { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Ratings');
    }

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
    globalToast.success(`Gradebook spreadsheet exported as "${filename}".`, 'Excel Export Successful');
  } catch (err: any) {
    console.error('Teacher Excel export error:', err);
    globalToast.error(err.message || 'Failed to export gradebook spreadsheet.', 'Excel Export Failed');
  }
}
