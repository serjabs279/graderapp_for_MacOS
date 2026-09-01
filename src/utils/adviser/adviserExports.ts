import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AdviserClass, ImportedSubjectGrades } from '../../types';
import { writeFile } from '@tauri-apps/plugin-fs';
import { globalToast } from '../../context/ToastContext';

interface RecordStudent {
  lrn: string;
  name: string;
  grade: number | null;
  eng: number | null;
  fil: number | null;
}

export function exportAdviserSubjectRecordPDF(
  adviserClass: AdviserClass,
  subjectData: ImportedSubjectGrades,
  students: RecordStudent[],
  logos?: { schoolLogoBase64?: string, depedLogoBase64?: string }
) {
  try {
    const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
    let yPos = 15;

    const schoolLogo = adviserClass.schoolLogoBase64 || logos?.schoolLogoBase64;
    const depedLogo = adviserClass.depedLogoBase64 || logos?.depedLogoBase64;

    if (schoolLogo) {
      try { doc.addImage(schoolLogo, 'PNG', 15, 8, 14, 14); } catch (e) {}
    }
    if (depedLogo) {
      try { doc.addImage(depedLogo, 'PNG', 180, 8, 14, 14); } catch (e) {}
    }

    // --- Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("ADVISER SUBJECT RECORD", 105, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${subjectData.subjectName}`, 15, yPos);
    doc.text(`UID: ${subjectData.subjectUID}`, 120, yPos);
    
    yPos += 6;
    doc.text(`Quarter/Semester: ${subjectData.quarterKey}`, 15, yPos);
    doc.text(`Adviser: ${adviserClass.adviserName}`, 120, yPos);
    
    yPos += 6;
    doc.text(`Section: ${adviserClass.gradeLevel} - ${adviserClass.section}`, 15, yPos);
    doc.text(`School Year: ${adviserClass.schoolYear}`, 120, yPos);

    yPos += 10;

    // --- Table Data ---
    const head = subjectData.isLanguageGroup 
      ? [['No.', 'LRN', 'Student Name', 'English', 'Filipino', 'Languages', 'Remarks']]
      : [['No.', 'LRN', 'Student Name', 'Quarter Grade', 'Remarks']];

    const body = students.map((s, i) => {
      const passed = s.grade !== null && s.grade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed';
      if (subjectData.isLanguageGroup) {
        return [i + 1, s.lrn, s.name, s.eng ?? '', s.fil ?? '', s.grade ?? '', s.grade !== null ? passed : ''];
      }
      return [i + 1, s.lrn, s.name, s.grade ?? '', s.grade !== null ? passed : ''];
    });

    (doc as any).autoTable({
      startY: yPos,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      }
    });

    const filename = `SubjectRecord_${subjectData.subjectName}_${adviserClass.section}.pdf`;
    doc.save(filename);
    globalToast.success(`Subject Record PDF exported as "${filename}".`, 'PDF Export Successful');
  } catch (err: any) {
    console.error('Subject Record PDF export error:', err);
    globalToast.error(err.message || 'Failed to export Subject Record PDF.', 'PDF Export Failed');
  }
}

export function exportAdviserSubjectRecordExcel(
  adviserClass: AdviserClass,
  subjectData: ImportedSubjectGrades,
  students: RecordStudent[]
) {
  try {
    const data = [];
    
    // Header Rows
    data.push(['ADVISER SUBJECT RECORD']);
    data.push([]);
    data.push(['Subject Name', subjectData.subjectName, '', 'Adviser', adviserClass.adviserName]);
    data.push(['Subject UID', subjectData.subjectUID, '', 'Section', `${adviserClass.gradeLevel} - ${adviserClass.section}`]);
    data.push(['Quarter', subjectData.quarterKey, '', 'School Year', adviserClass.schoolYear]);
    data.push([]);

    // Table Headers
    if (subjectData.isLanguageGroup) {
      data.push(['No.', 'LRN', 'Student Name', 'English', 'Filipino', 'Languages', 'Remarks']);
    } else {
      data.push(['No.', 'LRN', 'Student Name', 'Quarter Grade', 'Remarks']);
    }

    // Table Data
    students.forEach((s, i) => {
      const passed = s.grade !== null && s.grade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed';
      if (subjectData.isLanguageGroup) {
        data.push([i + 1, s.lrn, s.name, s.eng ?? '', s.fil ?? '', s.grade ?? '', s.grade !== null ? passed : '']);
      } else {
        data.push([i + 1, s.lrn, s.name, s.grade ?? '', s.grade !== null ? passed : '']);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subject Record");
    
    const filename = `SubjectRecord_${subjectData.subjectName}_${adviserClass.section}.xlsx`;
    XLSX.writeFile(wb, filename);
    globalToast.success(`Subject Record spreadsheet exported as "${filename}".`, 'Excel Export Successful');
  } catch (err: any) {
    console.error('Subject Record Excel export error:', err);
    globalToast.error(err.message || 'Failed to export Subject Record spreadsheet.', 'Excel Export Failed');
  }
}
