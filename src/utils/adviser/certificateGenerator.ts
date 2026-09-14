import jsPDF from 'jspdf';
import { AdviserClass, GlobalSettings } from '../../types';
import { StudentGradeRow } from '../adviserUtils';

export interface CertificateOptions {
  periodLabel?: string; // e.g. "1st Quarter" or "Academic Year"
  givenDate?: string;   // e.g. "13th of September 2026 at San Roque Parish High School Incorporated's Campus."
}

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
}

export function getDefaultCertificateDate(schoolName: string = 'SAN ROQUE PARISH HIGH SCHOOL, INC.'): string {
  const d = new Date();
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day}${suffix} of ${month} ${year} at ${schoolName}.`;
}

/**
 * Generates Academic Excellence Certificates for achievers.
 * Layout: A4 Paper (210mm x 297mm), Portrait Orientation.
 * Formatted to fit EXACTLY 2 certificates per 1 A4 page (top half & bottom half).
 */
export function generateAcademicAchieverCertificates(
  adviserClass: AdviserClass,
  achievers: StudentGradeRow[],
  globalSettings: GlobalSettings,
  options?: CertificateOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const certHeight = 148.5; // Exactly half of 297mm

  const schoolName = globalSettings.schoolName || 'SAN ROQUE PARISH HIGH SCHOOL, INC.';
  const schoolYear = adviserClass.schoolYear || '2026-2027';
  const sectionName = `${adviserClass.gradeLevel} - ${adviserClass.section}`;
  const adviserName = adviserClass.adviserName || 'Class Adviser';
  const principalName = adviserClass.principalName || 'School Principal';

  // Render certificates 2 per page
  achievers.forEach((student, index) => {
    const pageIndex = Math.floor(index / 2);
    const posOnPage = index % 2; // 0 = top half, 1 = bottom half

    if (posOnPage === 0 && index > 0) {
      doc.addPage();
    }

    const startY = posOnPage * certHeight;

    // Draw Certificate Outer & Inner Borders
    const margin = 7;
    const certW = pageWidth - (margin * 2);
    const certH = certHeight - (margin * 2);
    const topY = startY + margin;

    // Outer double border
    doc.setDrawColor(180, 140, 50); // Gold border
    doc.setLineWidth(1.2);
    doc.rect(margin, topY, certW, certH);

    doc.setDrawColor(218, 165, 32); // Inner gold accent line
    doc.setLineWidth(0.4);
    doc.rect(margin + 2.5, topY + 2.5, certW - 5, certH - 5);

    // Corner decorative accents
    const drawCorner = (cx: number, cy: number) => {
      doc.setFillColor(180, 140, 50);
      doc.triangle(cx, cy, cx + 4, cy, cx, cy + 4, 'F');
    };
    drawCorner(margin + 2.5, topY + 2.5);
    drawCorner(margin + certW - 2.5 - 4, topY + 2.5);
    drawCorner(margin + 2.5, topY + certH - 2.5 - 4);
    drawCorner(margin + certW - 2.5 - 4, topY + certH - 2.5 - 4);

    // Dotted separator between top and bottom certificate (only for top certificate)
    if (posOnPage === 0) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(4, certHeight, pageWidth - 4, certHeight);
      doc.setLineDashPattern([], 0); // reset
    }

    // Embed Logos if available
    const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;
    const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;

    const logoSize = 18;
    if (depedLogo) {
      try {
        doc.addImage(depedLogo, 'PNG', margin + 7, topY + 7, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add DepEd logo', e);
      }
    }
    if (schoolLogo) {
      try {
        doc.addImage(schoolLogo, 'PNG', margin + certW - 7 - logoSize, topY + 7, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add School logo', e);
      }
    }

    // Header Titles (Proportionally larger, cleaner vertical rhythm)
    let currentY = topY + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFontSize(8.5);
    doc.text('DEPARTMENT OF EDUCATION', pageWidth / 2, currentY, { align: 'center' });

    currentY += 5;
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(180, 130, 20); // Golden brown
    doc.text('CERTIFICATE OF ACADEMIC EXCELLENCE', pageWidth / 2, currentY, { align: 'center' });

    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text('This certificate is proudly awarded to', pageWidth / 2, currentY, { align: 'center' });

    // Learner Name with AUTO-SCALING (Always stays on 1 line within max width)
    currentY += 11;
    doc.setFont('helvetica', 'bold');
    const studentNameUpper = student.name.toUpperCase();
    const maxNameWidth = certW - 40; // Max allowed printable width for name on 1 line
    let nameFontSize = 18;
    doc.setFontSize(nameFontSize);

    // Auto-scale font down if name is very long
    while (doc.getTextWidth(studentNameUpper) > maxNameWidth && nameFontSize > 9) {
      nameFontSize -= 0.5;
      doc.setFontSize(nameFontSize);
    }

    doc.setTextColor(20, 30, 60); // Deep navy
    doc.text(studentNameUpper, pageWidth / 2, currentY, { align: 'center' });

    // Underline for name
    const nameWidth = doc.getTextWidth(studentNameUpper);
    doc.setDrawColor(180, 140, 50);
    doc.setLineWidth(0.6);
    const linePad = Math.min(8, (certW - nameWidth) / 4);
    doc.line((pageWidth / 2) - (nameWidth / 2) - linePad, currentY + 1.8, (pageWidth / 2) + (nameWidth / 2) + linePad, currentY + 1.8);

    // Citation Body
    currentY += 8.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);

    const honorText = student.honorsLabel || 'With Honors';
    const genAvg = student.generalAverage ? student.generalAverage.toFixed(2) : '';

    doc.text(
      `for obtaining an outstanding General Average of ${genAvg} and qualifying`,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 120, 10);
    doc.text(honorText.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

    currentY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    // Period text: e.g. "for the 1ST QUARTER of the Academic Year 2026-2027 in Grade 7 - STA."
    const periodStr = options?.periodLabel && options.periodLabel !== 'Full Year'
      ? `for the ${options.periodLabel.toUpperCase()} of the Academic Year ${schoolYear} in ${sectionName}.`
      : `for the Academic Year ${schoolYear} in ${sectionName}.`;

    doc.text(
      periodStr,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );

    // Given and signed date line
    if (options?.givenDate && options.givenDate.trim()) {
      currentY += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Given and signed this ${options.givenDate.trim()}.`,
        pageWidth / 2,
        currentY,
        { align: 'center' }
      );
    }

    // Signatures at Bottom
    const sigY = topY + certH - 18;
    const sigCol1 = margin + 42;
    const sigCol2 = margin + certW - 42;

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.4);

    // Left: Adviser
    doc.line(sigCol1 - 30, sigY, sigCol1 + 30, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(adviserName.toUpperCase(), sigCol1, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('Class Adviser', sigCol1, sigY + 7.5, { align: 'center' });

    // Right: Principal
    doc.line(sigCol2 - 30, sigY, sigCol2 + 30, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(principalName.toUpperCase(), sigCol2, sigY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('School Principal', sigCol2, sigY + 7.5, { align: 'center' });
  });

  return doc;
}
