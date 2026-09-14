import React, { useState } from 'react';
import { AdviserClass, GlobalSettings } from '../../types';
import { StudentGradeRow } from '../../utils/adviserUtils';
import { X, Printer, Download, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateAcademicAchieverCertificates, CertificateOptions } from '../../utils/adviser/certificateGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adviserClass: AdviserClass;
  awardees: StudentGradeRow[];
  globalSettings: GlobalSettings;
  periodLabel: string;
  onPeriodChange: (period: string) => void;
  givenDate: string;
  onGivenDateChange: (date: string) => void;
}

export default function CertificatePreviewModal({
  isOpen,
  onClose,
  adviserClass,
  awardees,
  globalSettings,
  periodLabel,
  onPeriodChange,
  givenDate,
  onGivenDateChange,
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

  const handleDownloadPDF = () => {
    const opts: CertificateOptions = { periodLabel, givenDate };
    const doc = generateAcademicAchieverCertificates(adviserClass, awardees, globalSettings, opts);
    const filename = `Certificates_${adviserClass.gradeLevel}_${adviserClass.section}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  };

  const handlePrintHTML = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Header & Controls */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Certificate Settings & Preview
            </h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold px-2.5 py-0.5 rounded-full">
              {awardees.length} Achiever(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF (A4 - 2/page)
            </button>
            <button
              onClick={handlePrintHTML}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inputs Bar */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Grading Period / Quarter
            </label>
            <select
              value={periodLabel}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="1st Quarter">1st Quarter</option>
              <option value="2nd Quarter">2nd Quarter</option>
              <option value="3rd Quarter">3rd Quarter</option>
              <option value="4th Quarter">4th Quarter</option>
              <option value="Full Year">Full Academic Year (Annual)</option>
            </select>
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
                for obtaining an outstanding General Average of{' '}
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
