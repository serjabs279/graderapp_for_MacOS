import jsPDF from 'jspdf';
import { getCalendar, getFirstPeriod } from '../../calendar/academicCalendar';
import autoTable from 'jspdf-autotable';
import { AdviserClass, GlobalSettings } from '../../types';
import { GradeMatrix, computeAttendanceSummary } from '../adviserUtils';

export function generateSF9(
  adviserClass: AdviserClass,
  gradeMatrix: GradeMatrix,
  globalSettings: GlobalSettings,
  lrnsToExport?: string[] // if undefined, export all
): jsPDF {
  // A4 Landscape format (297mm x 210mm)
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape' });
  const students = lrnsToExport
    ? gradeMatrix.filter(s => lrnsToExport.includes(s.lrn))
    : gradeMatrix;

  if (students.length === 0) return doc;

  const schoolName = globalSettings.schoolName;

  students.forEach((student, idx) => {
    if (idx > 0) doc.addPage();

    const attSummary = computeAttendanceSummary(adviserClass, student.lrn);
    const observed = adviserClass.observedValues.find(v => v.studentLRN === student.lrn);

    // =========================================================================
    // PAGE 1: COVER / OUTSIDE (Left: Attendance & Transfer, Right: Cover & Info)
    // =========================================================================

    // Draw fold guide line (center divider)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(148.5, 0, 148.5, 210);

    // -------------------------------------------------------------------------
    // PAGE 1 - LEFT COLUMN (Back Cover: Attendance, Signatures, Transfer Certificate)
    // -------------------------------------------------------------------------
    const lx = 10; // Left margin for left column

    // 1. Report on Attendance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("REPORT ON ATTENDANCE", 74.25, 15, { align: 'center' });

    // Attendance Table Header
    doc.setFontSize(7.5);
    const attMonths = adviserClass.attendanceConfig.months; // e.g. June to April

    // Draw Attendance Grid manually for precise alignment
    const rowHeight = 6;
    const colWidth = 8.5;
    const startY = 19;
    const tableWidth = 128;
    const labelWidth = 26;

    // Outer boundary
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(lx, startY, tableWidth, rowHeight * 4);

    // Horizontal grid lines
    for (let r = 1; r < 4; r++) {
      doc.line(lx, startY + (r * rowHeight), lx + tableWidth, startY + (r * rowHeight));
    }

    // Vertical line after row headers
    doc.line(lx + labelWidth, startY, lx + labelWidth, startY + (rowHeight * 4));

    // Headers text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text("No. of School Days", lx + 2, startY + 10);
    doc.text("No. of Days Present", lx + 2, startY + 16);
    doc.text("No. of Days Absent", lx + 2, startY + 22);

    // Draw columns for months + total
    const numCols = attMonths.length;
    for (let i = 0; i <= numCols; i++) {
      const isLast = i === numCols;
      const x = lx + labelWidth + (i * colWidth);

      // Vertical line
      if (i < numCols) {
        doc.line(x, startY, x, startY + (rowHeight * 4));
      } else {
        // Line before Total column
        doc.line(lx + tableWidth - 10, startY, lx + tableWidth - 10, startY + (rowHeight * 4));
      }

      // Column Header Month
      if (!isLast) {
        const m = attMonths[i];
        doc.setFont('helvetica', 'bold');
        doc.text(m.substring(0, 3), x + 1.5, startY + 4);

        // Populate values
        doc.setFont('helvetica', 'normal');
        const ms = attSummary.months[m] || { schoolDays: 0, daysAbsent: 0, daysPresent: 0 };
        doc.text(String(ms.schoolDays || ''), x + 3, startY + 10);
        doc.text(String(ms.daysPresent || ''), x + 3, startY + 16);
        doc.text(String(ms.daysAbsent || '0'), x + 3, startY + 22);
      } else {
        // Total column text
        const tx = lx + tableWidth - 10;
        doc.setFont('helvetica', 'bold');
        doc.text("Total", tx + 1.5, startY + 4);
        doc.text(String(attSummary.totalSchoolDays), tx + 2, startY + 10);
        doc.text(String(attSummary.totalDaysPresent), tx + 2, startY + 16);
        doc.text(String(attSummary.totalDaysAbsent), tx + 2, startY + 22);
      }
    }

    // 2. Parent / Guardian Signatures
    let sigY = startY + (rowHeight * 4) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("PARENT / GUARDIAN'S SIGNATURE", lx, sigY);

    const sigRowH = 5.5;
    const quarters = getCalendar().periods.map(p => p.id);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    quarters.forEach((q, qi) => {
      const y = sigY + 5 + (qi * sigRowH);
      doc.text(q, lx, y);
      doc.setDrawColor(180, 180, 180);
      doc.line(lx + 20, y, lx + 120, y);
    });

    // 3. Certificate of Transfer Block
    let transY = sigY + 30;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("Certificate of Transfer", 74.25, transY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    transY += 5;
    doc.text("Admitted to Grade:", lx, transY);
    doc.line(lx + 25, transY, lx + 55, transY);
    doc.text("Section:", lx + 60, transY);
    doc.line(lx + 72, transY, lx + 128, transY);

    transY += 6;
    doc.text("Eligibility for Admission to Grade:", lx, transY);
    doc.line(lx + 43, transY, lx + 128, transY);

    transY += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(adviserClass.principalName.toUpperCase(), lx + 23.5, transY, { align: 'center' });
    doc.text(adviserClass.adviserName.toUpperCase(), lx + 95, transY, { align: 'center' });
    doc.line(lx + 2, transY - 8, lx + 45, transY - 8);
    doc.line(lx + 75, transY - 8, lx + 115, transY - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text("School Head", lx + 23.5, transY + 4, { align: 'center' });
    doc.text("Teacher/Adviser", lx + 95, transY + 4, { align: 'center' });

    // 4. Cancellation of Eligibility to Transfer Block
    let cancelY = transY + 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Cancellation of Eligibility to Transfer", 74.25, cancelY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    cancelY += 5;
    doc.text("Admitted in:", lx, cancelY);
    doc.line(lx + 17, cancelY, lx + 128, cancelY);

    cancelY += 6;
    doc.text("Date:", lx, cancelY);
    doc.line(lx + 9, cancelY, lx + 50, cancelY);

    cancelY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(adviserClass.principalName.toUpperCase(), lx + 95, cancelY + 4, { align: 'center' });
    doc.line(lx + 75, cancelY - 4, lx + 115, cancelY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text("School Head", lx + 95, cancelY + 8, { align: 'center' });

    // -------------------------------------------------------------------------
    // PAGE 1 - RIGHT COLUMN (Cover Page: DepEd Header, School Logo, Learner Details)
    // -------------------------------------------------------------------------
    const rx = 158.5; // Left margin for right column

    // School Logos (School = left, DepEd = right — standard DepEd layout)
    // Fall back to system-wide default logos if class-specific ones aren't set
    const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;
    const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;

    if (schoolLogo) {
      try { doc.addImage(schoolLogo, 'PNG', rx + 5, 8, 14, 14); } catch (e) { }
    }
    if (depedLogo) {
      try { doc.addImage(depedLogo, 'PNG', rx + 105, 8, 14, 14); } catch (e) { }
    }

    // DepEd Header Info (JHS Style formatting)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Republic of the Philippines", rx + 64, 11, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("Department of Education", rx + 64, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Region X Northern Mindanao", rx + 64, 19, { align: 'center' });
    doc.text("Schools Division Office of Misamis Oriental", rx + 64, 23, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(schoolName.toUpperCase(), rx + 64, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text("Bacoy St. Poblacion, Magsaysay, Misamis Oriental", rx + 64, 32, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(rx, 35, rx + 128, 35);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("REPORT ON LEARNING PROGRESS AND ACHIEVEMENT", rx + 64, 42, { align: 'center' });

    // Learner Bio Info
    let bioY = 52;

    // Fixed alignment columns
    const labelX = rx;
    const valueX = rx + 52;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // LRN
    doc.text("Learner's Reference Number:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(student.lrn, valueX, bioY);

    // Name
    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Name:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(student.name.toUpperCase(), valueX, bioY);

    // Age
    const defaultAgeByGrade = (gl: string): number => {
      const num = parseInt(gl.replace(/\D/g, ''), 10);
      if (isNaN(num)) return 16;
      // Grade 7 -> 13, Grade 8 -> 14, Grade 9 -> 15, Grade 10 -> 16, Grade 11 -> 17, Grade 12 -> 18
      return num >= 7 && num <= 12 ? num + 6 : 16;
    };
    const displayAge = student.age && student.age > 0 ? student.age : defaultAgeByGrade(adviserClass.gradeLevel);

    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Age:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(displayAge), valueX, bioY);

    // Sex
    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Sex:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(student.sex, valueX, bioY);

    // Grade
    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Grade:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(adviserClass.gradeLevel, valueX, bioY);

    // Section
    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Section:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(adviserClass.section.toUpperCase(), valueX, bioY);

    // School Year
    bioY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("School Year:", labelX, bioY);
    doc.setFont('helvetica', 'bold');
    doc.text(adviserClass.schoolYear, valueX, bioY);

    // Track / Strand (SHS only)
    if (adviserClass.workspace === 'SHS') {
      bioY += 6;

      doc.setFont('helvetica', 'normal');
      doc.text("Track / Strand:", labelX, bioY);

      doc.setFont('helvetica', 'bold');
      doc.text(
        adviserClass.trackStrand || 'Senior High School',
        valueX,
        bioY
      );
    }

    // Message to Parents
    let msgY = bioY + 16;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Dear Parent/Guardian,", rx, msgY);
    msgY += 5;

    const introText = "This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values.\n\nThe school welcomes you should you desire to know more about your child's progress.";
    const lines = doc.splitTextToSize(introText, 128);
    doc.text(lines, rx, msgY);

    // Signatures
    let sig2Y = msgY + 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(adviserClass.adviserName.toUpperCase(), rx + 95, sig2Y, { align: 'center' });
    doc.line(rx + 65, sig2Y - 8, rx + 125, sig2Y - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Teacher/Adviser", rx + 95, sig2Y + 4, { align: 'center' });

    sig2Y += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(adviserClass.principalName.toUpperCase(), rx + 30, sig2Y, { align: 'center' });
    doc.line(rx, sig2Y - 8, rx + 60, sig2Y - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("School Head", rx + 30, sig2Y + 4, { align: 'center' });

    // =========================================================================
    // PAGE 2: INSIDE PAGES (Left: Subjects Report Card, Right: Core Values)
    // =========================================================================
    doc.addPage();

    // Draw fold guide line (center divider)
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(148.5, 0, 148.5, 210);

    // -------------------------------------------------------------------------
    // PAGE 2 - LEFT COLUMN (Learning Achievement Tables)
    // -------------------------------------------------------------------------

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("REPORT ON LEARNING PROGRESS AND ACHIEVEMENT", 74.25, 12, { align: 'center' });

    const isSHS = adviserClass.workspace === 'SHS';
    let tableY = 16;

    if (!isSHS) {
      // Junior High School Table (All 4 Quarters in 1 table)
      // Headers matching the DepEd layout: "Learning Areas" | Quarter (1, 2, 3, 4) | Final Rating | Remarks
      const headRow = ['Learning Areas', '1', '2', '3', '4', 'Final Rating', 'Remarks'];
      const bodyRows: any[][] = [];
      const subRowIndices = new Set<number>();

      student.subjects.forEach(subj => {
        const remarks = subj.finalGrade === null ? '' : (subj.finalGrade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
        const parentRowIndex = bodyRows.length;
        bodyRows.push([
          subj.subjectName,
          subj.quarters[getCalendar().periods[0]?.id as string] ?? '',
          subj.quarters[getCalendar().periods[1]?.id as string] ?? '',
          subj.quarters[getCalendar().periods[2]?.id as string] ?? '',
          subj.quarters[getCalendar().periods[3]?.id as string] ?? '',
          subj.finalGrade ?? '',
          remarks
        ]);

        // For composite subjects in JHS (e.g. MAPEH with Music & Arts, PE & Health), display each component under it
        if ((subj.isMAPEHGroup || subj.isLanguageGroup) && subj.languageComponents && subj.languageComponents.length > 0) {
          subj.languageComponents.forEach(comp => {
            const compQuarters = subj.languageQuarters?.[comp] || {};
            const q1 = compQuarters[getCalendar().periods[0]?.id as string] ?? null;
            const q2 = compQuarters[getCalendar().periods[1]?.id as string] ?? null;
            const q3 = compQuarters[getCalendar().periods[2]?.id as string] ?? null;
            const q4 = compQuarters[getCalendar().periods[3]?.id as string] ?? null;

            const validGrades = [q1, q2, q3, q4].filter((g): g is number => g !== null && !isNaN(g));
            const compFinal = validGrades.length > 0
              ? Math.round((validGrades.reduce((a, b) => a + b, 0) / validGrades.length) * 100) / 100
              : null;
            const compRemarks = compFinal === null ? '' : (compFinal >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');

            subRowIndices.add(bodyRows.length);
            bodyRows.push([
              `    ${comp}`,
              q1 ?? '',
              q2 ?? '',
              q3 ?? '',
              q4 ?? '',
              compFinal ?? '',
              compRemarks
            ]);
          });
        }
      });

      // General Average row
      const genAvgIndex = bodyRows.length;
      bodyRows.push([
        'General Average',
        '', '', '', '',
        student.generalAverage ?? '',
        student.promotionStatus === 'Promoted' ? 'Passed' : (student.promotionStatus === 'Retained' ? 'Failed' : '')
      ]);

      autoTable(doc, {
        startY: tableY,
        margin: { left: lx, right: 158.5 },
        head: [headRow],
        body: bodyRows,
        theme: 'grid',
        styles: { fontSize: 9.2, cellPadding: { top: 5.2, bottom: 5.2, left: 1.5, right: 1.5 }, overflow: 'visible' },
        headStyles: { fillColor: [44, 62, 80], halign: 'center', fontSize: 8.8, cellPadding: { top: 3.5, bottom: 3.5, left: 1, right: 1 } },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 42 },
          1: { halign: 'center', cellWidth: 12 },
          2: { halign: 'center', cellWidth: 12 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 18 }
        },
        didParseCell: function (data: any) {
          if (data.section === 'body') {
            if (data.row.index === genAvgIndex) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            } else if (subRowIndices.has(data.row.index)) {
              // Sub-component rows (Music & Arts, PE & Health)
              if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'normal';
                data.cell.styles.textColor = [70, 70, 70];
              } else if (data.column.index === 5) {
                data.cell.styles.fontStyle = 'normal';
              }
            }
          }
        }
      });

    } else {
      // Senior High School Layout (Split into Semester 1 and Semester 2 tables)
      // Semester 1 contains subjects that have grades in Q1 or Q2
      const sem1Subjects = student.subjects.filter(s =>
        s.quarters[getCalendar().periods[0]?.id as string] !== null || s.quarters[getCalendar().periods[1]?.id as string] !== null
      );
      // Semester 2 contains subjects that have grades in Q3 or Q4
      const sem2Subjects = student.subjects.filter(s =>
        s.quarters[getCalendar().periods[2]?.id as string] !== null || s.quarters[getCalendar().periods[3]?.id as string] !== null
      );

      // Semester 1 Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("First Semester", lx, tableY - 1);

      const sem1Head = ['Subjects', '1', '2', 'Semester Final Grade', 'Remarks'];
      const sem1Body = sem1Subjects.map(subj => {
        // Average of Q1 and Q2
        const q1 = subj.quarters[getCalendar().periods[0]?.id as string];
        const q2 = subj.quarters[getCalendar().periods[1]?.id as string];
        const vals = [q1, q2].filter((g): g is number => g !== null);
        const finalGrade = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
        const remarks = finalGrade === null ? '' : (finalGrade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
        return [
          subj.subjectName,
          q1 ?? '',
          q2 ?? '',
          finalGrade ?? '',
          remarks
        ];
      });

      // Calculate Sem 1 General Average
      const sem1Grades = sem1Body.map(row => Number(row[3])).filter(g => !isNaN(g) && g > 0);
      const sem1Avg = sem1Grades.length > 0 ? Math.round(sem1Grades.reduce((a, b) => a + b, 0) / sem1Grades.length) : '';
      sem1Body.push([
        'General Average for the Semester',
        '', '',
        sem1Avg,
        sem1Avg ? (Number(sem1Avg) >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed') : ''
      ]);

      const t1 = autoTable(doc, {
        startY: tableY,
        margin: { left: lx, right: 158.5 },
        head: [sem1Head],
        body: sem1Body,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [44, 62, 80], halign: 'center', fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 10 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 16 }
        },
        didParseCell: function (data: any) {
          if (data.section === 'body' && data.row.index === sem1Body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });

      const lastY1 = (doc as any).lastAutoTable?.finalY;
      tableY = (typeof lastY1 === 'number' && !isNaN(lastY1)) ? lastY1 + 8 : tableY + 45;

      // Semester 2 Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("Second Semester", lx, tableY - 1);

      const sem2Head = ['Subjects', '3', '4', 'Semester Final Grade', 'Remarks'];
      const sem2Body = sem2Subjects.map(subj => {
        // Average of Q3 and Q4
        const q3 = subj.quarters[getCalendar().periods[2]?.id as string];
        const q4 = subj.quarters[getCalendar().periods[3]?.id as string];
        const vals = [q3, q4].filter((g): g is number => g !== null);
        const finalGrade = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
        const remarks = finalGrade === null ? '' : (finalGrade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
        return [
          subj.subjectName,
          q3 ?? '',
          q4 ?? '',
          finalGrade ?? '',
          remarks
        ];
      });

      // Calculate Sem 2 General Average
      const sem2Grades = sem2Body.map(row => Number(row[3])).filter(g => !isNaN(g) && g > 0);
      const sem2Avg = sem2Grades.length > 0 ? Math.round(sem2Grades.reduce((a, b) => a + b, 0) / sem2Grades.length) : '';
      sem2Body.push([
        'General Average for the Semester',
        '', '',
        sem2Avg,
        sem2Avg ? (Number(sem2Avg) >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed') : ''
      ]);

      autoTable(doc, {
        startY: tableY,
        margin: { left: lx, right: 158.5 },
        head: [sem2Head],
        body: sem2Body,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [44, 62, 80], halign: 'center', fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 10 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 16 }
        },
        didParseCell: function (data: any) {
          if (data.section === 'body' && data.row.index === sem2Body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
    }

    // -------------------------------------------------------------------------
    // PAGE 2 - RIGHT COLUMN (Observed Values & Grading Scale Legend)
    // -------------------------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("REPORT ON LEARNER'S OBSERVED VALUES", rx + 64, 12, { align: 'center' });

    let valY = 16;
    const valuesHead = ['Core Values', 'Behavior Statements', '1', '2', '3', '4'];
    const getVal = (field: 'responsible' | 'obedient' | 'compassionate' | 'kind' | 'serviceOriented', q: string) =>
      observed?.quarters[q]?.[field] ?? '';

    const valuesBody = [
      ['1. Responsible', 'Demonstrates reliability and accountability in tasks and duties', getVal('responsible', getCalendar().periods[0]?.id as string), getVal('responsible', getCalendar().periods[1]?.id as string), getVal('responsible', getCalendar().periods[2]?.id as string), getVal('responsible', getCalendar().periods[3]?.id as string)],
      ['2. Obedient', 'Follows rules, regulations, and instructions of authority', getVal('obedient', getCalendar().periods[0]?.id as string), getVal('obedient', getCalendar().periods[1]?.id as string), getVal('obedient', getCalendar().periods[2]?.id as string), getVal('obedient', getCalendar().periods[3]?.id as string)],
      ['3. Compassionate', 'Shows empathy, care, and understanding towards others', getVal('compassionate', getCalendar().periods[0]?.id as string), getVal('compassionate', getCalendar().periods[1]?.id as string), getVal('compassionate', getCalendar().periods[2]?.id as string), getVal('compassionate', getCalendar().periods[3]?.id as string)],
      ['4. Kind', 'Exhibits helpfulness, friendliness, and politeness to all', getVal('kind', getCalendar().periods[0]?.id as string), getVal('kind', getCalendar().periods[1]?.id as string), getVal('kind', getCalendar().periods[2]?.id as string), getVal('kind', getCalendar().periods[3]?.id as string)],
      ['5. Service Oriented', 'Actively participates in classroom, school, and community activities', getVal('serviceOriented', getCalendar().periods[0]?.id as string), getVal('serviceOriented', getCalendar().periods[1]?.id as string), getVal('serviceOriented', getCalendar().periods[2]?.id as string), getVal('serviceOriented', getCalendar().periods[3]?.id as string)]
    ];

    const valResult = autoTable(doc, {
      startY: valY,
      margin: { left: rx, right: 10 },
      head: [valuesHead],
      body: valuesBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 2.2, bottom: 2.2, left: 1, right: 1 } },
      headStyles: { fillColor: [44, 62, 80], halign: 'center', fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 28 },
        1: { cellWidth: 62 },
        2: { halign: 'center', cellWidth: 9.5 },
        3: { halign: 'center', cellWidth: 9.5 },
        4: { halign: 'center', cellWidth: 9.5 },
        5: { halign: 'center', cellWidth: 9.5 }
      }
    });

    const lastValY = (doc as any).lastAutoTable?.finalY;
    let legendY = (typeof lastValY === 'number' && !isNaN(lastValY)) ? lastValY + 8 : valY + 60;

    // Subheader
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Observed Values Legend", rx, legendY);

    legendY += 3;
    const legendHead = ['Marking', 'Non-numerical Rating'];
    const legendBody = [
      ['AO', 'Always Observed'],
      ['SO', 'Sometimes Observed'],
      ['RO', 'Rarely Observed'],
      ['NO', 'Not Observed']
    ];

    autoTable(doc, {
      startY: legendY,
      margin: { left: rx, right: 60 },
      head: [legendHead],
      body: legendBody,
      theme: 'grid',
      styles: { fontSize: 7.2, cellPadding: 1.4 },
      headStyles: { fillColor: [127, 140, 141], halign: 'center', fontSize: 7.5 },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
        1: {}
      }
    });

    // Learner Progress Scale Descriptor Legend
    const lastLegY = (doc as any).lastAutoTable?.finalY;
    let descY = (typeof lastLegY === 'number' && !isNaN(lastLegY)) ? lastLegY + 8 : legendY + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Learner Progress and Achievement scale", rx, descY);

    descY += 3;
    const descHead = ['Descriptors', 'Grading Scale', 'Remarks'];
    const descBody = [
      ['Outstanding', '90 - 100', 'Passed'],
      ['Very Satisfactory', '85 - 89', 'Passed'],
      ['Satisfactory', '80 - 84', 'Passed'],
      ['Fairly Satisfactory', '75 - 74', 'Passed'],
      ['Did Not Meet Expectation', 'Below 75', 'Failed']
    ];

    autoTable(doc, {
      startY: descY,
      margin: { left: rx, right: 10 },
      head: [descHead],
      body: descBody,
      theme: 'grid',
      styles: { fontSize: 7.2, cellPadding: 1.4 },
      headStyles: { fillColor: [127, 140, 141], halign: 'center', fontSize: 7.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { halign: 'center', cellWidth: 32 },
        2: { halign: 'center' }
      }
    });

  });

  return doc;
}
