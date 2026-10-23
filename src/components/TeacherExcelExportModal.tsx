import React, { useState } from 'react';
import { Project } from '../types';
import { useApp } from '../context/AppContext';
import { globalToast } from '../context/ToastContext';
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
      globalToast.warning('Please select at least one quarter/semester to export.', 'No Selection');
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
    <div className="ui-dialog-overlay">
      <div role="dialog" aria-modal="true" aria-labelledby="teacher-export-title" aria-describedby="teacher-export-description" className="ui-dialog max-w-lg">

        {/* Header */}
        <div className="ui-dialog-header">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {exportFormat === 'json' ? <FileCode className="size-5" /> : <FileSpreadsheet className="size-5" />}
            </div>
            <div className="min-w-0">
              <h3 id="teacher-export-title" className="ui-section-title text-balance">Export grades for adviser</h3>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
                {project.subject} · {project.gradeLevel} - {project.section}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close export dialog" className="ui-icon-button">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="ui-dialog-body space-y-5">
          <p id="teacher-export-description" className="text-pretty text-sm text-slate-600 dark:text-slate-400">
            Select the quarters and format to export. Import the downloaded file into the Adviser Portal.
          </p>

          {exportFormat === 'json' && (
            <div className="ui-notice">
              <p>The JSON file also includes a full gradebook backup with all quarters, scores, and assessments. Keep it to recover this section using <strong className="font-semibold">Restore Backup</strong>.</p>
            </div>
          )}

          {/* Format Toggle */}
          <div className="ui-tabs" role="group" aria-label="Export format">
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              aria-pressed={exportFormat === 'json'}
              className="ui-tab flex-1 whitespace-normal"
            >
              <FileCode className="size-4 shrink-0" /> JSON (Adviser Portal)
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('excel')}
              aria-pressed={exportFormat === 'excel'}
              className="ui-tab flex-1 whitespace-normal"
            >
              <FileSpreadsheet className="size-4 shrink-0" /> Excel (.xlsx)
            </button>
          </div>

          {/* Quarter Selection */}
          <fieldset className="min-w-0 space-y-2">
            <legend className="ui-label mb-2">Quarters to include</legend>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border-slate-300 accent-emerald-700"
                checked={selected.length === allQuarters.length && allQuarters.length > 0}
                onChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Select all (consolidated)</span>
            </label>

            <div className="my-1 h-px w-full bg-slate-100 dark:bg-slate-800" />

            {allQuarters.map(q => (
              <label key={q} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-slate-300 accent-emerald-700"
                  checked={selected.includes(q)}
                  onChange={() => handleToggle(q)}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{q}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm tabular-nums text-slate-600 dark:text-slate-400" aria-live="polite">
            {selected.length === 0 ? 'Select at least one quarter to download.' : `${selected.length} of ${allQuarters.length} quarters selected.`}
          </p>
        </div>

        {/* Footer */}
        <div className="ui-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="ui-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selected.length === 0}
            className="ui-button-primary"
          >
            <Download className="size-4 shrink-0" />
            Download {exportFormat === 'json' ? 'JSON' : 'Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
