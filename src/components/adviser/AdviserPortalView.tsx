import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { createDefaultAdviserClass, buildGradeMatrix } from '../../utils/adviserUtils';
import { globalToast } from '../../context/ToastContext';
import {
  GraduationCap, TableProperties, Trophy, Star, BarChart3, FileText, Settings2,
  Plus, Users, BookOpen, History, AlertCircle,
  Home, Activity, Trash2, X
} from 'lucide-react';
import GradeMatrixTab from './GradeMatrixTab';
import GradeImportPanel from './GradeImportPanel';
import AdviserSettingsPanel from './AdviserSettingsPanel';
import RankingsTab from './RankingsTab';
import AwardeesTab from './AwardeesTab';
import PerformanceDashboard from './PerformanceDashboard';
import SF9Generator from './SF9Generator';
import AdviserStudentManager from './AdviserStudentManager';
import OverrideLogTab from './OverrideLogTab';
import DirectGradeEntryTab from './directGradeEntry/DirectGradeEntryTab';
import { PenTool } from 'lucide-react';
import DataIntegrityModal from '../DataIntegrityModal';
import DangerConfirmModal from '../DangerConfirmModal';

type PortalTab = 'masterlist' | 'matrix' | 'import' | 'direct-entry' | 'rankings' | 'awardees' | 'performance' | 'sf9' | 'settings' | 'logs';

export default function AdviserPortalView() {
  const { adviserClasses, saveAdviserClass, deleteAdviserClass, globalSettings, setActiveAdviserClass, setActiveRoute } = useApp();
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [classPendingDelete, setClassPendingDelete] = useState<typeof adviserClasses[0] | null>(null);
  
  const activeClassId = globalSettings.activeAdviserClassId;
  const activeAdviserClass = adviserClasses.find(c => c.id === activeClassId) || null;

  const [activeTab, setActiveTab] = useState<PortalTab>('matrix');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for Create Section
  const [newSy, setNewSy] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newWorkspace, setNewWorkspace] = useState<'JHS' | 'SHS'>('JHS');
  const [newTrackStrand, setNewTrackStrand] = useState('');
  const [createError, setCreateError] = useState('');

  const gradeMatrix = useMemo(() => {
    if (!activeAdviserClass) return null;
    return buildGradeMatrix(activeAdviserClass);
  }, [activeAdviserClass]);

  const confirmDeleteClass = () => {
    if (!classPendingDelete) return;
    deleteAdviserClass(classPendingDelete.id);
    if (activeClassId === classPendingDelete.id) setActiveAdviserClass(null);
    globalToast.success(`Section "${classPendingDelete.gradeLevel} - ${classPendingDelete.section} (${classPendingDelete.schoolYear})" has been deleted.`, 'Section Deleted');
    setClassPendingDelete(null);
  };

  const handleCreateSubmit = () => {
    if (!newSy || !newGrade || !newSection) {
      setCreateError('All fields are required.');
      return;
    }
    const newId = `${newSy}|${newGrade}|${newSection}`;
    if (adviserClasses.some(c => c.id === newId)) {
      setCreateError('An advisory section for this SY, Grade, and Section already exists.');
      return;
    }
    const newClass = createDefaultAdviserClass(newSy, newGrade, newSection, newWorkspace);
    if (newWorkspace === 'SHS' && newTrackStrand.trim()) {
      (newClass as any).trackStrand = newTrackStrand.trim();
    }
    saveAdviserClass(newClass);
    setActiveAdviserClass(newId);
    setShowCreateModal(false);
    // Reset form
    setNewSy('');
    setNewGrade('');
    setNewSection('');
    setNewTrackStrand('');
    setCreateError('');
    setActiveTab('masterlist'); // take them to masterlist to add students
  };

  const tabs: { id: PortalTab; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'masterlist', label: 'Masterlist', icon: <Users className="h-4 w-4" />, description: 'Manage students' },
    { id: 'import', label: 'Import Grades', icon: <BookOpen className="h-4 w-4" />, description: 'Upload subject grade files' },
    { id: 'direct-entry', label: 'Direct Grade Entry', icon: <PenTool className="size-4" aria-hidden="true" />, description: 'Enter grades for part-time teachers' },
    { id: 'matrix', label: 'Grade Matrix', icon: <TableProperties className="h-4 w-4" />, description: 'Consolidated grades per subject' },
    { id: 'rankings', label: 'Rankings', icon: <Trophy className="h-4 w-4" />, description: 'Quarterly & EOSY rankings' },
    { id: 'awardees', label: 'Awardees', icon: <Star className="h-4 w-4" />, description: 'Honors & recognition' },
    { id: 'performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" />, description: 'Class dashboards' },
    { id: 'sf9', label: 'SF-9 / Report Card', icon: <FileText className="h-4 w-4" />, description: 'Generate school cards' },
    { id: 'logs', label: 'Override Log', icon: <History className="h-4 w-4" />, description: 'Audit trail of manual actions' },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" />, description: 'Adviser class configuration' },
  ];

  return (
    <div className="adviser-portal relative flex h-full min-h-0 min-w-0 flex-col bg-slate-100 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <GraduationCap className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adviser Portal</p>
              <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">{globalSettings.schoolName || 'Class records and reporting'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setShowIntegrityModal(true)} className="adviser-button" aria-label="Data Health" title="Inspect Data Health & Decay Protection">
              <Activity className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Data Health</span>
            </button>
            <button id="adviser-btn-main-hub" onClick={() => setActiveRoute('portal-select')} className="adviser-button" title="Return to Main Hub (Select Portals)">
              <Home className="size-4" aria-hidden="true" /> Main Hub
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 px-4 py-3 sm:px-6 dark:border-slate-800">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <label htmlFor="adviser-section" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Advisory class</label>
            <select id="adviser-section" value={activeAdviserClass?.id || ''} onChange={e => setActiveAdviserClass(e.target.value)} className="adviser-field">
              <option value="" disabled>Select a section</option>
              {adviserClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.gradeLevel} - {cls.section} ({cls.schoolYear})</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="adviser-button" aria-label="Create My Section" title="Create My Section">
            <Plus className="size-4" aria-hidden="true" /><span className="hidden sm:inline">New section</span>
          </button>
          {activeAdviserClass && (
            <>
              <button onClick={() => setClassPendingDelete(activeAdviserClass)} className="adviser-button hover:text-red-600 dark:hover:text-red-400" aria-label={`Delete section ${activeAdviserClass.section}`} title="Delete selected section">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
              <p className="hidden min-h-10 items-center gap-2 text-xs text-slate-500 tabular-nums xl:flex dark:text-slate-400">
                <span>{activeAdviserClass.students.length} students</span>
                <span aria-hidden="true">·</span>
                <span>{new Set(activeAdviserClass.importedGrades.map(g => g.subjectUID || g.subjectName)).size} grade files</span>
              </p>
            </>
          )}
        </div>
      </header>

      {/* No Class Selected State */}
      {!activeAdviserClass && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <GraduationCap className="size-7" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-balance text-lg font-semibold text-slate-900 dark:text-slate-100">Adviser grade consolidation</h2>
            <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Consolidate grades exported by subject teachers, build the class matrix, compute awards, and produce Learner&apos;s Progress Report Cards (SF9).
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="adviser-button adviser-button-primary mt-2"
          >
            <Plus className="size-4" aria-hidden="true" /> Create advisory section
          </button>
        </div>
      )}

      {/* Tab Navigation + Content */}
      {activeAdviserClass && gradeMatrix && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <nav aria-label="Adviser navigation" className="hidden w-56 shrink-0 space-y-6 overflow-y-auto border-r border-slate-300 bg-white p-4 lg:block dark:border-slate-800 dark:bg-slate-900">
            {[
              { label: 'Class records', items: tabs.slice(0, 4) },
              { label: 'Results', items: tabs.slice(4, 7) },
              { label: 'Reports & settings', items: tabs.slice(7) },
            ].map(group => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="adviser-nav-button" aria-current={activeTab === tab.id ? 'page' : undefined} title={tab.description}>
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <nav aria-label="Adviser navigation" className="flex shrink-0 items-center gap-3 border-b border-slate-300 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <label htmlFor="adviser-view" className="shrink-0 text-sm text-slate-500 dark:text-slate-400">View</label>
            <select id="adviser-view" value={activeTab} onChange={e => setActiveTab(e.target.value as PortalTab)} className="adviser-field">
              {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
            </select>
          </nav>

          {/* Content Area */}
          <main aria-label={tabs.find(tab => tab.id === activeTab)?.label} className="min-w-0 flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950">
            {activeTab === 'masterlist' && <AdviserStudentManager adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'matrix' && <GradeMatrixTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'import' && <GradeImportPanel adviserClass={activeAdviserClass} />}
            {activeTab === 'direct-entry' && <DirectGradeEntryTab adviserClass={activeAdviserClass} />}
            {activeTab === 'rankings' && <RankingsTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'awardees' && <AwardeesTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'performance' && <PerformanceDashboard adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'sf9' && <SF9Generator adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'logs' && <OverrideLogTab adviserClass={activeAdviserClass} />}
            {activeTab === 'settings' && <AdviserSettingsPanel adviserClass={activeAdviserClass} />}
          </main>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Create advisory section" className="ui-dialog max-w-md">
            <div className="ui-dialog-header">
              <h3 className="ui-section-title">Create advisory section</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} aria-label="Close create dialog" className="ui-icon-button">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="ui-dialog-body space-y-4">
              {createError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-pretty">{createError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="section-school-year" className="ui-label">School year</label>
                <input id="section-school-year" type="text" value={newSy} onChange={e => setNewSy(e.target.value)} placeholder="2026-2027" className="adviser-field" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="section-grade-level" className="ui-label">Grade level</label>
                <input id="section-grade-level" type="text" value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="Grade 10" className="adviser-field" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="section-name" className="ui-label">Section name</label>
                <input id="section-name" type="text" value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="Rizal" className="adviser-field" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="section-workspace" className="ui-label">Curriculum / workspace</label>
                <select id="section-workspace" value={newWorkspace} onChange={e => setNewWorkspace(e.target.value as any)} className="adviser-field">
                  <option value="JHS">Junior High School (JHS)</option>
                  <option value="SHS">Senior High School (SHS)</option>
                </select>
              </div>

              {newWorkspace === 'SHS' && (
                <div className="space-y-1.5">
                  <label htmlFor="section-track-strand" className="ui-label">
                    Track / strand <span className="font-normal text-slate-400 dark:text-slate-500">(SHS only)</span>
                  </label>
                  <input
                    id="section-track-strand"
                    type="text"
                    value={newTrackStrand}
                    onChange={e => setNewTrackStrand(e.target.value)}
                    placeholder="Academic - HUMSS"
                    className="adviser-field"
                  />
                  <p className="text-pretty text-xs text-slate-500 dark:text-slate-400">
                    New curriculum: track only (e.g. &ldquo;Academic&rdquo;). Old curriculum: track and strand (e.g. &ldquo;Academic - HUMSS&rdquo;).
                  </p>
                </div>
              )}
            </div>

            <div className="ui-dialog-footer">
              <button type="button" onClick={() => setShowCreateModal(false)} className="ui-button">Cancel</button>
              <button type="button" onClick={handleCreateSubmit} className="adviser-button adviser-button-primary">
                <Plus className="size-4" aria-hidden="true" /> Create section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Typed confirmation for permanent section deletion */}
      <DangerConfirmModal
        isOpen={classPendingDelete !== null}
        title="Delete Advisory Section"
        confirmLabel="Delete Section"
        onClose={() => setClassPendingDelete(null)}
        onConfirm={confirmDeleteClass}
      >
        {classPendingDelete && (
          <>
            You are about to permanently delete the advisory section{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {classPendingDelete.gradeLevel} - {classPendingDelete.section} (SY {classPendingDelete.schoolYear})
            </span>
            . All {classPendingDelete.students.length} advisee(s), imported subject grades, manual overrides, and attendance records in this section will be erased. Subject teachers' own gradebooks are not affected.
          </>
        )}
      </DangerConfirmModal>

      {/* Data Health & Integrity Modal */}
      <DataIntegrityModal
        isOpen={showIntegrityModal}
        onClose={() => setShowIntegrityModal(false)}
      />
    </div>
  );
}
