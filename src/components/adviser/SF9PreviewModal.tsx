import React, { useState } from 'react';
import { AdviserClass, GlobalSettings } from '../../types';
import { GradeMatrix, StudentGradeRow, computeAttendanceSummary } from '../../utils/adviserUtils';
import { getCalendar } from '../../calendar/academicCalendar';
import {
  X,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserCheck,
  Award,
  Layers
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
  globalSettings: GlobalSettings;
  selectedLrns: string[];
  onDownloadPDF: () => void;
}

export default function SF9PreviewModal({
  isOpen,
  onClose,
  adviserClass,
  gradeMatrix,
  globalSettings,
  selectedLrns,
  onDownloadPDF,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSheet, setActiveSheet] = useState<'inside' | 'cover'>('inside');

  if (!isOpen) return null;

  const students = selectedLrns.length > 0
    ? gradeMatrix.filter((s) => selectedLrns.includes(s.lrn))
    : gradeMatrix;

  if (students.length === 0) return null;

  const currentStudent = students[currentIndex] ?? students[0];
  const attSummary = computeAttendanceSummary(adviserClass, currentStudent.lrn);
  const observed = adviserClass.observedValues?.find((v) => v.studentLRN === currentStudent.lrn);

  const schoolName = globalSettings.schoolName || 'SAN ROQUE PARISH HIGH SCHOOL';
  const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;
  const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;
  const isSHS = adviserClass.workspace === 'SHS';
  const attMonths = adviserClass.attendanceConfig?.months || [];
  const quarters = getCalendar().periods.map((p) => p.id);

  const defaultAgeByGrade = (gl: string): number => {
    const num = parseInt(gl.replace(/\D/g, ''), 10);
    if (isNaN(num)) return 16;
    return num >= 7 && num <= 12 ? num + 6 : 16;
  };
  const displayAge = currentStudent.age && currentStudent.age > 0
    ? currentStudent.age
    : defaultAgeByGrade(adviserClass.gradeLevel);

  const currentStudentObj = adviserClass.students.find(s => s.lrn === currentStudent.lrn);
  const currentStudentTrack = currentStudentObj?.trackStrand || currentStudent.trackStrand || adviserClass.trackStrand || 'SHS';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* ── Toolbar Header ── */}
        <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-tight">
                  SF-9 Report Card Preview
                </h3>
                <span className="text-[11px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                  HTML View
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentStudent.name} <span className="font-mono text-[11px]">({currentStudent.lrn})</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {/* Sheet Selector (Cover vs Inside) */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveSheet('inside')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  activeSheet === 'inside'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Inside (Grades & Values)
              </button>
              <button
                onClick={() => setActiveSheet('cover')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  activeSheet === 'cover'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Cover & Attendance
              </button>
            </div>

            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              title="Save as official PDF"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download</span> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Multi-student pagination bar ── */}
        {students.length > 1 && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="font-bold text-slate-500 dark:text-slate-400">
              Student {currentIndex + 1} of {students.length}
            </span>
            <button
              disabled={currentIndex >= students.length - 1}
              onClick={() => setCurrentIndex((p) => Math.min(students.length - 1, p + 1))}
              className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Scrollable Card Canvas ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/60 dark:bg-slate-950 flex flex-col items-center">
          
          {/* Card Container mimicking DepEd A4 fold format */}
          <div className="w-full max-w-5xl bg-white text-slate-900 rounded-lg shadow-xl border border-slate-300 p-4 sm:p-8 font-sans text-xs">
            
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* SHEET 1: INSIDE (Left: Learning Areas, Right: Core Values)      */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeSheet === 'inside' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                
                {/* ── LEFT COLUMN: LEARNING PROGRESS & ACHIEVEMENT ── */}
                <div className="space-y-3">
                  <div className="text-center border-b border-slate-300 pb-2">
                    <h4 className="font-black text-xs uppercase tracking-wide text-slate-800">
                      REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {adviserClass.gradeLevel} - {adviserClass.section} • SY {adviserClass.schoolYear}
                    </p>
                  </div>

                  {!isSHS ? (
                    /* JHS GRADES TABLE */
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-400 text-[11px]">
                        <thead>
                          <tr className="bg-slate-200 text-slate-800 font-bold text-center">
                            <th className="border border-slate-400 px-2 py-1.5 text-left font-black">Learning Areas</th>
                            <th className="border border-slate-400 px-1 py-1.5 w-8">1</th>
                            <th className="border border-slate-400 px-1 py-1.5 w-8">2</th>
                            <th className="border border-slate-400 px-1 py-1.5 w-8">3</th>
                            <th className="border border-slate-400 px-1 py-1.5 w-8">4</th>
                            <th className="border border-slate-400 px-1.5 py-1.5 w-14 font-black">Final</th>
                            <th className="border border-slate-400 px-1.5 py-1.5 w-14">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentStudent.subjects.map((subj, idx) => {
                            const remarks = subj.finalGrade === null
                              ? ''
                              : (subj.finalGrade >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
                            return (
                              <React.Fragment key={idx}>
                                <tr className="hover:bg-slate-50">
                                  <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">
                                    {subj.subjectName}
                                  </td>
                                  <td className="border border-slate-300 text-center py-1">
                                    {subj.quarters[quarters[0] as string] ?? ''}
                                  </td>
                                  <td className="border border-slate-300 text-center py-1">
                                    {subj.quarters[quarters[1] as string] ?? ''}
                                  </td>
                                  <td className="border border-slate-300 text-center py-1">
                                    {subj.quarters[quarters[2] as string] ?? ''}
                                  </td>
                                  <td className="border border-slate-300 text-center py-1">
                                    {subj.quarters[quarters[3] as string] ?? ''}
                                  </td>
                                  <td className="border border-slate-300 text-center font-bold text-slate-900 py-1">
                                    {subj.finalGrade ?? ''}
                                  </td>
                                  <td className={`border border-slate-300 text-center text-[10px] font-bold py-1 ${
                                    remarks === 'Passed' ? 'text-emerald-700' : remarks === 'Failed' ? 'text-rose-700' : ''
                                  }`}>
                                    {remarks}
                                  </td>
                                </tr>

                                {/* Sub-components (e.g. MAPEH) */}
                                {(subj.isMAPEHGroup || subj.isLanguageGroup) &&
                                  subj.languageComponents?.map((comp, cIdx) => {
                                    const compQ = subj.languageQuarters?.[comp] || {};
                                    const q1 = compQ[quarters[0] as string] ?? null;
                                    const q2 = compQ[quarters[1] as string] ?? null;
                                    const q3 = compQ[quarters[2] as string] ?? null;
                                    const q4 = compQ[quarters[3] as string] ?? null;
                                    const valid = [q1, q2, q3, q4].filter((g): g is number => g !== null && !isNaN(g));
                                    const cFinal = valid.length > 0
                                      ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100
                                      : null;
                                    const cRemarks = cFinal === null
                                      ? ''
                                      : (cFinal >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');

                                    return (
                                      <tr key={`comp-${cIdx}`} className="text-slate-600 bg-slate-50/50">
                                        <td className="border border-slate-300 pl-5 pr-2 py-0.5 italic">
                                          {comp}
                                        </td>
                                        <td className="border border-slate-300 text-center py-0.5">{q1 ?? ''}</td>
                                        <td className="border border-slate-300 text-center py-0.5">{q2 ?? ''}</td>
                                        <td className="border border-slate-300 text-center py-0.5">{q3 ?? ''}</td>
                                        <td className="border border-slate-300 text-center py-0.5">{q4 ?? ''}</td>
                                        <td className="border border-slate-300 text-center py-0.5">{cFinal ?? ''}</td>
                                        <td className="border border-slate-300 text-center text-[9px] py-0.5">{cRemarks}</td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })}

                          {/* General Average */}
                          <tr className="bg-slate-100 font-black text-slate-900">
                            <td className="border border-slate-400 px-2 py-1.5 uppercase">General Average</td>
                            <td className="border border-slate-400" colSpan={4}></td>
                            <td className="border border-slate-400 text-center py-1.5 text-xs text-amber-700">
                              {currentStudent.generalAverage ?? ''}
                            </td>
                            <td className={`border border-slate-400 text-center py-1.5 text-[10px] ${
                              currentStudent.promotionStatus === 'Promoted' ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {currentStudent.promotionStatus === 'Promoted' ? 'Passed' : (currentStudent.promotionStatus === 'Retained' ? 'Failed' : '')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* SHS SEMESTER TABLES */
                    <div className="space-y-4">
                      {/* Semester 1 */}
                      <div>
                        <div className="font-bold text-[11px] text-slate-700 mb-1">First Semester</div>
                        <table className="w-full border-collapse border border-slate-400 text-[11px]">
                          <thead>
                            <tr className="bg-slate-200 text-slate-800 font-bold text-center">
                              <th className="border border-slate-400 px-2 py-1 text-left">Subjects</th>
                              <th className="border border-slate-400 px-1 py-1 w-8">1</th>
                              <th className="border border-slate-400 px-1 py-1 w-8">2</th>
                              <th className="border border-slate-400 px-1 py-1 w-16">Sem Final</th>
                              <th className="border border-slate-400 px-1 py-1 w-14">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentStudent.subjects
                              .filter((s) => s.quarters[quarters[0] as string] !== null || s.quarters[quarters[1] as string] !== null)
                              .map((subj, idx) => {
                                const q1 = subj.quarters[quarters[0] as string];
                                const q2 = subj.quarters[quarters[1] as string];
                                const vals = [q1, q2].filter((g): g is number => g !== null);
                                const f = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                                const rem = f === null ? '' : (f >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
                                return (
                                  <tr key={idx}>
                                    <td className="border border-slate-300 px-2 py-1 font-semibold">{subj.subjectName}</td>
                                    <td className="border border-slate-300 text-center py-1">{q1 ?? ''}</td>
                                    <td className="border border-slate-300 text-center py-1">{q2 ?? ''}</td>
                                    <td className="border border-slate-300 text-center font-bold py-1">{f ?? ''}</td>
                                    <td className="border border-slate-300 text-center text-[10px] font-bold py-1">{rem}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      {/* Semester 2 */}
                      <div>
                        <div className="font-bold text-[11px] text-slate-700 mb-1">Second Semester</div>
                        <table className="w-full border-collapse border border-slate-400 text-[11px]">
                          <thead>
                            <tr className="bg-slate-200 text-slate-800 font-bold text-center">
                              <th className="border border-slate-400 px-2 py-1 text-left">Subjects</th>
                              <th className="border border-slate-400 px-1 py-1 w-8">3</th>
                              <th className="border border-slate-400 px-1 py-1 w-8">4</th>
                              <th className="border border-slate-400 px-1 py-1 w-16">Sem Final</th>
                              <th className="border border-slate-400 px-1 py-1 w-14">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentStudent.subjects
                              .filter((s) => s.quarters[quarters[2] as string] !== null || s.quarters[quarters[3] as string] !== null)
                              .map((subj, idx) => {
                                const q3 = subj.quarters[quarters[2] as string];
                                const q4 = subj.quarters[quarters[3] as string];
                                const vals = [q3, q4].filter((g): g is number => g !== null);
                                const f = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                                const rem = f === null ? '' : (f >= adviserClass.promotionPassingGrade ? 'Passed' : 'Failed');
                                return (
                                  <tr key={idx}>
                                    <td className="border border-slate-300 px-2 py-1 font-semibold">{subj.subjectName}</td>
                                    <td className="border border-slate-300 text-center py-1">{q3 ?? ''}</td>
                                    <td className="border border-slate-300 text-center py-1">{q4 ?? ''}</td>
                                    <td className="border border-slate-300 text-center font-bold py-1">{f ?? ''}</td>
                                    <td className="border border-slate-300 text-center text-[10px] font-bold py-1">{rem}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN: OBSERVED VALUES & LEGENDS ── */}
                <div className="space-y-4">
                  <div className="text-center border-b border-slate-300 pb-2">
                    <h4 className="font-black text-xs uppercase tracking-wide text-slate-800">
                      REPORT ON LEARNER'S OBSERVED VALUES
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold">Core Values Rating</p>
                  </div>

                  {/* Core Values Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold text-center">
                          <th className="border border-slate-400 px-2 py-1 text-left w-24">Core Values</th>
                          <th className="border border-slate-400 px-2 py-1 text-left">Behavior Statements</th>
                          <th className="border border-slate-400 px-1 py-1 w-7">1</th>
                          <th className="border border-slate-400 px-1 py-1 w-7">2</th>
                          <th className="border border-slate-400 px-1 py-1 w-7">3</th>
                          <th className="border border-slate-400 px-1 py-1 w-7">4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { title: '1. Responsible', desc: 'Demonstrates reliability and accountability in tasks and duties', key: 'responsible' as const },
                          { title: '2. Obedient', desc: 'Follows rules, regulations, and instructions of authority', key: 'obedient' as const },
                          { title: '3. Compassionate', desc: 'Shows empathy, care, and understanding towards others', key: 'compassionate' as const },
                          { title: '4. Kind', desc: 'Exhibits helpfulness, friendliness, and politeness to all', key: 'kind' as const },
                          { title: '5. Service Oriented', desc: 'Actively participates in classroom, school, and community activities', key: 'serviceOriented' as const },
                        ].map((cv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">{cv.title}</td>
                            <td className="border border-slate-300 px-2 py-1 text-[9.5px] text-slate-600 leading-tight">{cv.desc}</td>
                            <td className="border border-slate-300 text-center font-bold py-1">{observed?.quarters?.[quarters[0] as string]?.[cv.key] || ''}</td>
                            <td className="border border-slate-300 text-center font-bold py-1">{observed?.quarters?.[quarters[1] as string]?.[cv.key] || ''}</td>
                            <td className="border border-slate-300 text-center font-bold py-1">{observed?.quarters?.[quarters[2] as string]?.[cv.key] || ''}</td>
                            <td className="border border-slate-300 text-center font-bold py-1">{observed?.quarters?.[quarters[3] as string]?.[cv.key] || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Legends */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                    <div className="border border-slate-300 rounded p-2 bg-slate-50">
                      <div className="font-bold text-slate-800 mb-1 border-b pb-0.5">Observed Values Legend</div>
                      <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                        <div><strong className="text-slate-900">AO:</strong> Always Observed</div>
                        <div><strong className="text-slate-900">SO:</strong> Sometimes Observed</div>
                        <div><strong className="text-slate-900">RO:</strong> Rarely Observed</div>
                        <div><strong className="text-slate-900">NO:</strong> Not Observed</div>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded p-2 bg-slate-50">
                      <div className="font-bold text-slate-800 mb-1 border-b pb-0.5">Grading Scale (DepEd)</div>
                      <div className="space-y-0.5 text-[9px] text-slate-700">
                        <div><strong>Outstanding:</strong> 90 - 100 (Passed)</div>
                        <div><strong>Very Satisfactory:</strong> 85 - 89 (Passed)</div>
                        <div><strong>Satisfactory:</strong> 80 - 84 (Passed)</div>
                        <div><strong>Fairly Satisfactory:</strong> 75 - 79 (Passed)</div>
                        <div><strong>Did Not Meet:</strong> Below 75 (Failed)</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* SHEET 2: COVER (Left: Attendance & Transfer, Right: Cover)      */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeSheet === 'cover' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                
                {/* ── LEFT COLUMN: ATTENDANCE & TRANSFER ── */}
                <div className="space-y-4">
                  <div className="text-center border-b border-slate-300 pb-1">
                    <h4 className="font-black text-xs uppercase tracking-wide text-slate-800">
                      REPORT ON ATTENDANCE
                    </h4>
                  </div>

                  {/* Attendance Matrix */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400 text-[10px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold text-center">
                          <th className="border border-slate-400 px-1 py-1 text-left">Month</th>
                          {attMonths.map((m) => (
                            <th key={m} className="border border-slate-400 px-0.5 py-1 text-[9px]">
                              {m.substring(0, 3)}
                            </th>
                          ))}
                          <th className="border border-slate-400 px-1 py-1 font-black bg-slate-300 text-slate-900">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 px-1 py-1 font-semibold">No. of School Days</td>
                          {attMonths.map((m) => (
                            <td key={m} className="border border-slate-300 text-center py-1">
                              {attSummary.months[m]?.schoolDays || ''}
                            </td>
                          ))}
                          <td className="border border-slate-400 text-center font-bold bg-slate-50 py-1">
                            {attSummary.totalSchoolDays}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 px-1 py-1 font-semibold">Days Present</td>
                          {attMonths.map((m) => (
                            <td key={m} className="border border-slate-300 text-center py-1 text-emerald-700 font-bold">
                              {attSummary.months[m]?.daysPresent || ''}
                            </td>
                          ))}
                          <td className="border border-slate-400 text-center font-bold bg-slate-50 py-1 text-emerald-800">
                            {attSummary.totalDaysPresent}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 px-1 py-1 font-semibold">Days Absent</td>
                          {attMonths.map((m) => (
                            <td key={m} className="border border-slate-300 text-center py-1 text-rose-700">
                              {attSummary.months[m]?.daysAbsent || '0'}
                            </td>
                          ))}
                          <td className="border border-slate-400 text-center font-bold bg-slate-50 py-1 text-rose-800">
                            {attSummary.totalDaysAbsent}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures for Quarters */}
                  <div className="border border-slate-300 rounded p-3 bg-slate-50 text-[10px]">
                    <div className="font-bold uppercase tracking-wider text-slate-800 mb-2">
                      PARENT / GUARDIAN'S SIGNATURE
                    </div>
                    <div className="space-y-1.5">
                      {quarters.map((q) => (
                        <div key={q} className="flex items-center gap-2">
                          <span className="w-20 font-semibold text-slate-700">{q}:</span>
                          <span className="flex-1 border-b border-dotted border-slate-400 h-4"></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certificate of Transfer */}
                  <div className="border border-slate-300 rounded p-3 text-[10px] space-y-2">
                    <div className="font-bold text-center uppercase tracking-wider text-slate-800">
                      Certificate of Transfer
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Admitted to Grade: <span className="border-b border-slate-400 inline-block w-16"></span></div>
                      <div>Section: <span className="border-b border-slate-400 inline-block w-20"></span></div>
                    </div>
                    <div>
                      Eligibility for Admission to Grade: <span className="border-b border-slate-400 inline-block w-32"></span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 text-center">
                      <div>
                        <div className="font-bold uppercase border-b border-slate-400 pb-0.5">{adviserClass.principalName || '—'}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">School Head</div>
                      </div>
                      <div>
                        <div className="font-bold uppercase border-b border-slate-400 pb-0.5">{adviserClass.adviserName || '—'}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Teacher / Adviser</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: COVER PAGE & BIO ── */}
                <div className="space-y-4">
                  {/* DepEd Header */}
                  <div className="flex items-center justify-between gap-3 text-center border-b border-slate-300 pb-3">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      {depedLogo ? (
                        <img src={depedLogo} alt="DepEd" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold">DEPED</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-600 uppercase font-semibold">Republic of the Philippines</p>
                      <p className="text-[11px] font-bold text-slate-800 uppercase">Department of Education</p>
                      <p className="text-[10px] text-slate-600">Region X Northern Mindanao</p>
                      <h4 className="text-xs font-black uppercase text-slate-900 mt-0.5">{schoolName}</h4>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="School" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold">SCHOOL</div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="font-black text-xs uppercase tracking-wide text-slate-900">
                      REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
                    </h3>
                  </div>

                  {/* Learner Info Grid */}
                  <div className="bg-slate-50 border border-slate-300 rounded p-3 text-[11px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Learner's Reference No. (LRN):</span>
                      <strong className="font-mono text-slate-900">{currentStudent.lrn}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Learner's Name:</span>
                      <strong className="text-slate-900 uppercase">{currentStudent.name}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                      <div>Age: <strong className="text-slate-900">{displayAge}</strong></div>
                      <div>Sex: <strong className="text-slate-900">{currentStudent.sex}</strong></div>
                      <div>Grade: <strong className="text-slate-900">{adviserClass.gradeLevel}</strong></div>
                      <div>Section: <strong className="text-slate-900 uppercase">{adviserClass.section}</strong></div>
                      <div>School Year: <strong className="text-slate-900">{adviserClass.schoolYear}</strong></div>
                      {isSHS && (
                        <div>Track / Strand: <strong className="text-slate-900">{currentStudentTrack}</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Message to Parents */}
                  <div className="text-[10px] text-slate-600 italic bg-amber-50/50 border border-amber-200/60 rounded p-2.5 leading-relaxed">
                    <strong className="not-italic text-slate-800 block mb-1">Dear Parent/Guardian,</strong>
                    This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you should you desire to know more about your child's progress.
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-4 pt-2 text-center text-[10px]">
                    <div>
                      <div className="font-bold uppercase border-b border-slate-400 pb-0.5">{adviserClass.adviserName || '—'}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Teacher / Adviser</div>
                    </div>
                    <div>
                      <div className="font-bold uppercase border-b border-slate-400 pb-0.5">{adviserClass.principalName || '—'}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">School Head</div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
