import React, { useState } from 'react';
import { Project } from '../types';
import { exportTeacherGradebookJSON } from '../utils/subjectGradeExport';
import { exportTeacherGradebookExcel } from '../utils/teacherExcelExport';
import { X, FileCode, FileSpreadsheet, Check } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
}

export default function TeacherExcelExportModal({ project, onClose }: Props) {
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
      alert("Please select at least one quarter/semester to export.");
      return;
    }
    const sorted = allQuarters.filter(q => selected.includes(q));
    if (exportFormat === 'json') {
      exportTeacherGradebookJSON(project, sorted);
    } else {
      exportTeacherGradebookExcel(project, sorted);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileCode className="h-5 w-5 text-indigo-500" /> Export Grades for Adviser
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Select the quarters or semesters you want to export. The exported file can be imported into the Adviser Portal and is cross-platform compatible (Desktop & Android).
          </div>

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
              <FileCode className="h-4 w-4 text-indigo-500" /> JSON (Recommended)
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
          
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                checked={selected.length === allQuarters.length && allQuarters.length > 0}
                onChange={handleSelectAll}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">Select All (Consolidated)</span>
            </label>
            
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 w-full" />
            
            {allQuarters.map(q => (
              <label key={q} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  checked={selected.includes(q)}
                  onChange={() => handleToggle(q)}
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">{q}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={handleExport}
            disabled={selected.length === 0}
            className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Check className="h-4 w-4" /> Download {exportFormat === 'json' ? 'JSON' : 'Excel'} File
          </button>
        </div>
      </div>
    </div>
  );
}
