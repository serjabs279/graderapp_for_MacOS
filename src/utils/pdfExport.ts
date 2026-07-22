import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Project, Student } from '../types';
import { computeProjectStudentGrade } from '../utils';

// Brand & Layout Colors for pdf-lib
const COLOR_PRIMARY = rgb(15 / 255, 23 / 255, 42 / 255);    // Slate 900
const COLOR_HEADER_BG = rgb(241 / 255, 245 / 255, 249 / 255); // Slate 100
const COLOR_ALT_ROW = rgb(248 / 255, 250 / 255, 252 / 255);   // Slate 50
const COLOR_BORDER = rgb(226 / 255, 232 / 255, 240 / 255);    // Slate 200
const COLOR_TEXT = rgb(30 / 255, 41 / 255, 59 / 255);        // Slate 800
const COLOR_TEXT_MUTED = rgb(100 / 255, 116 / 255, 139 / 255); // Slate 500
const COLOR_SUCCESS = rgb(22 / 255, 101 / 255, 52 / 255);    // Emerald 800
const COLOR_SUCCESS_BG = rgb(240 / 255, 253 / 255, 244 / 255); // Emerald 50
const COLOR_DANGER = rgb(153 / 255, 27 / 255, 27 / 255);      // Red 800
const COLOR_DANGER_BG = rgb(254 / 255, 242 / 255, 242 / 255);  // Red 50

/**
 * Truncates text to fit within a given maximum width in points.
 */
function fitText(text: string, font: any, fontSize: number, maxWidth: number): string {
  if (!text) return '';
  let str = text;
  if (font.widthOfTextAtSize(str, fontSize) <= maxWidth) return str;
  while (str.length > 0 && font.widthOfTextAtSize(str + '...', fontSize) > maxWidth) {
    str = str.slice(0, -1);
  }
  return str ? str + '...' : '';
}

/**
 * Initiates a browser file download from an encoded Uint8Array PDF byte array.
 */
function downloadPdfBuffer(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to log debugging trace metrics required by auditing tools.
 */
function logTraceMetrics(
  source: string,
  studentsLength: number,
  filteredLength: number,
  displayedLength: number,
  exportedLength: number,
  elementId?: string
) {
  const domNodeCount = elementId && document.getElementById(elementId)
    ? document.getElementById(elementId)!.getElementsByTagName('*').length
    : document.getElementsByTagName('*').length;

  console.group(`📊 PDF Export Debug Trace [${source}]`);
  console.log(`students.length: ${studentsLength}`);
  console.log(`filteredStudents.length: ${filteredLength}`);
  console.log(`displayedStudents.length: ${displayedLength}`);
  console.log(`exportedStudents.length: ${exportedLength}`);
  console.log(`DOM Node count before export: ${domNodeCount}`);
  console.groupEnd();
}

/**
 * Generates a clean, crisp vector PDF for DepEd Class Record / SF9 Academic Report from project data.
 */
export async function exportClassRecordPDF(project: Project, customFilename?: string): Promise<boolean> {
  try {
    const rawStudents = project?.students || [];
    const activeStudents = rawStudents.filter((s) => s.status === 'Active' || !s.status);
    
    // Debug Trace Logging
    logTraceMetrics(
      'exportClassRecordPDF',
      rawStudents.length,
      activeStudents.length,
      activeStudents.length,
      activeStudents.length,
      'printable-report-card'
    );

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 Landscape orientation: 841.89 x 595.28 points
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 28;
    const usableWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Helper for adding pages
    const createNewPage = () => {
      const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let newY = pageHeight - margin;

      // Small Header on subsequent pages
      newPage.drawText(`DepEd Class Record — ${project.subject} (${project.gradeLevel} - ${project.section})`, {
        x: margin,
        y: newY - 10,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT_MUTED,
      });

      newPage.drawLine({
        start: { x: margin, y: newY - 16 },
        end: { x: pageWidth - margin, y: newY - 16 },
        thickness: 0.5,
        color: COLOR_BORDER,
      });

      return { newPage, newY: newY - 30 };
    };

    // Draw Official Header
    page.drawText('REPUBLIC OF THE PHILIPPINES • DEPARTMENT OF EDUCATION', {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT_MUTED,
    });
    y -= 14;

    page.drawText('OFFICIAL CLASS RECORD / ACADEMIC REPORT', {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: COLOR_PRIMARY,
    });
    y -= 18;

    // Metadata Grid Box
    const metaBoxHeight = 36;
    page.drawRectangle({
      x: margin,
      y: y - metaBoxHeight,
      width: usableWidth,
      height: metaBoxHeight,
      color: COLOR_HEADER_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 0.75,
    });

    const colWidth = usableWidth / 4;
    const metaY1 = y - 12;
    const metaY2 = y - 28;

    page.drawText(`School: ${project.schoolName || 'N/A'}`, { x: margin + 8, y: metaY1, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`School Year: ${project.schoolYear}`, { x: margin + colWidth + 8, y: metaY1, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`Grade & Section: ${project.gradeLevel} - ${project.section}`, { x: margin + colWidth * 2 + 8, y: metaY1, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`Quarter: ${project.quarter}`, { x: margin + colWidth * 3 + 8, y: metaY1, size: 8, font: fontBold, color: COLOR_TEXT });

    page.drawText(`Subject: ${project.subject}`, { x: margin + 8, y: metaY2, size: 8, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Teacher: ${project.teacherName || 'N/A'}`, { x: margin + colWidth + 8, y: metaY2, size: 8, font, color: COLOR_TEXT_MUTED });
    page.drawText(`DepEd Policy: ${project.depedPolicy === '2015' ? 'DO 8 s. 2015' : 'MATATAG (2027)'}`, { x: margin + colWidth * 2 + 8, y: metaY2, size: 8, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Passing Mark: ${project.passingGrade}%`, { x: margin + colWidth * 3 + 8, y: metaY2, size: 8, font, color: COLOR_TEXT_MUTED });

    y -= (metaBoxHeight + 16);

    // Table Column Definitions
    const cols = [
      { name: '#', width: 22 },
      { name: 'LRN', width: 75 },
      { name: 'Student Name', width: 160 },
      { name: 'Sex', width: 35 },
      { name: 'Written Wk (%)', width: 85 },
      { name: 'Perf. Tasks (%)', width: 85 },
      { name: 'Exam (%)', width: 70 },
      { name: 'Initial', width: 50 },
      { name: 'Quarterly', width: 55 },
      { name: 'Remarks', width: usableWidth - (22 + 75 + 160 + 35 + 85 + 85 + 70 + 50 + 55) },
    ];

    const drawTableHeader = (p: typeof page, currentY: number) => {
      p.drawRectangle({
        x: margin,
        y: currentY - 18,
        width: usableWidth,
        height: 18,
        color: COLOR_PRIMARY,
      });

      let xOffset = margin;
      cols.forEach((col) => {
        p.drawText(col.name, {
          x: xOffset + 4,
          y: currentY - 12,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        xOffset += col.width;
      });

      return currentY - 18;
    };

    y = drawTableHeader(page, y);

    // Separate Students into Male and Female groups
    const isM = (s: Student) => {
      const sx = (s.sex || '').trim().toLowerCase();
      return sx === 'male' || sx === 'm' || sx.startsWith('m');
    };
    const isF = (s: Student) => {
      const sx = (s.sex || '').trim().toLowerCase();
      return sx === 'female' || sx === 'f' || sx.startsWith('f');
    };

    const maleStudents = activeStudents.filter(isM).sort((a, b) => a.name.localeCompare(b.name));
    const femaleStudents = activeStudents.filter(isF).sort((a, b) => a.name.localeCompare(b.name));
    const otherStudents = activeStudents.filter((s) => !isM(s) && !isF(s)).sort((a, b) => a.name.localeCompare(b.name));

    const renderStudentGroup = (groupLabel: string, studentList: Student[]) => {
      if (studentList.length === 0) return;

      if (y - 18 < margin + 40) {
        const res = createNewPage();
        page = res.newPage;
        y = drawTableHeader(page, res.newY);
      }

      // Group Header Bar
      page.drawRectangle({
        x: margin,
        y: y - 14,
        width: usableWidth,
        height: 14,
        color: COLOR_HEADER_BG,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
      });

      page.drawText(`${groupLabel} (${studentList.length})`, {
        x: margin + 6,
        y: y - 10,
        size: 7.5,
        font: fontBold,
        color: COLOR_PRIMARY,
      });

      y -= 14;

      studentList.forEach((student, idx) => {
        if (y - 16 < margin + 30) {
          const res = createNewPage();
          page = res.newPage;
          y = drawTableHeader(page, res.newY);
        }

        const stats = computeProjectStudentGrade(project, student.id);
        const isAlt = idx % 2 === 1;

        // Row background
        page.drawRectangle({
          x: margin,
          y: y - 15,
          width: usableWidth,
          height: 15,
          color: stats.isPassing ? (isAlt ? COLOR_ALT_ROW : rgb(1, 1, 1)) : COLOR_DANGER_BG,
          borderColor: COLOR_BORDER,
          borderWidth: 0.5,
        });

        let xOffset = margin;

        const cellData = [
          { text: `${idx + 1}`, width: cols[0].width, bold: false },
          { text: student.lrn || '—', width: cols[1].width, bold: false },
          { text: fitText(student.name, fontBold, 7.5, cols[2].width - 8), width: cols[2].width, bold: true },
          { text: student.sex ? student.sex.charAt(0) : '—', width: cols[3].width, bold: false },
          { text: `${stats.wwPercentage.toFixed(1)}% (${stats.weightedWW.toFixed(1)})`, width: cols[4].width, bold: false },
          { text: `${stats.ptPercentage.toFixed(1)}% (${stats.weightedPT.toFixed(1)})`, width: cols[5].width, bold: false },
          { text: `${stats.qePercentage.toFixed(1)}% (${stats.weightedQA.toFixed(1)})`, width: cols[6].width, bold: false },
          { text: `${stats.initialGrade.toFixed(1)}`, width: cols[7].width, bold: false },
          { text: `${stats.finalGrade}`, width: cols[8].width, bold: true },
          {
            text: stats.remarks,
            width: cols[9].width,
            bold: true,
            color: stats.isPassing ? COLOR_SUCCESS : COLOR_DANGER,
          },
        ];

        cellData.forEach((cell) => {
          page.drawText(cell.text, {
            x: xOffset + 4,
            y: y - 11,
            size: 7.5,
            font: cell.bold ? fontBold : font,
            color: cell.color || COLOR_TEXT,
          });
          xOffset += cell.width;
        });

        y -= 15;
      });
    };

    renderStudentGroup('MALE STUDENTS', maleStudents);
    renderStudentGroup('FEMALE STUDENTS', femaleStudents);
    renderStudentGroup('OTHER STUDENTS', otherStudents);

    // Summary Statistics Footer Section
    if (y - 70 < margin) {
      const res = createNewPage();
      page = res.newPage;
      y = res.newY;
    }

    y -= 15;

    let passedCount = 0;
    let failedCount = 0;
    let totalGradeSum = 0;
    let highestGrade = 0;
    let lowestGrade = 100;

    activeStudents.forEach((st) => {
      const stStats = computeProjectStudentGrade(project, st.id);
      totalGradeSum += stStats.finalGrade;
      if (stStats.finalGrade > highestGrade) highestGrade = stStats.finalGrade;
      if (stStats.finalGrade < lowestGrade) lowestGrade = stStats.finalGrade;
      if (stStats.isPassing) passedCount++;
      else failedCount++;
    });

    const totalEnrolled = activeStudents.length;
    const avgGrade = totalEnrolled > 0 ? (totalGradeSum / totalEnrolled).toFixed(1) : '0';
    const passRate = totalEnrolled > 0 ? ((passedCount / totalEnrolled) * 100).toFixed(1) : '0';

    const summaryBoxHeight = 50;
    page.drawRectangle({
      x: margin,
      y: y - summaryBoxHeight,
      width: usableWidth,
      height: summaryBoxHeight,
      color: COLOR_HEADER_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 0.75,
    });

    page.drawText('SUMMARY PERFORMANCE METRICS', {
      x: margin + 8,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: COLOR_PRIMARY,
    });

    const sCol = usableWidth / 5;
    page.drawText(`Total Enrolled: ${totalEnrolled}`, { x: margin + 8, y: y - 28, size: 8, font, color: COLOR_TEXT });
    page.drawText(`Passed: ${passedCount}`, { x: margin + sCol + 8, y: y - 28, size: 8, font: fontBold, color: COLOR_SUCCESS });
    page.drawText(`Needs Intervention: ${failedCount}`, { x: margin + sCol * 2 + 8, y: y - 28, size: 8, font: fontBold, color: COLOR_DANGER });
    page.drawText(`Class Average: ${avgGrade}`, { x: margin + sCol * 3 + 8, y: y - 28, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`Passing Rate: ${passRate}%`, { x: margin + sCol * 4 + 8, y: y - 28, size: 8, font: fontBold, color: COLOR_PRIMARY });

    page.drawText(`Highest Grade: ${totalEnrolled > 0 ? highestGrade : '—'}`, { x: margin + 8, y: y - 42, size: 7.5, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Lowest Grade: ${totalEnrolled > 0 ? lowestGrade : '—'}`, { x: margin + sCol + 8, y: y - 42, size: 7.5, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Generated Date: ${new Date().toLocaleDateString()}`, { x: margin + sCol * 3 + 8, y: y - 42, size: 7.5, font, color: COLOR_TEXT_MUTED });

    y -= (summaryBoxHeight + 25);

    // Signatures Line
    if (y - 30 > margin) {
      const sigX1 = margin + 40;
      const sigX2 = pageWidth - margin - 220;

      page.drawLine({ start: { x: sigX1, y: y }, end: { x: sigX1 + 180, y: y }, thickness: 0.75, color: COLOR_PRIMARY });
      page.drawText('Subject Teacher Signature', { x: sigX1 + 30, y: y - 12, size: 8, font, color: COLOR_TEXT_MUTED });

      page.drawLine({ start: { x: sigX2, y: y }, end: { x: sigX2 + 180, y: y }, thickness: 0.75, color: COLOR_PRIMARY });
      page.drawText('School Head / Principal Signature', { x: sigX2 + 20, y: y - 12, size: 8, font, color: COLOR_TEXT_MUTED });
    }

    const pdfBytes = await pdfDoc.save();
    const defaultFilename = `DepEd_Class_Record_${project.gradeLevel}_${project.section}_${project.subject}.pdf`.replace(/\s+/g, '_');
    downloadPdfBuffer(pdfBytes, customFilename || defaultFilename);

    return true;
  } catch (err) {
    console.error('Vector PDF generation error:', err);
    alert('An error occurred while generating the vector PDF. Opening print dialog fallback.');
    window.print();
    return false;
  }
}

/**
 * Generates a clean, crisp vector PDF for Consolidated Quarterly Grades from group data.
 */
export async function exportConsolidatedGradesPDF(groupData: any, customFilename?: string): Promise<boolean> {
  try {
    let compiledStudents: any[] = [];

    // Extract or compile students array
    if (groupData?.students && Array.isArray(groupData.students) && groupData.students.length > 0) {
      compiledStudents = groupData.students;
    } else if (groupData?.projects && Array.isArray(groupData.projects)) {
      const studentsMap = new Map<string, any>();
      const isDummyLrn = (l?: string) => !l || l === '123456789123' || l.startsWith('123');

      const q1Proj = groupData.projects.find((p: any) => p.quarter.toLowerCase().includes('1st'));
      const q2Proj = groupData.projects.find((p: any) => p.quarter.toLowerCase().includes('2nd'));
      const q3Proj = groupData.projects.find((p: any) => p.quarter.toLowerCase().includes('3rd'));
      const q4Proj = groupData.projects.find((p: any) => p.quarter.toLowerCase().includes('4th'));

      const getStudentQuarterGrade = (proj: any, lrn: string, name: string) => {
        if (!proj) return null;
        const normName = name.trim().toUpperCase();
        const s = (proj.students || []).find((x: any) =>
          (lrn && lrn !== '123456789123' && x.lrn === lrn) ||
          x.name.trim().toUpperCase() === normName
        );
        if (!s) return null;
        const r = computeProjectStudentGrade(proj, s.id);
        return r.hasScores ? r.finalGrade : null;
      };

      groupData.projects.forEach((proj: any) => {
        (proj.students || []).forEach((st: any) => {
          const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8)
            ? `${st.name.trim().toUpperCase()}_${st.lrn.trim()}`
            : st.name.trim().toUpperCase();
          if (!studentsMap.has(key)) {
            studentsMap.set(key, { ...st });
          }
        });
      });

      const list = Array.from(studentsMap.values());
      compiledStudents = list.map((st) => {
        const q1 = getStudentQuarterGrade(q1Proj, st.lrn, st.name);
        const q2 = getStudentQuarterGrade(q2Proj, st.lrn, st.name);
        const q3 = getStudentQuarterGrade(q3Proj, st.lrn, st.name);
        const q4 = getStudentQuarterGrade(q4Proj, st.lrn, st.name);

        const qs = [q1, q2, q3, q4].filter((v) => v !== null) as number[];
        const finalGrade = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
        const passingGradeVal = groupData.projects[0]?.passingGrade ?? 75;
        const isPassing = finalGrade !== null ? finalGrade >= passingGradeVal : true;

        return {
          ...st,
          q1,
          q2,
          q3,
          q4,
          finalGrade,
          isPassing,
          remarks: finalGrade !== null ? (isPassing ? 'Passed' : 'Needs Intervention') : 'No Grades Yet',
        };
      });
    }

    // Debug Trace Logging
    logTraceMetrics(
      'exportConsolidatedGradesPDF',
      compiledStudents.length,
      compiledStudents.length,
      compiledStudents.length,
      compiledStudents.length,
      'print-sheet-area'
    );

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 Portrait orientation: 595.28 x 841.89 points
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 28;
    const usableWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const createNewPage = () => {
      const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let newY = pageHeight - margin;

      newPage.drawText(`Consolidated Grades — ${groupData?.subject || ''} (${groupData?.gradeLevel || ''} - ${groupData?.section || ''})`, {
        x: margin,
        y: newY - 10,
        size: 9,
        font: fontBold,
        color: COLOR_TEXT_MUTED,
      });

      newPage.drawLine({
        start: { x: margin, y: newY - 16 },
        end: { x: pageWidth - margin, y: newY - 16 },
        thickness: 0.5,
        color: COLOR_BORDER,
      });

      return { newPage, newY: newY - 30 };
    };

    // Header
    page.drawText('REPUBLIC OF THE PHILIPPINES • DEPARTMENT OF EDUCATION', {
      x: margin,
      y,
      size: 8,
      font: fontBold,
      color: COLOR_TEXT_MUTED,
    });
    y -= 14;

    page.drawText('SUMMARY OF CONSOLIDATED QUARTERLY GRADES', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: COLOR_PRIMARY,
    });
    y -= 18;

    // Info Box
    const metaBoxHeight = 32;
    page.drawRectangle({
      x: margin,
      y: y - metaBoxHeight,
      width: usableWidth,
      height: metaBoxHeight,
      color: COLOR_HEADER_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 0.75,
    });

    const colWidth = usableWidth / 3;
    page.drawText(`Grade & Section: ${groupData?.gradeLevel || '—'} ${groupData?.section || ''}`, { x: margin + 8, y: y - 12, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`Subject: ${groupData?.subject || '—'}`, { x: margin + colWidth + 8, y: y - 12, size: 8, font: fontBold, color: COLOR_TEXT });
    page.drawText(`School Year: ${groupData?.schoolYear || '—'}`, { x: margin + colWidth * 2 + 8, y: y - 12, size: 8, font: fontBold, color: COLOR_TEXT });

    page.drawText(`Adviser / Teacher: ${groupData?.teacherName || '—'}`, { x: margin + 8, y: y - 24, size: 8, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Total Records: ${compiledStudents.length}`, { x: margin + colWidth + 8, y: y - 24, size: 8, font, color: COLOR_TEXT_MUTED });
    page.drawText(`Date Exported: ${new Date().toLocaleDateString()}`, { x: margin + colWidth * 2 + 8, y: y - 24, size: 8, font, color: COLOR_TEXT_MUTED });

    y -= (metaBoxHeight + 16);

    // Table Columns
    const cols = [
      { name: '#', width: 22 },
      { name: 'LRN', width: 75 },
      { name: 'Student Name', width: 170 },
      { name: 'Q1', width: 38 },
      { name: 'Q2', width: 38 },
      { name: 'Q3', width: 38 },
      { name: 'Q4', width: 38 },
      { name: 'Final', width: 45 },
      { name: 'Remarks', width: usableWidth - (22 + 75 + 170 + 38 * 4 + 45) },
    ];

    const drawTableHeader = (p: typeof page, currentY: number) => {
      p.drawRectangle({
        x: margin,
        y: currentY - 18,
        width: usableWidth,
        height: 18,
        color: COLOR_PRIMARY,
      });

      let xOffset = margin;
      cols.forEach((col) => {
        p.drawText(col.name, {
          x: xOffset + 4,
          y: currentY - 12,
          size: 8,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        xOffset += col.width;
      });

      return currentY - 18;
    };

    y = drawTableHeader(page, y);

    const isM = (s: any) => {
      const sx = (s.sex || '').trim().toLowerCase();
      return sx === 'male' || sx === 'm' || sx.startsWith('m');
    };
    const isF = (s: any) => {
      const sx = (s.sex || '').trim().toLowerCase();
      return sx === 'female' || sx === 'f' || sx.startsWith('f');
    };

    const maleStudents = compiledStudents.filter(isM).sort((a, b) => a.name.localeCompare(b.name));
    const femaleStudents = compiledStudents.filter(isF).sort((a, b) => a.name.localeCompare(b.name));
    const otherStudents = compiledStudents.filter((s) => !isM(s) && !isF(s)).sort((a, b) => a.name.localeCompare(b.name));

    const renderConsolidatedGroup = (groupLabel: string, list: any[]) => {
      if (list.length === 0) return;

      if (y - 18 < margin + 40) {
        const res = createNewPage();
        page = res.newPage;
        y = drawTableHeader(page, res.newY);
      }

      page.drawRectangle({
        x: margin,
        y: y - 14,
        width: usableWidth,
        height: 14,
        color: COLOR_HEADER_BG,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
      });

      page.drawText(`${groupLabel} (${list.length})`, {
        x: margin + 6,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: COLOR_PRIMARY,
      });

      y -= 14;

      list.forEach((st: any, idx: number) => {
        if (y - 16 < margin + 30) {
          const res = createNewPage();
          page = res.newPage;
          y = drawTableHeader(page, res.newY);
        }

        const isAlt = idx % 2 === 1;
        const isPassed = st.isPassing ?? (st.finalGrade ? st.finalGrade >= 75 : true);

        page.drawRectangle({
          x: margin,
          y: y - 15,
          width: usableWidth,
          height: 15,
          color: isPassed ? (isAlt ? COLOR_ALT_ROW : rgb(1, 1, 1)) : COLOR_DANGER_BG,
          borderColor: COLOR_BORDER,
          borderWidth: 0.5,
        });

        let xOffset = margin;

        const cellValues = [
          { text: `${idx + 1}`, width: cols[0].width, bold: false },
          { text: st.lrn || '—', width: cols[1].width, bold: false },
          { text: fitText(st.name || '', fontBold, 8, cols[2].width - 8), width: cols[2].width, bold: true },
          { text: st.q1 !== undefined && st.q1 !== null ? `${st.q1}` : '—', width: cols[3].width, bold: false },
          { text: st.q2 !== undefined && st.q2 !== null ? `${st.q2}` : '—', width: cols[4].width, bold: false },
          { text: st.q3 !== undefined && st.q3 !== null ? `${st.q3}` : '—', width: cols[5].width, bold: false },
          { text: st.q4 !== undefined && st.q4 !== null ? `${st.q4}` : '—', width: cols[6].width, bold: false },
          { text: st.finalGrade !== undefined && st.finalGrade !== null ? `${st.finalGrade}` : '—', width: cols[7].width, bold: true },
          {
            text: st.remarks || (isPassed ? 'Passed' : 'Needs Intervention'),
            width: cols[8].width,
            bold: true,
            color: isPassed ? COLOR_SUCCESS : COLOR_DANGER,
          },
        ];

        cellValues.forEach((cell) => {
          page.drawText(cell.text, {
            x: xOffset + 4,
            y: y - 11,
            size: 8,
            font: cell.bold ? fontBold : font,
            color: cell.color || COLOR_TEXT,
          });
          xOffset += cell.width;
        });

        y -= 15;
      });
    };

    renderConsolidatedGroup('MALE STUDENTS', maleStudents);
    renderConsolidatedGroup('FEMALE STUDENTS', femaleStudents);
    renderConsolidatedGroup('OTHER STUDENTS', otherStudents);

    const pdfBytes = await pdfDoc.save();
    const defaultFilename = `Consolidated_Grades_${groupData?.gradeLevel || 'Class'}_${groupData?.section || 'Section'}.pdf`.replace(/\s+/g, '_');
    downloadPdfBuffer(pdfBytes, customFilename || defaultFilename);

    return true;
  } catch (err) {
    console.error('Consolidated vector PDF export error:', err);
    alert('An error occurred while generating the consolidated vector PDF. Fallback print triggered.');
    window.print();
    return false;
  }
}

/**
 * Universal PDF Exporter function.
 */
export async function exportElementToPDF(
  elementId: string,
  filename: string,
  dataContext?: { project?: Project; groupData?: any }
): Promise<boolean> {
  if (dataContext?.project) {
    return exportClassRecordPDF(dataContext.project, filename);
  }
  if (dataContext?.groupData) {
    return exportConsolidatedGradesPDF(dataContext.groupData, filename);
  }

  const element = document.getElementById(elementId);
  if (!element) {
    alert('Document element not found for PDF export.');
    return false;
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 28;
    const usableWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const headerTitle = element.querySelector('h1, h2, h3, .text-xl, .text-2xl')?.textContent?.trim() || 'ACADEMIC EXPORT REPORT';
    page.drawText(fitText(headerTitle, fontBold, 14, usableWidth), {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: COLOR_PRIMARY,
    });
    y -= 20;

    const tables = Array.from(element.querySelectorAll('table'));
    if (tables.length > 0) {
      tables.forEach((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.forEach((row, rIdx) => {
          if (y - 18 < margin + 20) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }

          const cells = Array.from(row.querySelectorAll('th, td'));
          if (cells.length === 0) return;

          const isHeader = rIdx === 0 || row.querySelector('th') !== null;
          const cellWidth = usableWidth / cells.length;

          page.drawRectangle({
            x: margin,
            y: y - 16,
            width: usableWidth,
            height: 16,
            color: isHeader ? COLOR_PRIMARY : rIdx % 2 === 1 ? COLOR_ALT_ROW : rgb(1, 1, 1),
            borderColor: COLOR_BORDER,
            borderWidth: 0.5,
          });

          cells.forEach((cell, cIdx) => {
            const cellText = cell.textContent?.trim() || '';
            page.drawText(fitText(cellText, isHeader ? fontBold : font, 7.5, cellWidth - 6), {
              x: margin + cIdx * cellWidth + 4,
              y: y - 12,
              size: 7.5,
              font: isHeader ? fontBold : font,
              color: isHeader ? rgb(1, 1, 1) : COLOR_TEXT,
            });
          });

          y -= 16;
        });
        y -= 10;
      });
    }

    const pdfBytes = await pdfDoc.save();
    downloadPdfBuffer(pdfBytes, filename);
    return true;
  } catch (err) {
    console.error('DOM-to-Vector PDF generation error:', err);
    window.print();
    return false;
  }
}
