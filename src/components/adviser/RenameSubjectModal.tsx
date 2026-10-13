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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Rename Subject
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updates everywhere (Grade Matrix, SF-9, and subject records)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Subject Name
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold">
              {subjectName}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
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
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl">
            💡 Renaming will preserve all imported scores, quarter grades, and locks under this new subject title.
          </p>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save New Name
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
