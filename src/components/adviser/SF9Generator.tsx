import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass } from '../../types';
import { GradeMatrix, StudentGradeRow } from '../../utils/adviserUtils';
import { generateSF9 } from '../../utils/adviser/sf9Export';
import { globalToast } from '../../context/ToastContext';
import { FileText, Download, CheckSquare, Square, Settings, Award, Eye, X } from 'lucide-react';
import SF9RatingModal from './SF9RatingModal';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function SF9Generator({ adviserClass, gradeMatrix }: Props) {
  const { globalSettings } = useApp();
  const [selectedLrns, setSelectedLrns] = useState<Set<string>>(new Set());
  const [ratingStudent, setRatingStudent] = useState<StudentGradeRow | null>(null);

  // PDF preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Default: select all
  useEffect(() => {
    if (gradeMatrix.length > 0) {
      setSelectedLrns(new Set(gradeMatrix.map(s => s.lrn)));
    }
  }, [gradeMatrix]);

  // Revoke old blob URL when a new one is set or modal is closed
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const toggleAll = () => {
    if (selectedLrns.size === gradeMatrix.length) {
      setSelectedLrns(new Set());
    } else {
      setSelectedLrns(new Set(gradeMatrix.map(s => s.lrn)));
    }
  };

  const toggleStudent = (lrn: string) => {
    const next = new Set(selectedLrns);
    if (next.has(lrn)) next.delete(lrn);
    else next.add(lrn);
    setSelectedLrns(next);
  };

  const handleDownload = () => {
    if (selectedLrns.size === 0) return;
    try {
      const doc = generateSF9(adviserClass, gradeMatrix, globalSettings, Array.from(selectedLrns));
      const title = selectedLrns.size === 1
        ? `SF9_${[...selectedLrns].map(lrn => gradeMatrix.find(s => s.lrn === lrn)?.name ?? lrn)[0].replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `SF9_Bulk_${adviserClass.gradeLevel}_${adviserClass.section}.pdf`;
      doc.save(title);
      globalToast.success(`SF-9 Report Cards generated for ${selectedLrns.size} learner(s) and saved as "${title}".`, 'SF-9 Export Complete');
    } catch (err: any) {
      console.error('SF9 download error:', err);
      globalToast.error('Failed to generate SF9: ' + (err.message || String(err)), 'SF-9 Export Failed');
    }
  };

  const handlePreview = () => {
    if (selectedLrns.size === 0) return;
    try {
      const doc = generateSF9(adviserClass, gradeMatrix, globalSettings, Array.from(selectedLrns));
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      globalToast.info(`SF-9 preview rendered for ${selectedLrns.size} learner(s).`, 'Preview Ready');
    } catch (err: any) {
      console.error('SF9 preview error:', err);
      globalToast.error('Failed to generate preview: ' + (err.message || String(err)), 'SF-9 Preview Failed');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const hasAll = selectedLrns.size > 0 && selectedLrns.size === gradeMatrix.length;
  const isPartial = selectedLrns.size > 0 && selectedLrns.size < gradeMatrix.length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" /> SF-9 Generation
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate official Learner's Progress Report Cards (SF9).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handlePreview}
            disabled={selectedLrns.size === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm text-sm"
          >
            <Eye className="h-4 w-4" />
            Preview ({selectedLrns.size})
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedLrns.size === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm text-sm"
          >
            <Download className="h-4 w-4" />
            Download ({selectedLrns.size})
          </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 flex gap-4 shadow-sm">
        <Settings className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h3 className="font-bold text-amber-800 dark:text-amber-400">PDF Configuration Requirements</h3>
          <ul className="text-sm text-amber-700 dark:text-amber-500 mt-2 space-y-1 list-disc list-inside">
            <li>Ensure all quarter grades are imported for each subject (Q1–Q4 for JHS; Q1–Q2 for Sem 1, Q3–Q4 for Sem 2 for SHS).</li>
            <li>Click the <span className="font-bold">Rate Values &amp; Attendance</span> button on any student to assess observed values and attendance.</li>
            <li>Verify that <span className="font-bold">Adviser Name</span>, <span className="font-bold">Principal Name</span>, and <span className="font-bold">Logos</span> are configured in the Settings tab.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={toggleAll}>
            {hasAll ? (
              <CheckSquare className="h-5 w-5 text-amber-600" />
            ) : isPartial ? (
              <div className="h-5 w-5 bg-amber-500 border border-amber-500 rounded text-white flex items-center justify-center">
                <div className="w-2.5 h-0.5 bg-white" />
              </div>
            ) : (
              <Square className="h-5 w-5 text-slate-400" />
            )}
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Select All Students</span>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {selectedLrns.size} / {gradeMatrix.length} selected
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
          {gradeMatrix.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No students in class.</div>
          ) : null}
          {gradeMatrix.map((student, idx) => (
            <div
              key={student.lrn}
              onClick={() => toggleStudent(student.lrn)}
              className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors ${selectedLrns.has(student.lrn) ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
            >
              {selectedLrns.has(student.lrn) ? (
                <CheckSquare className="h-5 w-5 text-amber-600 shrink-0" />
              ) : (
                <Square className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <span className="text-slate-400 font-mono text-sm w-6 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{student.name}</div>
                <div className="text-xs font-mono text-slate-400">LRN: {student.lrn}</div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRatingStudent(student);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Rate Values &amp; Attendance</span>
                </button>

                {student.promotionStatus === 'Retained' && (
                  <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded">Retained</span>
                )}
                {student.generalAverage === null && (
                  <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">Missing Grades</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SF9 Rating Modal ── */}
      {ratingStudent && (
        <SF9RatingModal
          adviserClass={adviserClass}
          studentRow={ratingStudent}
          onClose={() => setRatingStudent(null)}
        />
      )}

      {/* ── Inline PDF Preview Modal ── */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col z-50">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-white text-sm">SF9 Print Preview</span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedLrns.size === 1
                  ? [...selectedLrns].map(lrn => gradeMatrix.find(s => s.lrn === lrn)?.name ?? lrn)[0]
                  : `${selectedLrns.size} students`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
              <button
                onClick={closePreview}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Object PDF viewer */}
          <object
            data={previewUrl}
            type="application/pdf"
            className="flex-1 w-full bg-white"
          >
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900">
              <p>Your browser does not support inline PDFs.</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold"
              >
                Download PDF Instead
              </button>
            </div>
          </object>
        </div>
      )}
    </div>
  );
}
