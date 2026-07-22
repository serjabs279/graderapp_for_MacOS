import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubjectType, Project, Student } from '../types';
import { computeProjectStudentGrade, transmuteGrade, getSubjectWeightsLabel, SHS_PROFILES } from '../utils';
import { exportElementToPDF } from '../utils/pdfExport';
import { 
  Users, 
  GraduationCap, 
  FolderPlus, 
  Trash2, 
  Copy, 
  Archive, 
  ExternalLink, 
  X,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  BookOpen,
  LayoutGrid,
  Calculator,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileDown,
  ChevronLeft,
  Printer,
  Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardView() {
  const { 
    projects, 
    activeProjectId, 
    createProject, 
    openProject, 
    duplicateProject, 
    archiveProject, 
    deleteProject,
    globalSettings,
    setActiveRoute,
    workspaceMode
  } = useApp();

  // Filter projects by active workspace
  const workspaceProjects = React.useMemo(() => {
    return projects.filter(p => {
      if (workspaceMode === 'SHS') {
        return p.workspace === 'SHS';
      } else {
        return p.workspace !== 'SHS';
      }
    });
  }, [projects, workspaceMode]);

  // Tab and modal state for consolidated reporting
  const [dashboardTab, setDashboardTab] = useState<'quarters' | 'consolidation'>('quarters');
  const [selectedConsolidatedClass, setSelectedConsolidatedClass] = useState<string | null>(null);
  const [consolidatedSearch, setConsolidatedSearch] = useState('');
  const [printFriendly, setPrintFriendly] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // New project form state
  const [subject, setSubject] = useState<string>(workspaceMode === 'SHS' ? '' : 'English');
  const [section, setSection] = useState('');
  const [gradeLevel, setGradeLevel] = useState(workspaceMode === 'SHS' ? 'Grade 11' : 'Grade 10');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [quarter, setQuarter] = useState('1st Quarter');
  const [passingGrade, setPassingGrade] = useState(globalSettings.defaultPassingGrade);
  const [depedPolicy, setDepedPolicy] = useState<'2015' | '2027'>(globalSettings.depedPolicy);

  // SHS specific states
  const [shsProfileId, setShsProfileId] = useState('profile-1');
  const [shsDuration, setShsDuration] = useState<'Whole Year' | 'One Semester'>('One Semester');
  const [shsSemester, setShsSemester] = useState<'Semester 1' | 'Semester 2'>('Semester 1');

  // Reactively sync defaults when workspace changes
  React.useEffect(() => {
    if (workspaceMode === 'SHS') {
      setSubject('');
      setGradeLevel('Grade 11');
      setQuarter('1st Quarter');
    } else {
      setSubject('English');
      setGradeLevel('Grade 10');
      setQuarter('1st Quarter');
    }
  }, [workspaceMode]);

  // Reactively enforce valid quarters based on SHS duration and semester selection
  React.useEffect(() => {
    if (workspaceMode === 'SHS') {
      if (shsDuration === 'One Semester') {
        if (shsSemester === 'Semester 1') {
          if (quarter !== '1st Quarter' && quarter !== '2nd Quarter') {
            setQuarter('1st Quarter');
          }
        } else {
          if (quarter !== '3rd Quarter' && quarter !== '4th Quarter') {
            setQuarter('3rd Quarter');
          }
        }
      }
    }
  }, [workspaceMode, shsDuration, shsSemester, quarter]);

  // Custom inline modals to bypass browser dialog blocking inside sandboxed iframe
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showCustomAlert = (message: string, title = "System Notification", type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title = "Action Confirmation") => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  React.useEffect(() => {
    if (selectedConsolidatedClass && printFriendly) {
      document.body.classList.add('print-mode-active');
    } else {
      document.body.classList.remove('print-mode-active');
    }
    return () => {
      document.body.classList.remove('print-mode-active');
    };
  }, [selectedConsolidatedClass, printFriendly]);

  const groupedClasses = React.useMemo(() => {
    const groups: Record<string, {
      key: string;
      schoolYear: string;
      gradeLevel: string;
      section: string;
      subject: string;
      projects: Project[];
    }> = {};

    workspaceProjects.forEach(p => {
      // For SHS, we group depending on project duration and semester
      let key = "";
      if (p.workspace === 'SHS') {
        if (p.projectDuration === 'One Semester') {
          key = `${p.schoolYear} | ${p.gradeLevel} | ${p.section} | ${p.subject} | ${p.semester}`;
        } else {
          key = `${p.schoolYear} | ${p.gradeLevel} | ${p.section} | ${p.subject} | Whole Year`;
        }
      } else {
        key = `${p.schoolYear} | ${p.gradeLevel} | ${p.section} | ${p.subject}`;
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          schoolYear: p.schoolYear,
          gradeLevel: p.gradeLevel,
          section: p.section,
          subject: p.subject,
          projects: []
        };
      }
      groups[key].projects.push(p);
    });

    return Object.values(groups);
  }, [workspaceProjects]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!section.trim()) {
      showCustomAlert("Please enter a section name (e.g. St. Peter).", "Missing Section Name", "error");
      return;
    }
    if (workspaceMode === 'SHS' && !subject.trim()) {
      showCustomAlert("Please enter a subject name (e.g. Pre-Calculus).", "Missing Subject Name", "error");
      return;
    }

    const isSHS = workspaceMode === 'SHS';
    const newId = createProject({
      schoolName: globalSettings.schoolName,
      schoolYear,
      quarter,
      gradeLevel,
      section: section.trim(),
      subject: subject.trim(),
      teacherName: globalSettings.teacherName,
      passingGrade,
      depedPolicy,
      workspace: workspaceMode,
      semester: isSHS && shsDuration === 'One Semester' ? shsSemester : undefined,
      projectDuration: isSHS ? shsDuration : undefined,
      assessmentProfileId: isSHS ? shsProfileId : undefined
    });
    setSection('');
    // Auto shift view to Class Manager so the teacher can edit right away
    setActiveRoute('class-manager');
  };

  // --------------------------------------------------------
  // PROJECT OPEN ANALYTICS (Phase 7)
  // --------------------------------------------------------
  if (activeProject) {
    const activeStudents = activeProject.students.filter(s => s.status === 'Active');
    const totalStudents = activeStudents.length;

    // Grades computation
    let sumGrades = 0;
    let highestGrade = 0;
    let lowestGrade = 100;
    let passingCount = 0;
    let gradedCount = 0;

    // Descriptors counters
    let outstanding = 0;      // 90-100
    let verySatisfactory = 0;  // 85-89
    let satisfactory = 0;      // 80-84
    let fairlySatisfactory = 0;// 75-79
    let didNotMeet = 0;        // < 75

    activeStudents.forEach(st => {
      const g = computeProjectStudentGrade(activeProject, st.id);
      if (g.hasScores) {
        sumGrades += g.finalGrade;
        gradedCount++;
        if (g.finalGrade > highestGrade) highestGrade = g.finalGrade;
        if (g.finalGrade < lowestGrade) lowestGrade = g.finalGrade;
        if (g.isPassing) passingCount++;

        if (g.finalGrade >= 90) outstanding++;
        else if (g.finalGrade >= 85) verySatisfactory++;
        else if (g.finalGrade >= 80) satisfactory++;
        else if (g.finalGrade >= activeProject.passingGrade) fairlySatisfactory++;
        else didNotMeet++;
      }
    });

    if (gradedCount === 0) lowestGrade = 0;

    const averageGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
    const passingRate = gradedCount > 0 ? Math.round((passingCount / gradedCount) * 100) : 0;
    const failingRate = gradedCount > 0 ? 100 - passingRate : 0;

    // Assessment Completion Rate
    // Total possible scores cell matrix size = total students * total assessments
    const totalAssessments = activeProject.assessments.length;
    const totalPossibleCells = totalStudents * totalAssessments;
    let filledCellsCount = 0;

    activeStudents.forEach(st => {
      const studentScores = activeProject.scores[st.id] || {};
      activeProject.assessments.forEach(ass => {
        if (studentScores[ass.id] !== undefined) {
          filledCellsCount++;
        }
      });
    });

    const completionRate = totalPossibleCells > 0 ? Math.round((filledCellsCount / totalPossibleCells) * 100) : 0;
    const missingScoresCount = Math.max(0, totalPossibleCells - filledCellsCount);

    // Distribution Data for Recharts
    const distributionData = [
      { name: '90-100 (Outstanding)', value: outstanding, color: '#4f46e5' },
      { name: '85-89 (Very Sat.)', value: verySatisfactory, color: '#6366f1' },
      { name: '80-84 (Satisfactory)', value: satisfactory, color: '#818cf8' },
      { name: '75-79 (Fairly Sat.)', value: fairlySatisfactory, color: '#a5b4fc' },
      { name: 'Below 75 (Need Interv)', value: didNotMeet, color: '#ef4444' }
    ];

    // Calculate individual assessment statistics
    const assessmentStats = activeProject.assessments.map(ass => {
      let totalRaw = 0;
      let count = 0;
      activeStudents.forEach(st => {
        const score = activeProject.scores[st.id]?.[ass.id];
        if (score !== undefined) {
          totalRaw += score;
          count++;
        }
      });
      const avg = count > 0 ? Math.round((totalRaw / count) * 10) / 10 : 0;
      const pct = ass.perfectScore > 0 ? Math.round((avg / ass.perfectScore) * 100) : 0;
      return {
        ...ass,
        averageScore: avg,
        averagePercentage: pct,
        count
      };
    });

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Active Project Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 md:p-8 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                ACTIVE WORKSPACE
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {activeProject.id}</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeProject.subject} • {activeProject.gradeLevel} - {activeProject.section}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold flex items-center gap-2.5">
              <span>Teacher: {activeProject.teacherName}</span>
              <span>•</span>
              <span>Quarter: {activeProject.quarter}</span>
              <span>•</span>
              <span>S.Y. {activeProject.schoolYear}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setActiveRoute('class-manager')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="h-4 w-4" /> Open Gradebook
            </button>
            <button
              onClick={() => openProject(null)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer border border-slate-150 dark:border-slate-800"
            >
              <X className="h-4 w-4" /> Close Project
            </button>
          </div>
        </div>

        {/* Phase 7 Statistics Dashboard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Learners</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalStudents}</div>
            <div className="text-[10px] text-slate-400 font-medium">Active roster</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Average Grade</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{averageGrade}%</div>
            <div className="text-[10px] text-slate-400 font-medium">Class mean card score</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Passing Rate</span>
              <TrendingUp className="h-4 w-4 text-indigo-500 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{passingRate}%</div>
            <div className="text-[10px] text-slate-450 font-bold">Failing: <span className="text-rose-500">{failingRate}%</span></div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">High / Low</span>
              <Award className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {highestGrade} <span className="text-xs text-slate-400 font-medium">/ {lowestGrade}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Extreme score bounds</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Completion</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{completionRate}%</div>
            <div className="text-[10px] text-slate-400 font-medium">Grade cell coverage</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-3xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Missing Marks</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className={`text-2xl font-black ${missingScoresCount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600'}`}>
              {missingScoresCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Blank grade records</div>
          </div>
        </div>

        {/* Bento Row: Chart & Assessment performances */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
            <div className="space-y-1">
              <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Learner Grade Distribution
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Frequency distribution based on official DepEd descriptors.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }} 
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-5">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Assessment Ratios & Means
            </h3>

            {totalAssessments === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                No assessments created yet. Add some in Workspace.
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {assessmentStats.map(ass => (
                  <div key={ass.id} className="space-y-1 pb-3 border-b border-slate-50 dark:border-slate-855 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate" title={ass.name}>
                          {ass.name}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                          Category: <span className="font-bold text-indigo-650">{ass.category}</span> | Perfect: {ass.perfectScore}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                          Mean: {ass.averageScore}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {ass.averagePercentage}% score
                        </div>
                      </div>
                    </div>
                    {/* Tiny Progress bar */}
                    <div className="h-1 w-full bg-slate-55 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          ass.category === 'WW' ? 'bg-emerald-600' : ass.category === 'PT' ? 'bg-emerald-400' : 'bg-teal-500'
                        }`}
                        style={{ width: `${ass.averagePercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Settings Shortcut Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 border border-emerald-950 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-300">Shortcut Matrix</span>
            <h3 className="text-base md:text-lg font-black tracking-tight leading-tight">Need to adjust subject categories or passing scores?</h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed font-medium">
              Change school-wide default parameters, teacher identity fields, and custom assessment weight matrices easily inside system settings.
            </p>
          </div>
          <button
            onClick={() => setActiveRoute('settings')}
            className="flex items-center justify-between gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm shrink-0 w-full sm:w-auto self-stretch sm:self-auto"
          >
            <span>Configure System Setup</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // FULL-SCREEN PRINT MODE VIEW
  // --------------------------------------------------------
  if (selectedConsolidatedClass && printFriendly) {
    const activeGroup = groupedClasses.find(g => g.key === selectedConsolidatedClass);
    if (activeGroup) {
      const isSHS = activeGroup.projects[0]?.workspace === 'SHS';
      const duration = activeGroup.projects[0]?.projectDuration;
      const semester = activeGroup.projects[0]?.semester;

      const q1Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('1st'));
      const q2Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('2nd'));
      const q3Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('3rd'));
      const q4Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('4th'));

      // Decide which quarters are active in this group
      let showQ1 = true;
      let showQ2 = true;
      let showQ3 = true;
      let showQ4 = true;

      if (isSHS && duration === 'One Semester') {
        if (semester === 'Semester 1') {
          showQ3 = false;
          showQ4 = false;
        } else if (semester === 'Semester 2') {
          showQ1 = false;
          showQ2 = false;
        }
      }

      // Helper lookup function
      const getStudentQuarterGrade = (proj: Project, lrn: string, name: string) => {
        const normName = name.trim().toUpperCase();
        const s = proj.students.find(x => 
          (lrn && lrn !== '123456789123' && x.lrn === lrn) || 
          x.name.trim().toUpperCase() === normName
        );
        if (!s) return null;
        const r = computeProjectStudentGrade(proj, s.id);
        return r.hasScores ? r.finalGrade : null;
      };

      // Roster Compilation
      const fullRoster = (() => {
        const studentsMap = new Map<string, Student>();
        const isDummyLrn = (l?: string) => !l || l === '123456789123' || l.startsWith('123');
        
        activeGroup.projects.forEach(proj => {
          proj.students.forEach(st => {
            const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8) 
              ? `${st.name.trim().toUpperCase()}_${st.lrn.trim()}`
              : st.name.trim().toUpperCase();
            if (!studentsMap.has(key)) {
              studentsMap.set(key, st);
            }
          });
        });
        let list = Array.from(studentsMap.values());
        if (list.length > 1) {
          list = list.filter(s => !(s.lrn === '123456789123' && s.name.toUpperCase().includes('DELA CRUZ')));
        }
        const isM = (s: Student) => {
          const sx = (s.sex || '').trim().toLowerCase();
          return sx === 'male' || sx === 'm' || sx === 'boy' || sx.startsWith('m');
        };
        const isF = (s: Student) => {
          const sx = (s.sex || '').trim().toLowerCase();
          return sx === 'female' || sx === 'f' || sx === 'girl' || sx.startsWith('f');
        };

        const m = list.filter(isM).sort((a,b) => a.name.localeCompare(b.name));
        const f = list.filter(isF).sort((a,b) => a.name.localeCompare(b.name));
        const unspec = list.filter(s => !isM(s) && !isF(s)).sort((a,b) => a.name.localeCompare(b.name));
        return { males: m, females: f, unspec, all: [...m, ...f, ...unspec] };
      })();

      const passingGradeVal = activeGroup.projects[0]?.passingGrade ?? 75;

      // Filtered rosters based on search input
      const filterList = (arr: Student[]) => {
        if (!consolidatedSearch.trim()) return arr;
        const q = consolidatedSearch.toLowerCase();
        return arr.filter(s => s.name.toLowerCase().includes(q) || (s.lrn && s.lrn.includes(q)));
      };

      const filteredMales = filterList(fullRoster.males);
      const filteredFemales = filterList(fullRoster.females);
      const filteredUnspec = filterList(fullRoster.unspec);

      // Statistics computation over all students
      let gradedCount = 0;
      let sumGrades = 0;
      let passedCount = 0;
      let outstanding = 0;
      let verySat = 0;
      let sat = 0;
      let fairlySat = 0;
      let didNotMeet = 0;

      fullRoster.all.forEach(st => {
        const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
        const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
        const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
        const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

        const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
        if (qs.length > 0) {
          const finalG = Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
          sumGrades += finalG;
          gradedCount++;
          if (finalG >= passingGradeVal) passedCount++;

          if (finalG >= 90) outstanding++;
          else if (finalG >= 85) verySat++;
          else if (finalG >= 80) sat++;
          else if (finalG >= passingGradeVal) fairlySat++;
          else didNotMeet++;
        }
      });

      const meanFinalGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
      const passingRate = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 100) : 0;

      return (
        <div className="space-y-6 animate-fade-in print:animate-none pb-12 bg-white text-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto print:p-0 print:m-0 print:border-0 print:shadow-none print:max-w-full print:rounded-none print:pb-0 print:space-y-4 print:block print:h-auto print:max-h-none print:overflow-visible">
          {/* Floating Print Utility Bar (Non-Printable) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden no-print">
            <button
              type="button"
              onClick={() => { setSelectedConsolidatedClass(null); setPrintFriendly(false); }}
              className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Back to Directory</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Field */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={consolidatedSearch}
                  onChange={(e) => setConsolidatedSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-hidden font-bold"
                />
              </div>

              {/* Save / Export Multi-Page PDF Button */}
              <button
                type="button"
                disabled={isExportingPDF}
                onClick={async () => {
                  setIsExportingPDF(true);
                  try {
                    const filename = `Consolidated_Grades_${activeGroup.gradeLevel}_${activeGroup.section}_${activeGroup.subject}.pdf`.replace(/\s+/g, '_');
                    await exportElementToPDF('print-sheet-area', filename);
                  } catch (err) {
                    console.error('Export error:', err);
                  } finally {
                    setIsExportingPDF(false);
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF (All Pages)'}</span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span>Print Document</span>
              </button>

              {/* Exit Print Mode Toggle */}
              <button
                type="button"
                onClick={() => setPrintFriendly(false)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Exit Print Mode
              </button>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between gap-3 font-bold print:hidden no-print">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>
                <strong>Guaranteed Full Document Export:</strong> Click <strong>"Download PDF (All Pages)"</strong> to save the entire sheet (Page 1 & Page 2, Male & Female records) as an A4 PDF document, then print it directly with zero cutoff!
              </span>
            </div>
          </div>

          {/* Actual Document Area */}
          <div id="print-sheet-area" className="bg-white text-slate-900 space-y-6 print:space-y-4 print:p-0 print:m-0 print:block print:h-auto print:max-h-none print:overflow-visible">
            {/* School Heading Panel */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900/15 print:pb-2 print:border-b-2">
              <div className="text-[9px] font-sans font-black tracking-widest text-slate-400 uppercase">REPUBLIC OF THE PHILIPPINES</div>
              <div className="text-[10px] font-sans font-black tracking-wider text-slate-700 uppercase">DEPARTMENT OF EDUCATION</div>
              <div className="text-[12px] font-black text-indigo-700 font-sans tracking-tight">{globalSettings.schoolName}</div>
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider pt-2">CONSOLIDATED REPORT OF LEARNER GRADES</h2>
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wide">
                Subject: {activeGroup.subject} | Grade & Section: {activeGroup.gradeLevel} - {activeGroup.section} | S.Y. {activeGroup.schoolYear}
              </div>
            </div>

            {/* Spreadsheet Grid Container */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs print:border-0 print:rounded-none print:shadow-none print:overflow-visible print:block print:h-auto print:max-h-none">
              <div className="overflow-x-auto print:overflow-visible print:block print:h-auto print:max-h-none">
                <table className="w-full text-left border-collapse border-spacing-0 select-none text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-sans text-slate-500 uppercase tracking-wider font-black text-center">
                      <th className="py-2.5 px-4 text-left border-r border-slate-200 bg-slate-100/50 text-slate-500 font-bold w-12">No.</th>
                      <th className="py-2.5 px-4 text-left border-r border-slate-200 bg-slate-100/50 text-slate-500 font-bold min-w-[180px]">Learner Name</th>
                      <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-slate-100/50 text-slate-500 font-bold w-28">LRN</th>
                      {showQ1 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">Q1</th>}
                      {showQ2 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">Q2</th>}
                      {showQ3 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">Q3</th>}
                      {showQ4 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">Q4</th>}
                      <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-indigo-100/30 text-indigo-800 font-black w-16">Final</th>
                      <th className="py-2.5 px-3 text-center bg-slate-50 text-slate-650 font-black w-28">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
                    
                    {/* Male Header */}
                    <tr className="bg-slate-100/40 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200">
                      <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-indigo-700">
                        Males ({filteredMales.length} learners)
                      </td>
                    </tr>
                    
                    {filteredMales.length === 0 ? (
                      <tr className="text-center text-slate-450 text-xs italic">
                        <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-3">No male learners found.</td>
                      </tr>
                    ) : (
                      filteredMales.map((st, idx) => {
                        const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                        const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                        const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                        const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                        const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                        const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                        const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/20 text-slate-700">
                            <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-extrabold uppercase text-slate-900">{st.name}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                            {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q1 !== null ? q1 : '-'}</td>}
                            {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q2 !== null ? q2 : '-'}</td>}
                            {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q3 !== null ? q3 : '-'}</td>}
                            {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q4 !== null ? q4 : '-'}</td>}
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-indigo-50/15 font-black text-xs text-indigo-750">
                              {finalG !== null ? finalG : '-'}
                            </td>
                            <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                              {remark}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Female Header */}
                    <tr className="bg-slate-100/40 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200">
                      <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-indigo-700">
                        Females ({filteredFemales.length} learners)
                      </td>
                    </tr>
                    
                    {filteredFemales.length === 0 ? (
                      <tr className="text-center text-slate-450 text-xs italic">
                        <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-3">No female learners found.</td>
                      </tr>
                    ) : (
                      filteredFemales.map((st, idx) => {
                        const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                        const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                        const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                        const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                        const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                        const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                        const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/20 text-slate-700">
                            <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-extrabold uppercase text-slate-900">{st.name}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                            {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q1 !== null ? q1 : '-'}</td>}
                            {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q2 !== null ? q2 : '-'}</td>}
                            {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q3 !== null ? q3 : '-'}</td>}
                            {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q4 !== null ? q4 : '-'}</td>}
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-indigo-50/15 font-black text-xs text-indigo-750">
                              {finalG !== null ? finalG : '-'}
                            </td>
                            <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                              {remark}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Unspecified Sex Header */}
                    {filteredUnspec.length > 0 && (
                      <>
                        <tr className="bg-slate-100/40 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200">
                          <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-amber-700">
                            Unspecified Sex ({filteredUnspec.length} learners)
                          </td>
                        </tr>
                        {filteredUnspec.map((st, idx) => {
                          const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                          const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                          const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                          const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                          const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                          const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                          const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/20 text-slate-700">
                              <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-extrabold uppercase text-slate-900">{st.name}</td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                              {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q1 !== null ? q1 : '-'}</td>}
                              {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q2 !== null ? q2 : '-'}</td>}
                              {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q3 !== null ? q3 : '-'}</td>}
                              {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">{q4 !== null ? q4 : '-'}</td>}
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-indigo-50/15 font-black text-xs text-indigo-750">
                                {finalG !== null ? finalG : '-'}
                              </td>
                              <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                                {remark}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stat summary layout and Signatures block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Class statistics cards */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase">Class Performance Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Graded Population</span>
                    <strong className="text-sm font-black text-slate-850">{gradedCount} <span className="text-[9px] text-slate-450 font-semibold font-sans">/ {fullRoster.all.length} total</span></strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Class General Mean</span>
                    <strong className="text-sm font-black text-indigo-650 font-mono">{meanFinalGrade}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Passing Rate</span>
                    <strong className="text-sm font-black text-emerald-650 font-mono">{passingRate}%</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Roster Sex Breakdown</span>
                    <span className="text-[11px] font-bold text-slate-650">{fullRoster.males.length} M • {fullRoster.females.length} F</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-1.5">
                  <h5 className="text-[8px] font-sans font-black text-slate-400 tracking-wider uppercase">Annual Desk Descriptors Distribution</h5>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] font-bold">
                    <div className="p-1 bg-indigo-50 rounded-md" title="90-100">
                      <div className="text-indigo-600 text-[10px]">{outstanding}</div>
                      <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Outst.</div>
                    </div>
                    <div className="p-1 bg-indigo-50 rounded-md" title="85-89">
                      <div className="text-indigo-600 text-[10px]">{verySat}</div>
                      <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Very Sat.</div>
                    </div>
                    <div className="p-1 bg-indigo-50 rounded-md" title="80-84">
                      <div className="text-indigo-600 text-[10px]">{sat}</div>
                      <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Sat.</div>
                    </div>
                    <div className="p-1 bg-indigo-50 rounded-md" title="75-79">
                      <div className="text-indigo-600 text-[10px]">{fairlySat}</div>
                      <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Fair Sat.</div>
                    </div>
                    <div className="p-1 bg-rose-50 rounded-md" title="Below 75">
                      <div className="text-rose-500 text-[10px]">{didNotMeet}</div>
                      <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Need Int.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures block */}
              <div className="border border-dashed border-slate-200 rounded-xl p-5 flex flex-col justify-between min-h-44">
                <div>
                  <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase mb-1">Official Verification Signatures</h4>
                  <p className="text-[8.5px] text-slate-400 leading-relaxed font-semibold">
                    This grade consolidation conforms with current Department of Education regulations and school year policy directives. This record remains securely stored offline.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[9px] font-sans">
                  <div className="space-y-1">
                    <div className="border-b border-slate-900/40 pb-1 font-bold text-slate-900 uppercase font-serif tracking-wide">{globalSettings.teacherName}</div>
                    <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Subject Teacher</div>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-slate-900/40 pb-1 font-bold text-slate-400 italic">_______________________</div>
                    <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">School Principal / Registrar</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // --------------------------------------------------------
  // PROJECT HUB (No Active Project - Phase 2 Launcher)
  // --------------------------------------------------------
  const activeCount = workspaceProjects.filter(p => !p.isArchived).length;
  const archivedCount = workspaceProjects.filter(p => p.isArchived).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 md:p-8 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono font-bold px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">
              DESKTOP HUB
            </span>
            <span className="text-xs text-slate-400 font-mono">Offline-First</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {workspaceMode === 'SHS' ? 'Senior High School (SHS) Gradebook' : 'Junior High School (JHS) Gradebook'}
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold">
            {workspaceMode === 'SHS' 
              ? 'Manually configure subjects, choose specific assessment profiles (1-6) with defined DepEd weights, and group by Semester or Whole Year.' 
              : 'Create JHS grading projects, import class lists, build assessment rubrics, and run computations offline.'}
          </p>
        </div>

        <div className="flex gap-4 text-center shrink-0">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl min-w-[80px]">
            <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Active</div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{activeCount}</div>
          </div>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl min-w-[80px]">
            <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Archived</div>
            <div className="text-lg font-black text-slate-500">{archivedCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects List (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
            {/* Directory Header with Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-600 shrink-0" />
                <h3 className="font-sans font-black text-xs text-slate-450 dark:text-slate-400 uppercase tracking-widest">
                  {selectedConsolidatedClass ? 'Annual Report Card View' : dashboardTab === 'quarters' ? 'Grading Projects Directory' : 'Consolidated Annual Directory'}
                </h3>
              </div>
              
              {!selectedConsolidatedClass && (
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-150 dark:border-slate-800/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setDashboardTab('quarters'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dashboardTab === 'quarters' 
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Independent Quarters
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDashboardTab('consolidation'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dashboardTab === 'consolidation' 
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-3xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Consolidated Annual Reports
                  </button>
                </div>
              )}
            </div>

            {selectedConsolidatedClass ? (
              <div className="space-y-6">
                {/* Header controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-805">
                  <button
                    type="button"
                    onClick={() => { setSelectedConsolidatedClass(null); setPrintFriendly(false); }}
                    className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-450 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors self-start"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                    <span>Back to Directory</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={consolidatedSearch}
                        onChange={(e) => setConsolidatedSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-hidden font-bold"
                      />
                    </div>

                    {/* Print Preview Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setPrintFriendly(!printFriendly)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border w-full sm:w-auto ${
                        printFriendly 
                          ? 'bg-amber-550 text-white border-amber-550' 
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Printer className="h-4 w-4" />
                      <span>{printFriendly ? 'Exit Print Mode' : 'Toggle Print Sheet'}</span>
                    </button>
                  </div>
                </div>

                {/* Print Banner notification */}
                {printFriendly && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs rounded-xl flex items-center gap-2.5 font-bold">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    <span>Print Sheet mode is ACTIVE. All background panels, sidebar, and buttons are hidden. Use your browser's Print option (Ctrl+P or Cmd+P) to print this sheet directly.</span>
                  </div>
                )}

                {/* The main consolidated content wrapper */}
                {(() => {
                  const activeGroup = groupedClasses.find(g => g.key === selectedConsolidatedClass);
                  if (!activeGroup) return null;

                  const isSHS = activeGroup.projects[0]?.workspace === 'SHS';
                  const duration = activeGroup.projects[0]?.projectDuration;
                  const semester = activeGroup.projects[0]?.semester;

                  const q1Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('1st'));
                  const q2Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('2nd'));
                  const q3Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('3rd'));
                  const q4Proj = activeGroup.projects.find(p => p.quarter.toLowerCase().includes('4th'));

                  // Decide which quarters are active in this group
                  let showQ1 = true;
                  let showQ2 = true;
                  let showQ3 = true;
                  let showQ4 = true;

                  if (isSHS && duration === 'One Semester') {
                    if (semester === 'Semester 1') {
                      showQ3 = false;
                      showQ4 = false;
                    } else if (semester === 'Semester 2') {
                      showQ1 = false;
                      showQ2 = false;
                    }
                  }

                  // Helper lookup function
                  const getStudentQuarterGrade = (proj: Project, lrn: string, name: string) => {
                    const normName = name.trim().toUpperCase();
                    const s = proj.students.find(x => 
                      (lrn && lrn !== '123456789123' && x.lrn === lrn) || 
                      x.name.trim().toUpperCase() === normName
                    );
                    if (!s) return null;
                    const r = computeProjectStudentGrade(proj, s.id);
                    return r.hasScores ? r.finalGrade : null;
                  };

                  // Roster Compilation
                  const fullRoster = (() => {
                    const studentsMap = new Map<string, Student>();
                    const isDummyLrn = (l?: string) => !l || l === '123456789123' || l.startsWith('123');

                    activeGroup.projects.forEach(proj => {
                      proj.students.forEach(st => {
                        const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8) 
                          ? `${st.name.trim().toUpperCase()}_${st.lrn.trim()}`
                          : st.name.trim().toUpperCase();
                        if (!studentsMap.has(key)) {
                          studentsMap.set(key, st);
                        }
                      });
                    });
                    let list = Array.from(studentsMap.values());
                    if (list.length > 1) {
                      list = list.filter(s => !(s.lrn === '123456789123' && s.name.toUpperCase().includes('DELA CRUZ')));
                    }
                    const isM = (s: Student) => {
                      const sx = (s.sex || '').trim().toLowerCase();
                      return sx === 'male' || sx === 'm' || sx === 'boy' || sx.startsWith('m');
                    };
                    const isF = (s: Student) => {
                      const sx = (s.sex || '').trim().toLowerCase();
                      return sx === 'female' || sx === 'f' || sx === 'girl' || sx.startsWith('f');
                    };

                    const m = list.filter(isM).sort((a,b) => a.name.localeCompare(b.name));
                    const f = list.filter(isF).sort((a,b) => a.name.localeCompare(b.name));
                    const unspec = list.filter(s => !isM(s) && !isF(s)).sort((a,b) => a.name.localeCompare(b.name));
                    return { males: m, females: f, unspec, all: [...m, ...f, ...unspec] };
                  })();

                  const passingGradeVal = activeGroup.projects[0]?.passingGrade ?? 75;

                  // Filtered rosters based on search input
                  const filterList = (arr: Student[]) => {
                    if (!consolidatedSearch.trim()) return arr;
                    const q = consolidatedSearch.toLowerCase();
                    return arr.filter(s => s.name.toLowerCase().includes(q) || (s.lrn && s.lrn.includes(q)));
                  };

                  const filteredMales = filterList(fullRoster.males);
                  const filteredFemales = filterList(fullRoster.females);
                  const filteredUnspec = filterList(fullRoster.unspec);

                  // Statistics computation over all students
                  let gradedCount = 0;
                  let sumGrades = 0;
                  let passedCount = 0;
                  let outstanding = 0;
                  let verySat = 0;
                  let sat = 0;
                  let fairlySat = 0;
                  let didNotMeet = 0;

                  fullRoster.all.forEach(st => {
                    const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                    const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                    const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                    const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                    const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                    if (qs.length > 0) {
                      const finalG = Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
                      sumGrades += finalG;
                      gradedCount++;
                      if (finalG >= passingGradeVal) passedCount++;

                      if (finalG >= 90) outstanding++;
                      else if (finalG >= 85) verySat++;
                      else if (finalG >= 80) sat++;
                      else if (finalG >= passingGradeVal) fairlySat++;
                      else didNotMeet++;
                    }
                  });

                  const meanFinalGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
                  const passingRate = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 100) : 0;

                  return (
                    <div id="print-sheet-area" className={`space-y-6 ${printFriendly ? 'p-6 bg-white text-slate-900 border-0 rounded-xl' : ''}`}>
                      {/* School Heading Panel */}
                      <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900/15">
                        <div className="text-[9px] font-sans font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">REPUBLIC OF THE PHILIPPINES</div>
                        <div className="text-[10px] font-sans font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase">DEPARTMENT OF EDUCATION</div>
                        <div className="text-[12px] font-black text-indigo-700 dark:text-indigo-400 font-sans tracking-tight">{globalSettings.schoolName}</div>
                        <h2 className="text-xs font-black text-slate-955 dark:text-white uppercase tracking-wider pt-2">CONSOLIDATED REPORT OF LEARNER GRADES</h2>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wide">
                          Subject: {activeGroup.subject} | Grade & Section: {activeGroup.gradeLevel} - {activeGroup.section} | S.Y. {activeGroup.schoolYear}
                        </div>
                      </div>

                      {/* Spreadsheet Grid Container */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs print:border-0 print:rounded-none print:shadow-none print:overflow-visible">
                        <div className="overflow-x-auto print:overflow-visible">
                          <table className="w-full text-left border-collapse border-spacing-0 select-none text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/40 text-[9px] font-sans text-slate-450 dark:text-slate-500 uppercase tracking-wider font-black text-center">
                                <th className="py-2.5 px-4 text-left border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold w-12">No.</th>
                                <th className="py-2.5 px-4 text-left border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold min-w-[180px]">Learner Name</th>
                                <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold w-28">LRN</th>
                                {showQ1 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-black w-12">Q1</th>}
                                {showQ2 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-black w-12">Q2</th>}
                                {showQ3 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-black w-12">Q3</th>}
                                {showQ4 && <th className="py-2.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-black w-12">Q4</th>}
                                <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-100/30 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 font-black w-16">Final</th>
                                <th className="py-2.5 px-3 text-center bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 font-black w-28">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-slate-850/60 font-mono">
                              
                              {/* Male Header */}
                              <tr className="bg-slate-100/40 dark:bg-slate-950/30 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200 dark:border-slate-855">
                                <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-indigo-700 dark:text-indigo-400">
                                  Males ({filteredMales.length} learners)
                                </td>
                              </tr>
                              
                              {filteredMales.length === 0 ? (
                                <tr className="text-center text-slate-450 text-xs italic">
                                  <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-3">No male learners found.</td>
                                </tr>
                              ) : (
                                filteredMales.map((st, idx) => {
                                  const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                                  const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                                  const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                                  const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                                  const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                                  const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                                  const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                                  return (
                                    <tr key={st.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 text-slate-700 dark:text-slate-300">
                                      <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                                      <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-extrabold uppercase text-slate-900 dark:text-white">{st.name}</td>
                                      <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                                      {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q1 !== null ? q1 : '-'}</td>}
                                      {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q2 !== null ? q2 : '-'}</td>}
                                      {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q3 !== null ? q3 : '-'}</td>}
                                      {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q4 !== null ? q4 : '-'}</td>}
                                      <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center bg-indigo-50/15 dark:bg-indigo-950/15 font-black text-xs text-indigo-750 dark:text-indigo-400">
                                        {finalG !== null ? finalG : '-'}
                                      </td>
                                      <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-655 dark:text-emerald-400' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                                        {remark}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}

                              {/* Female Header */}
                              <tr className="bg-slate-100/40 dark:bg-slate-950/30 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200 dark:border-slate-855">
                                <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-indigo-700 dark:text-indigo-400">
                                  Females ({filteredFemales.length} learners)
                                </td>
                              </tr>
                              
                              {filteredFemales.length === 0 ? (
                                <tr className="text-center text-slate-450 text-xs italic">
                                  <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-3">No female learners found.</td>
                                </tr>
                              ) : (
                                filteredFemales.map((st, idx) => {
                                  const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                                  const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                                  const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                                  const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                                  const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                                  const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                                  const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                                  return (
                                    <tr key={st.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 text-slate-700 dark:text-slate-300">
                                      <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                                      <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-extrabold uppercase text-slate-900 dark:text-white">{st.name}</td>
                                      <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                                      {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q1 !== null ? q1 : '-'}</td>}
                                      {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q2 !== null ? q2 : '-'}</td>}
                                      {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q3 !== null ? q3 : '-'}</td>}
                                      {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q4 !== null ? q4 : '-'}</td>}
                                      <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center bg-indigo-50/15 dark:bg-indigo-950/15 font-black text-xs text-indigo-750 dark:text-indigo-400">
                                        {finalG !== null ? finalG : '-'}
                                      </td>
                                      <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-655 dark:text-emerald-400' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                                        {remark}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}

                              {/* Unspecified Sex Header */}
                              {filteredUnspec.length > 0 && (
                                <>
                                  <tr className="bg-slate-100/40 dark:bg-slate-950/30 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200 dark:border-slate-855">
                                    <td colSpan={5 + (showQ1 ? 1 : 0) + (showQ2 ? 1 : 0) + (showQ3 ? 1 : 0) + (showQ4 ? 1 : 0)} className="py-2 px-4 text-left uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400">
                                      Unspecified Sex ({filteredUnspec.length} learners)
                                    </td>
                                  </tr>
                                  {filteredUnspec.map((st, idx) => {
                                    const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name) : null;
                                    const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name) : null;
                                    const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name) : null;
                                    const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name) : null;

                                    const qs = [q1, q2, q3, q4].filter(v => v !== null) as number[];
                                    const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                                    const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                                    return (
                                      <tr key={st.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 text-slate-700 dark:text-slate-300">
                                        <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                                        <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-extrabold uppercase text-slate-900 dark:text-white">{st.name}</td>
                                        <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                                        {showQ1 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q1 !== null ? q1 : '-'}</td>}
                                        {showQ2 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q2 !== null ? q2 : '-'}</td>}
                                        {showQ3 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q3 !== null ? q3 : '-'}</td>}
                                        {showQ4 && <td className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">{q4 !== null ? q4 : '-'}</td>}
                                        <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center bg-indigo-50/15 dark:bg-indigo-950/15 font-black text-xs text-indigo-750 dark:text-indigo-400">
                                          {finalG !== null ? finalG : '-'}
                                        </td>
                                        <td className={`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase ${remark === 'Passed' ? 'text-emerald-655 dark:text-emerald-400' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}`}>
                                          {remark}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Stat summary layout and Signatures block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        
                        {/* Class statistics cards */}
                        <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                          <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase">Class Performance Summary</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Graded Population</span>
                              <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{gradedCount} <span className="text-[9px] text-slate-450 font-semibold font-sans">/ {fullRoster.all.length} total</span></strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Class General Mean</span>
                              <strong className="text-sm font-black text-indigo-650 dark:text-indigo-400 font-mono">{meanFinalGrade}</strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Passing Rate</span>
                              <strong className="text-sm font-black text-emerald-655 dark:text-emerald-400 font-mono">{passingRate}%</strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Roster Sex Breakdown</span>
                              <span className="text-[11px] font-bold text-slate-650 dark:text-slate-350">{fullRoster.males.length} M • {fullRoster.females.length} F{fullRoster.unspec.length > 0 ? ` • ${fullRoster.unspec.length} Other` : ''}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 rounded-xl space-y-1.5">
                            <h5 className="text-[8px] font-sans font-black text-slate-400 tracking-wider uppercase">Annual Desk Descriptors Distribution</h5>
                            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] font-bold">
                              <div className="p-1 bg-indigo-55/10 dark:bg-indigo-950/15 rounded-md" title="90-100">
                                <div className="text-indigo-655 dark:text-indigo-450 text-[10px]">{outstanding}</div>
                                <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Outst.</div>
                              </div>
                              <div className="p-1 bg-indigo-55/10 dark:bg-indigo-950/15 rounded-md" title="85-89">
                                <div className="text-indigo-655 dark:text-indigo-450 text-[10px]">{verySat}</div>
                                <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Very Sat.</div>
                              </div>
                              <div className="p-1 bg-indigo-55/10 dark:bg-indigo-950/15 rounded-md" title="80-84">
                                <div className="text-indigo-655 dark:text-indigo-450 text-[10px]">{sat}</div>
                                <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Sat.</div>
                              </div>
                              <div className="p-1 bg-indigo-55/10 dark:bg-indigo-950/15 rounded-md" title="75-79">
                                <div className="text-indigo-655 dark:text-indigo-450 text-[10px]">{fairlySat}</div>
                                <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Fair Sat.</div>
                              </div>
                              <div className="p-1 bg-rose-50/20 dark:bg-rose-950/15 rounded-md" title="Below 75">
                                <div className="text-rose-500 text-[10px]">{didNotMeet}</div>
                                <div className="text-[6.5px] text-slate-400 mt-0.5 uppercase truncate">Need Int.</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signatures block */}
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-44">
                          <div>
                            <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase mb-1">Official Verification Signatures</h4>
                            <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                              This grade consolidation conforms with current Department of Education regulations and school year policy directives. This record remains securely stored offline.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[9px] font-sans">
                            <div className="space-y-1">
                              <div className="border-b border-slate-900/40 dark:border-slate-100/40 pb-1 font-bold text-slate-900 dark:text-white uppercase font-serif tracking-wide">{globalSettings.teacherName}</div>
                              <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Subject Teacher</div>
                            </div>
                            <div className="space-y-1">
                              <div className="border-b border-slate-900/40 dark:border-slate-100/40 pb-1 font-bold text-slate-400 italic">_______________________</div>
                              <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">School Principal / Registrar</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : dashboardTab === 'consolidation' ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {groupedClasses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No active school year folders compiled yet. Create quarterly grading projects to see them auto-consolidated here.
                  </div>
                ) : (
                  groupedClasses.map((group) => {
                    const uniqueStudents = (() => {
                      const sMap = new Map();
                      group.projects.forEach(p => p.students.forEach(st => sMap.set(st.lrn || st.name, true)));
                      return sMap.size;
                    })();

                    const quartersFound = group.projects.map(p => p.quarter);
                    const q1 = quartersFound.some(q => q.toLowerCase().includes('1st'));
                    const q2 = quartersFound.some(q => q.toLowerCase().includes('2nd'));
                    const q3 = quartersFound.some(q => q.toLowerCase().includes('3rd'));
                    const q4 = quartersFound.some(q => q.toLowerCase().includes('4th'));

                    return (
                      <div key={group.key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-850/20 px-2 rounded-xl transition-colors">
                        <div className="space-y-1 max-w-[70%]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {group.subject} • {group.gradeLevel} - {group.section}
                            </span>
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-sm font-mono font-bold uppercase">
                              S.Y. {group.schoolYear}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                            <span>Compiled Learners: <strong className="text-slate-600 dark:text-slate-300 font-black">{uniqueStudents}</strong></span>
                            <span>|</span>
                            <span>Portals: <strong className="text-slate-600 dark:text-slate-300 font-black">{group.projects.length}</strong></span>
                          </div>

                          {/* Quarters Pills row */}
                          <div className="flex gap-1.5 pt-1">
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wide border ${q1 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 text-slate-350 dark:text-slate-600'}`}>Q1</span>
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wide border ${q2 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 text-slate-350 dark:text-slate-600'}`}>Q2</span>
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wide border ${q3 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 text-slate-350 dark:text-slate-600'}`}>Q3</span>
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wide border ${q4 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 text-slate-350 dark:text-slate-600'}`}>Q4</span>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedConsolidatedClass(group.key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-all cursor-pointer shadow-3xs"
                          >
                            <span>Open Consolidated Report</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {workspaceProjects.map((proj) => (
                  <div key={proj.id} className="py-4 flex justify-between items-center hover:bg-slate-50/30 dark:hover:bg-slate-850/20 px-2 rounded-xl transition-colors">
                    <div className="space-y-1 max-w-[65%]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                          {proj.subject} • {proj.gradeLevel} - {proj.section}
                        </span>
                        {proj.isCompleted && (
                          <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm font-mono font-black uppercase border border-emerald-100/40 dark:border-emerald-900/15">
                            Completed
                          </span>
                        )}
                        {proj.isArchived && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm font-mono font-bold uppercase">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed font-semibold">
                        Quarter: {proj.quarter} | S.Y. {proj.schoolYear} | Learners: {proj.students.length}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Updated {new Date(proj.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openProject(proj.id)}
                        className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors"
                        title="Open Workspace"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateProject(proj.id)}
                        className="p-2 bg-slate-50 dark:bg-slate-850 text-slate-650 dark:text-slate-400 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveProject(proj.id, !proj.isArchived)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          proj.isArchived 
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' 
                            : 'bg-slate-50 dark:bg-slate-850 text-slate-650'
                        }`}
                        title={proj.isArchived ? "Restore Project" : "Archive Project"}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          showCustomConfirm(
                            `Are you sure you want to permanently delete the grading project [${proj.subject} - ${proj.section}]? All student roster profiles and registered grade cards will be completely deleted. This action cannot be undone.`,
                            () => deleteProject(proj.id),
                            "Permanently Delete Project"
                          );
                        }}
                        className="p-2 bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-450 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Project Wizard (Col 3) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-8 shadow-3xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-indigo-600" />
              Create Project (Phase 2)
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {workspaceMode === 'SHS' ? 'Subject Name (Manual Entry)' : 'Subject'}
                </label>
                {workspaceMode === 'SHS' ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pre-Calculus, General Chemistry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-semibold"
                  />
                ) : (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectType)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="AP">Araling Panlipunan (AP)</option>
                    <option value="Values Education">Values Education</option>
                    <option value="MAPEH">MAPEH</option>
                    <option value="TLE">TLE</option>
                  </select>
                )}
              </div>

              {/* Assessment Profile (Only for SHS) */}
              {workspaceMode === 'SHS' && (
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Assessment Profile</label>
                  <select
                    value={shsProfileId}
                    onChange={(e) => setShsProfileId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    {SHS_PROFILES.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project Duration & Semester (Only for SHS) */}
              {workspaceMode === 'SHS' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Duration</label>
                    <select
                      value={shsDuration}
                      onChange={(e) => setShsDuration(e.target.value as 'Whole Year' | 'One Semester')}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                    >
                      <option value="Whole Year">Whole Year</option>
                      <option value="One Semester">One Semester</option>
                    </select>
                  </div>
                  {shsDuration === 'One Semester' ? (
                    <div>
                      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Semester</label>
                      <select
                        value={shsSemester}
                        onChange={(e) => setShsSemester(e.target.value as 'Semester 1' | 'Semester 2')}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center pt-5">
                      <span className="text-[10px] text-slate-400 font-bold">All Q1-Q4 active</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Peter"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    {workspaceMode === 'SHS' ? (
                      <>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </>
                    ) : (
                      <>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">School Year</label>
                  <input
                    type="text"
                    required
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                  >
                    {workspaceMode === 'SHS' && shsDuration === 'One Semester' ? (
                      shsSemester === 'Semester 1' ? (
                        <>
                          <option value="1st Quarter">1st Quarter</option>
                          <option value="2nd Quarter">2nd Quarter</option>
                        </>
                      ) : (
                        <>
                          <option value="3rd Quarter">3rd Quarter</option>
                          <option value="4th Quarter">4th Quarter</option>
                        </>
                      )
                    ) : (
                      <>
                        <option value="1st Quarter">1st Quarter</option>
                        <option value="2nd Quarter">2nd Quarter</option>
                        <option value="3rd Quarter">3rd Quarter</option>
                        <option value="4th Quarter">4th Quarter</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Passing Score</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(parseInt(e.target.value) || 75)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-hidden mt-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Transmutation / Grading Policy</label>
                <select
                  value={depedPolicy}
                  onChange={(e) => setDepedPolicy(e.target.value as '2015' | '2027')}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden mt-1.5 font-bold"
                >
                  <option value="2015">0-Based Grading (0=0, 70=70, 100=100)</option>
                  <option value="2027">MATATAG Adjusted Transmutation (SY 2027-2028 onwards)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                Create Project Workspace
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------
          CUSTOM ALERT DIALOG OVERLAY (IFrame-Safe)
          -------------------------------------------------------- */}
      {customAlert && customAlert.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              {customAlert.type === 'success' ? (
                <Sparkles className="h-6 w-6 text-emerald-500 animate-pulse" />
              ) : customAlert.type === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-500 animate-bounce" />
              ) : (
                <HelpCircle className="h-6 w-6 text-indigo-500" />
              )}
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{customAlert.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">{customAlert.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-4xs"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          CUSTOM CONFIRM DIALOG OVERLAY (IFrame-Safe)
          -------------------------------------------------------- */}
      {customConfirm && customConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <AlertCircle className="h-6 w-6 text-indigo-500 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{customConfirm.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{customConfirm.message}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-4xs"
              >
                Yes, Execute
              </button>
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
