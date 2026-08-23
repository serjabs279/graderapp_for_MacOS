import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { createDefaultAdviserClass, buildGradeMatrix, GradeMatrix } from '../../utils/adviserUtils';
import {
  GraduationCap, TableProperties, Trophy, Star, BarChart3, FileText, Settings2,
  Plus, ChevronDown, Users, BookOpen, ClipboardList, ScrollText, History, AlertCircle
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

type PortalTab = 'masterlist' | 'matrix' | 'import' | 'rankings' | 'awardees' | 'performance' | 'sf9' | 'settings' | 'logs';

export default function AdviserPortalView() {
  const { adviserClasses, saveAdviserClass, globalSettings, setActiveAdviserClass } = useApp();
  
  const activeClassId = globalSettings.activeAdviserClassId;
  const activeAdviserClass = adviserClasses.find(c => c.id === activeClassId) || null;

  const [activeTab, setActiveTab] = useState<PortalTab>('matrix');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
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

  const handleSelectGroup = (id: string) => {
    setActiveAdviserClass(id);
    setShowClassDropdown(false);
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
    { id: 'matrix', label: 'Grade Matrix', icon: <TableProperties className="h-4 w-4" />, description: 'Consolidated grades per subject' },
    { id: 'rankings', label: 'Rankings', icon: <Trophy className="h-4 w-4" />, description: 'Quarterly & EOSY rankings' },
    { id: 'awardees', label: 'Awardees', icon: <Star className="h-4 w-4" />, description: 'Honors & recognition' },
    { id: 'performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" />, description: 'Class dashboards' },
    { id: 'sf9', label: 'SF-9 / Report Card', icon: <FileText className="h-4 w-4" />, description: 'Generate school cards' },
    { id: 'logs', label: 'Override Log', icon: <History className="h-4 w-4" />, description: 'Audit trail of manual actions' },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" />, description: 'Adviser class configuration' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950 relative">
      {/* Class Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Advisory Class:</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowClassDropdown(!showClassDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all cursor-pointer min-w-[240px]"
          >
            {activeAdviserClass ? (
              <span className="flex-1 text-left">{activeAdviserClass.gradeLevel} - {activeAdviserClass.section} ({activeAdviserClass.schoolYear})</span>
            ) : (
              <span className="flex-1 text-left text-amber-500 dark:text-amber-500">Select a section...</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>

          {showClassDropdown && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 space-y-0.5 max-h-60 overflow-y-auto">
                {adviserClasses.length === 0 && (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No advisory classes found. Create one.</div>
                )}
                {adviserClasses.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectGroup(cls.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      activeClassId === cls.id
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div>{cls.gradeLevel} - {cls.section}</div>
                      <div className="text-[10px] font-normal text-slate-400">{cls.schoolYear} · {cls.workspace} · {cls.students.length} Student(s)</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => { setShowClassDropdown(false); setShowCreateModal(true); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Create My Section
                </button>
              </div>
            </div>
          )}
        </div>

        {activeAdviserClass && (
          <div className="flex items-center gap-4 ml-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{activeAdviserClass.students.length} students</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{activeAdviserClass.importedGrades.length} grade files</span>
            </div>
          </div>
        )}
      </div>

      {/* No Class Selected State */}
      {!activeAdviserClass && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-12">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shadow-inner">
            <GraduationCap className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">Adviser Grade Consolidation</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Consolidate official exported grades from subject teachers, generate class matrices, compute awards, and export Learner's Progress Report Cards (SF9).
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-black rounded-xl transition-all cursor-pointer shadow-md mt-4"
          >
            <Plus className="h-5 w-5" /> Create My Section
          </button>
        </div>
      )}

      {/* Tab Navigation + Content */}
      {activeAdviserClass && gradeMatrix && (
        <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-300">
          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 shrink-0 shadow-sm z-10">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-[11px] font-bold whitespace-nowrap border-b-[3px] transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  title={tab.description}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
            {activeTab === 'masterlist' && <AdviserStudentManager adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'matrix' && <GradeMatrixTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'import' && <GradeImportPanel adviserClass={activeAdviserClass} />}
            {activeTab === 'rankings' && <RankingsTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'awardees' && <AwardeesTab adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'performance' && <PerformanceDashboard adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'sf9' && <SF9Generator adviserClass={activeAdviserClass} gradeMatrix={gradeMatrix} />}
            {activeTab === 'logs' && <OverrideLogTab adviserClass={activeAdviserClass} />}
            {activeTab === 'settings' && <AdviserSettingsPanel adviserClass={activeAdviserClass} />}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-500" /> Create My Section
              </h3>
            </div>
            
            <div className="p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex gap-2 items-start text-xs font-bold text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">School Year</label>
                <input type="text" value={newSy} onChange={e => setNewSy(e.target.value)} placeholder="e.g. 2026-2027" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Grade Level</label>
                <input type="text" value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="e.g. Grade 10" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Section Name</label>
                <input type="text" value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="e.g. Rizal" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Curriculum / Workspace</label>
                <select value={newWorkspace} onChange={e => setNewWorkspace(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="JHS">Junior High School (JHS)</option>
                  <option value="SHS">Senior High School (SHS)</option>
                </select>
              </div>

              {newWorkspace === 'SHS' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Track / Strand <span className="font-normal text-slate-400">(SHS only)</span></label>
                  <input
                    type="text"
                    value={newTrackStrand}
                    onChange={e => setNewTrackStrand(e.target.value)}
                    placeholder="e.g. Academic  or  Academic - HUMSS"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">New curriculum → Track only (e.g. "Academic"). Old curriculum → Track + Strand (e.g. "Academic - HUMSS").</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateSubmit} className="px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
