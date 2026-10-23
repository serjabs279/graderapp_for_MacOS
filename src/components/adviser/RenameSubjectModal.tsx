import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass } from '../../types';
import { globalToast } from '../../context/ToastContext';
import { Edit3, Check, X, AlertCircle } from 'lucide-react';

interface RenameSubjectModalProps {
  adviserClass: AdviserClass;
  subjectName: string;
  onClose: () => void;
}

export default function RenameSubjectModal({ adviserClass, subjectName, onClose }: RenameSubjectModalProps) {
  const { renameSubjectInAdviserClass } = useApp();
  const [newName, setNewName] = useState(subjectName);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Subject name cannot be empty.');
      return;
    }
    if (trimmed === subjectName) {
      onClose();
      return;
    }

    try {
      renameSubjectInAdviserClass(adviserClass.id, subjectName, trimmed);
      globalToast.success(`Renamed subject "${subjectName}" to "${trimmed}".`, 'Subject Renamed');
      onClose();
    } catch (err: any) {
      console.error('Rename subject error:', err);
      setError(err?.message || 'Failed to rename subject');
    }
  };

  return (
    <div className="ui-dialog-overlay">
      <div role="dialog" aria-modal="true" aria-label="Rename subject" className="ui-dialog max-w-md">
        
        {/* Header */}
        <div className="ui-dialog-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 text-balance">
                Rename Subject
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-pretty">
                Updates everywhere (Grade Matrix, SF-9, and subject records)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="adviser-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="ui-dialog-body space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="ui-label">
              Current Subject Name
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold">
              {subjectName}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ui-label">
              New Subject Name <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Science, Oral Communication, General Mathematics"
              autoFocus
              className="ui-field"
            />
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-pretty">
            💡 Renaming will preserve all imported scores, quarter grades, and locks under this new subject title.
          </p>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="adviser-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="adviser-button-primary"
            >
              <Check className="w-4 h-4" /> Save New Name
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
