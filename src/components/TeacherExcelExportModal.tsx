import React, { useState } from 'react';
import { Project } from '../types';
import { useApp } from '../context/AppContext';
import { exportTeacherGradebookJSON } from '../utils/subjectGradeExport';
import { exportTeacherGradebookExcel } from '../utils/teacherExcelExport';
import { X, FileCode, FileSpreadsheet, Download } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function TeacherExcelExportModal({ project, onClose }: Props) {
  const { globalSettings } = useApp();
  const allQuarters = Object.keys(project.quarters);
  const [selected, setSelected] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'excel'>('json');

  const handleToggle = (q: string) => {
    setSelected(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);
  };

  const handleSelectAll = () => {
    if (selected.length === allQuarters.length) {
      setSelected([]);
    } else {
      setSelected([...allQuarters]);
    }
  };

  const handleExport = () => {
    if (selected.length === 0) {
      alert('Please select at least one quarter/semester to export.');
      return;
    }
    const sortedSelected = allQuarters.filter(q => selected.includes(q));
    if (exportFormat === 'json') {
      exportTeacherGradebookJSON(project, sortedSelected, globalSettings.subjects);
    } else {
      exportTeacherGradebookExcel(project, sortedSelected, globalSettings.subjects);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
              {exportFormat === 'json' ? <FileCode className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">Export Grades for Adviser</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {project.subject} · {project.gradeLevel} - {project.section}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select the quarters and format to export. The file will be downloaded for import into the Adviser Portal.
          </p>

          {/* Format Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                exportFormat === 'json'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileCode className="h-4 w-4 text-indigo-500" /> JSON (Adviser Portal)
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('excel')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                exportFormat === 'excel'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Excel (.xlsx)
            </button>
          </div>

          {/* Quarter Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                checked={selected.length === allQuarters.length && allQuarters.length > 0}
                onChange={handleSelectAll}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Select All (Consolidated)</span>
            </label>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 w-full" />

            {allQuarters.map(q => (
              <label key={q} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  checked={selected.includes(q)}
                  onChange={() => handleToggle(q)}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{q}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selected.length === 0}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download {exportFormat === 'json' ? 'JSON' : 'Excel'}
            {selected.length > 0 ? ` (${selected.length} Quarter${selected.length !== 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
