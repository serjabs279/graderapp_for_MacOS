import React, { useState } from 'react';
import { AdviserClass, GlobalSettings } from '../../types';
import { StudentGradeRow } from '../../utils/adviserUtils';
import { X, Printer, Download, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateAcademicAchieverCertificates, CertificateOptions } from '../../utils/adviser/certificateGenerator';
import { exportFile } from '../../utils/fileExportAdapter';
import { isAndroid } from '../../utils/platform';
import { globalToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adviserClass: AdviserClass;
  awardees: StudentGradeRow[];
  globalSettings: GlobalSettings;
  periodLabel: string;
  givenDate: string;
  onGivenDateChange: (date: string) => void;
  averageLabel?: string;
}

export default function CertificatePreviewModal({
  isOpen,
  onClose,
  adviserClass,
  awardees,
  globalSettings,
  periodLabel,
  givenDate,
  onGivenDateChange,
  averageLabel = 'General Average',
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const currentStudent = awardees[currentIndex] || awardees[0];
  const schoolName = globalSettings.schoolName || 'SAN ROQUE PROVINCIAL HIGH SCHOOL';
  const schoolYear = adviserClass.schoolYear || '2026-2027';
  const sectionName = `${adviserClass.gradeLevel} - ${adviserClass.section}`;
  const adviserName = adviserClass.adviserName || 'Class Adviser';
  const principalName = adviserClass.principalName || 'School Principal';

  const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;
  const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;

  const handleDownloadPDF = async () => {
    try {
      const opts: CertificateOptions = { periodLabel, givenDate, averageLabel };
      const doc = generateAcademicAchieverCertificates(adviserClass, awardees, globalSettings, opts);
      const filename = `Certificates_${adviserClass.gradeLevel}_${adviserClass.section}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
      const pdfBytes = doc.output('arraybuffer');
      const saved = await exportFile({
        filename,
        content: new Uint8Array(pdfBytes),
        mimeType: 'application/pdf',
        title: 'Save Academic Achiever Certificates PDF'
      });
      if (saved) {
        globalToast.success(`Academic Excellence Certificates saved as "${filename}".`, 'Certificates Exported');
      }
    } catch (err: any) {
      console.error('Certificate download error:', err);
      globalToast.error('Failed to export certificates: ' + (err.message || String(err)), 'Export Error');
    }
  };

  const handlePrintHTML = () => {
    if (isAndroid()) {
      handleDownloadPDF();
      return;
    }
    window.print();
  };

  return (
    <div className="ui-dialog-overlay">
      <div role="dialog" aria-modal="true" aria-label="Certificate settings and preview" className="ui-dialog max-w-5xl">
        {/* Modal Header & Controls */}
        <div className="ui-dialog-header flex-col items-stretch">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="ui-section-title flex items-center gap-2">
                <Award className="size-5 shrink-0 text-amber-600" /> Certificate preview
              </h3>
              <p className="ui-description mt-1 tabular-nums">{awardees.length} achiever(s) · A4, 2 per page</p>
            </div>
            <button onClick={onClose} className="ui-icon-button" aria-label="Close certificate preview">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownloadPDF} className="adviser-button-primary">
              <Download className="size-4" /> Download PDF
            </button>
            <button onClick={handlePrintHTML} className="adviser-button">
              <Printer className="size-4" /> Print
            </button>
          </div>
        </div>

        {/* Inputs Bar */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Grading Period
            </label>
            <div className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {periodLabel === 'Full Year' ? 'Full Academic Year (Annual)' : periodLabel}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Follows the period selected on the Awardees list.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Date of Certificate Issuance (Editable)
            </label>
            <input
              type="text"
              value={givenDate}
              onChange={(e) => onGivenDateChange(e.target.value)}
              placeholder="e.g. 13th of September 2026 at SAN ROQUE PARISH HIGH SCHOOL, INC."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Shown as: "Given and signed this {givenDate || '[date, month and year at Venue]'}"
            </span>
          </div>
        </div>

        {/* Certificate Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-start">
          {awardees.length > 1 && (
            <div className="flex items-center justify-between w-full max-w-2xl mb-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Learner {currentIndex + 1} of {awardees.length}
              </span>
              <button
                disabled={currentIndex >= awardees.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(awardees.length - 1, prev + 1))}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* HTML Certificate Card (Wysiwyg depiction of the A4 half-page certificate) */}
          <div
            id="certificate-print-area"
            className="w-full max-w-3xl bg-[#fdfcf7] text-slate-800 p-8 sm:p-10 rounded-lg shadow-xl relative border-[5px] border-[#b48c32] select-none flex flex-col justify-between"
            style={{ minHeight: '480px' }}
          >
            {/* Inner Border */}
            <div className="absolute inset-2 sm:inset-3 border-[2px] border-[#daa520] pointer-events-none" />

            {/* Corner Decorative Triangles */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-4 h-4 border-t-[8px] border-l-[8px] border-[#b48c32]" />
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-4 h-4 border-t-[8px] border-r-[8px] border-[#b48c32]" />
            <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-4 h-4 border-b-[8px] border-l-[8px] border-[#b48c32]" />
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-4 h-4 border-b-[8px] border-r-[8px] border-[#b48c32]" />

            {/* Header: Logos & Republic info */}
            <div className="relative flex items-center justify-between px-3 mb-1">
              <div className="w-16 h-16 flex items-center justify-center">
                {depedLogo ? (
                  <img src={depedLogo} alt="DepEd Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    DEPED
                  </div>
                )}
              </div>

              <div className="text-center flex-1 px-4">
                <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Republic of the Philippines
                </p>
                <p className="text-[10.5px] font-bold text-slate-600 tracking-wide uppercase mt-0.5">
                  Department of Education
                </p>
                <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase mt-0.5">
                  {schoolName}
                </h4>
              </div>

              <div className="w-16 h-16 flex items-center justify-center">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    SCHOOL
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center my-3">
              <h2 className="text-xl sm:text-2xl font-black text-[#b48214] tracking-wider uppercase">
                CERTIFICATE OF ACADEMIC EXCELLENCE
              </h2>
              <p className="text-xs sm:text-sm italic text-slate-500 mt-1 font-serif">
                This certificate is proudly awarded to
              </p>
            </div>

            {/* Learner Name: Auto-scales cleanly on a single line */}
            <div className="text-center my-3 px-4 w-full flex justify-center">
              <div className="inline-block max-w-full border-b-[2.5px] border-[#b48c32] px-6 pb-1">
                <h1
                  className="font-black text-[#141e3c] tracking-wide uppercase whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{
                    fontSize:
                      (currentStudent?.name?.length || 0) > 30
                        ? '1.25rem'
                        : (currentStudent?.name?.length || 0) > 22
                          ? '1.5rem'
                          : '1.85rem',
                  }}
                  title={currentStudent?.name}
                >
                  {currentStudent?.name || 'STUDENT NAME'}
                </h1>
              </div>
            </div>

            {/* Citation */}
            <div className="text-center space-y-1.5 my-3 px-4">
              <p className="text-xs sm:text-sm text-slate-700">
                for obtaining an outstanding {averageLabel} of{' '}
                <strong className="font-black text-slate-900">
                  {currentStudent?.generalAverage?.toFixed(2) || '0.00'}
                </strong>{' '}
                and qualifying
              </p>
              <p className="text-base sm:text-lg font-black text-[#b4780a] tracking-wider uppercase">
                {currentStudent?.honorsLabel?.toUpperCase() || 'WITH HONORS'}
              </p>
              <p className="text-xs sm:text-sm text-slate-600">
                {periodLabel && periodLabel !== 'Full Year' ? (
                  <>
                    for the <strong className="font-bold text-slate-800">{periodLabel.toUpperCase()}</strong> of the
                    Academic Year <strong className="font-bold text-slate-800">{schoolYear}</strong> in{' '}
                    <strong className="font-bold text-slate-800">{sectionName}</strong>.
                  </>
                ) : (
                  <>
                    for the Academic Year <strong className="font-bold text-slate-800">{schoolYear}</strong> in{' '}
                    <strong className="font-bold text-slate-800">{sectionName}</strong>.
                  </>
                )}
              </p>

              {givenDate && givenDate.trim() && (
                <p className="text-xs italic text-slate-500 pt-1 font-serif">
                  Given and signed this {givenDate.trim()}.
                </p>
              )}
            </div>

            {/* Signatures */}
            <div className="flex justify-around items-end mt-8 pt-4 pb-2">
              <div className="text-center w-56">
                <div className="border-t-[1.5px] border-slate-500 pt-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {adviserName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Class Adviser</p>
                </div>
              </div>

              <div className="text-center w-56">
                <div className="border-t-[1.5px] border-slate-500 pt-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {principalName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">School Principal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
