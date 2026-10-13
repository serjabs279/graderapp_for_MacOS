import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, HonorsLabel } from '../../types';
import { GradeMatrix } from '../../utils/adviserUtils';
import { generateAcademicAchieverCertificates, getDefaultCertificateDate } from '../../utils/adviser/certificateGenerator';
import { exportFile } from '../../utils/fileExportAdapter';
import { globalToast } from '../../context/ToastContext';
import { Star, Printer, Medal, Award, Eye, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CertificatePreviewModal from './CertificatePreviewModal';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function AwardeesTab({ adviserClass, gradeMatrix }: Props) {
  const { globalSettings } = useApp();
  const [periodLabel, setPeriodLabel] = useState<string>('1st Quarter');
  const [givenDate, setGivenDate] = useState<string>(() => {
    return getDefaultCertificateDate(globalSettings.schoolName || (adviserClass as any).schoolName || 'SAN ROQUE PARISH HIGH SCHOOL, INC.');
  });
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const awardees = useMemo(() => {
    return gradeMatrix
      .filter((s: import('../../utils/adviserUtils').StudentGradeRow) => s.honorsLabel !== null)
      .sort((a: import('../../utils/adviserUtils').StudentGradeRow, b: import('../../utils/adviserUtils').StudentGradeRow) => {
        const honorWeight = (h: HonorsLabel | null | undefined) => {
          if (h === 'With Highest Honors') return 3;
          if (h === 'With High Honors') return 2;
          if (h === 'With Honors') return 1;
          return 0;
        };
        const wA = honorWeight(a.honorsLabel);
        const wB = honorWeight(b.honorsLabel);
        if (wA !== wB) return wB - wA;
        return (b.generalAverage ?? 0) - (a.generalAverage ?? 0);
      });
  }, [gradeMatrix]);

  const highestHonors = awardees.filter(a => a.honorsLabel === 'With Highest Honors');
  const highHonors = awardees.filter(a => a.honorsLabel === 'With High Honors');
  const honors = awardees.filter(a => a.honorsLabel === 'With Honors');

  const handleGenerateCertificates = async () => {
    if (awardees.length === 0) {
      globalToast.error('No academic achievers found to generate certificates for.', 'No Achievers');
      return;
    }
    try {
      const doc = generateAcademicAchieverCertificates(adviserClass, awardees, globalSettings, {
        periodLabel,
        givenDate
      });
      const filename = `Certificates_${adviserClass.gradeLevel}_${adviserClass.section}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
      const pdfBytes = doc.output('arraybuffer');
      const saved = await exportFile({
        filename,
        content: new Uint8Array(pdfBytes),
        mimeType: 'application/pdf',
        title: 'Save Academic Achiever Certificates PDF'
      });
      if (saved) {
        globalToast.success(`Generated ${awardees.length} Academic Excellence Certificate(s) (A4 Portrait, 2 per page) saved as "${filename}".`, 'Certificates Generated');
      }
    } catch (err: any) {
      console.error('Certificate generation error:', err);
      globalToast.error('Failed to generate certificates: ' + (err.message || String(err)), 'Generation Error');
    }
  };

  const handleDownloadAwardeesListPDF = async () => {
    if (awardees.length === 0) {
      globalToast.error('No academic achievers found to export.', 'No Achievers');
      return;
    }
    try {
      const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
      const schoolName = globalSettings.schoolName || 'SAN ROQUE PARISH HIGH SCHOOL INCORPORATED';
      const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;
      const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;

      let yPos = 16;
      if (schoolLogo) {
        try { doc.addImage(schoolLogo, 'PNG', 14, 10, 14, 14); } catch {}
      }
      if (depedLogo) {
        try { doc.addImage(depedLogo, 'PNG', 182, 10, 14, 14); } catch {}
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Republic of the Philippines", 105, yPos, { align: 'center' });
      yPos += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Department of Education", 105, yPos, { align: 'center' });
      yPos += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Region X Northern Mindanao", 105, yPos, { align: 'center' });
      yPos += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(schoolName.toUpperCase(), 105, yPos, { align: 'center' });
      yPos += 6;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(14, yPos, 196, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("OFFICIAL LIST OF ACADEMIC EXCELLENCE AWARDEES", 105, yPos, { align: 'center' });
      yPos += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Grade ${adviserClass.gradeLevel} - Section ${adviserClass.section}  |  School Year: ${adviserClass.schoolYear}  |  Period: ${periodLabel}`, 105, yPos, { align: 'center' });
      yPos += 6;

      const bodyData = awardees.map((row, idx) => [
        idx + 1,
        row.lrn,
        row.name.toUpperCase(),
        row.honorsLabel ?? 'Honors',
        row.generalAverage?.toFixed(2) ?? '—'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['No.', 'LRN', 'Learner Name', 'Academic Honor', 'Final Average']],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [180, 130, 20], halign: 'center', fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 32 },
          2: { fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 42 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? yPos + 60;
      let sigY = finalY + 22;
      if (sigY > 265) {
        doc.addPage();
        sigY = 30;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text((adviserClass.adviserName || 'Class Adviser').toUpperCase(), 50, sigY, { align: 'center' });
      doc.line(20, sigY - 4, 80, sigY - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text("Class Adviser", 50, sigY + 4, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text((adviserClass.principalName || 'School Principal').toUpperCase(), 160, sigY, { align: 'center' });
      doc.line(130, sigY - 4, 190, sigY - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text("School Head / Principal", 160, sigY + 4, { align: 'center' });

      const filename = `Awardees_List_${adviserClass.gradeLevel}_${adviserClass.section}_SY${adviserClass.schoolYear}.pdf`;
      const pdfBytes = doc.output('arraybuffer');
      const saved = await exportFile({
        filename,
        content: new Uint8Array(pdfBytes),
        mimeType: 'application/pdf',
        title: 'Save Awardees List PDF'
      });
      if (saved) {
        globalToast.success(`Awardees List exported as "${filename}".`, 'PDF Exported');
      }
    } catch (err: any) {
      console.error('Awardees list export error:', err);
      globalToast.error('Failed to export awardees list: ' + (err.message || String(err)), 'Export Error');
    }
  };

  const Section = ({ title, data, iconColor, bgHeader }: { title: string; data: typeof awardees; iconColor: string; bgHeader: string }) => {
    if (data.length === 0) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className={`px-6 py-4 ${bgHeader} border-b border-slate-200 dark:border-slate-800 flex items-center gap-3`}>
          <Medal className={`h-6 w-6 ${iconColor}`} />
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
          <span className="ml-auto bg-white/50 dark:bg-black/20 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
            {data.length} Learner(s)
          </span>
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 font-bold text-slate-500 w-16 text-center">No.</th>
              <th className="px-6 py-4 font-bold text-slate-500">Learner Name</th>
              <th className="px-6 py-4 font-bold text-slate-500 text-right w-32">Final Average</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, idx) => (
              <tr key={row.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-center font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">{idx + 1}</td>
                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                  {row.name}
                  <div className="text-[10px] font-mono font-normal text-slate-400 mt-0.5">{row.lrn}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-black text-slate-700 dark:text-slate-200">
                  {row.generalAverage?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Academic Excellence Awardees
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">End of school year honors and recognition.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <button 
             onClick={() => setShowPreviewModal(true)}
             disabled={awardees.length === 0}
             className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 disabled:opacity-50 rounded-xl shadow-sm cursor-pointer transition-all"
           >
              <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Preview & Edit Settings
           </button>
           <button 
             onClick={handleGenerateCertificates}
             disabled={awardees.length === 0}
             className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-sm cursor-pointer transition-all"
           >
              <Award className="h-4 w-4 text-amber-200" /> Generate Certificates (A4)
           </button>
           <button 
             onClick={handleDownloadAwardeesListPDF}
             disabled={awardees.length === 0}
             className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
             title="Download Official Awardees List PDF"
           >
              <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Download List PDF
           </button>
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 cursor-pointer"
           >
              <Printer className="h-4 w-4 text-slate-500" /> Print List
           </button>
        </div>
      </div>

      {awardees.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Star className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No Awardees Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Honors are calculated based on the final general average and the minimum grade requirement in any subject.
          </p>
        </div>
      ) : (
        <>
          <Section title="With Highest Honors" data={highestHonors} iconColor="text-yellow-500" bgHeader="bg-yellow-50 dark:bg-yellow-900/20" />
          <Section title="With High Honors" data={highHonors} iconColor="text-slate-400" bgHeader="bg-slate-100 dark:bg-slate-800/50" />
          <Section title="With Honors" data={honors} iconColor="text-amber-700" bgHeader="bg-amber-50 dark:bg-amber-900/10" />
        </>
      )}

      {/* Certificate HTML Preview & Settings Modal */}
      {showPreviewModal && (
        <CertificatePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          adviserClass={adviserClass}
          awardees={awardees}
          globalSettings={globalSettings}
          periodLabel={periodLabel}
          onPeriodChange={setPeriodLabel}
          givenDate={givenDate}
          onGivenDateChange={setGivenDate}
        />
      )}
    </div>
  );
}
