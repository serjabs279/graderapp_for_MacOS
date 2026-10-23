import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubjectType, Project, Student } from '../types';
import { computeProjectStudentGrade, transmuteGrade, getSubjectWeightsLabel, getDefaultDepedPolicy, SHS_PROFILES, SHS_OLD_PROFILES } from '../utils';
import { exportConsolidatedGradesPDF } from '../utils/pdfExport';
import { isAndroid } from '../utils/platform';
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
import DangerConfirmModal from './DangerConfirmModal';

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
  const [schoolYear, setSchoolYear] = useState(globalSettings.activeSchoolYear || '2026-2027');
  const [quarter, setQuarter] = useState('1st Quarter');
  const [passingGrade, setPassingGrade] = useState(globalSettings.defaultPassingGrade);
  const [depedPolicy, setDepedPolicy] = useState<'2015' | '2027'>(
    getDefaultDepedPolicy(globalSettings.activeSchoolYear)
  );

  // SHS specific states
  const [shsProfileId, setShsProfileId] = useState('old-core');
  const [shsDuration, setShsDuration] = useState<'Whole Year' | 'One Semester'>('One Semester');
  const [shsSemester, setShsSemester] = useState<'Semester 1' | 'Semester 2'>('Semester 1');
  // Custom weight inputs (only active when shsProfileId === 'custom')
  const [customWW, setCustomWW] = useState(30);
  const [customPT, setCustomPT] = useState(50);
  const [customQA, setCustomQA] = useState(20);
  const customTotal = customWW + customPT + customQA;

  // MATATAG transmutation starts in SY 2027-2028; earlier years use the 0-based table.
  React.useEffect(() => {
    setDepedPolicy(getDefaultDepedPolicy(schoolYear));
  }, [schoolYear]);

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

  const [projectPendingDelete, setProjectPendingDelete] = useState<{
    id: string;
    subject: string;
    gradeLevel: string;
    section: string;
    learnerCount: number;
  } | null>(null);

  const showCustomAlert = (message: string, title = "System Notification", type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({
      isOpen: true,
      title,
      message,
      type
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
    if (workspaceMode === 'SHS' && shsProfileId === 'custom' && customTotal !== 100) {
      showCustomAlert(`Custom weights must total exactly 100%. Currently: ${customTotal}%.`, "Invalid Custom Weights", "error");
      return;
    }

    const isSHS = workspaceMode === 'SHS';
    const newId = createProject({
      schoolName: globalSettings.schoolName,
      schoolYear,
      gradeLevel,
      section: section.trim(),
      subject: subject.trim(),
      teacherName: globalSettings.teacherName,
      passingGrade,
      depedPolicy,
      workspace: workspaceMode,
      semester: isSHS && shsDuration === 'One Semester' ? shsSemester : undefined,
      projectDuration: isSHS ? shsDuration : undefined,
      assessmentProfileId: isSHS ? shsProfileId : undefined,
      customWeights: isSHS && shsProfileId === 'custom' ? { wow: customWW / 100, ppt: customPT / 100, qste: customQA / 100 } : undefined
    });
    setSection('');
    // Auto shift view to Class Manager so the teacher can edit right away
    setActiveRoute('class-manager');
  };

  // --------------------------------------------------------
  // PROJECT OPEN ANALYTICS (Phase 7)
  // --------------------------------------------------------
  if (activeProject) {
    const activeStudents = activeProject.students.filter(s => s.status !== 'Dropped' && s.status !== 'Transferred');
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

    const activeQuarterId = activeProject.lastActiveQuarter || '1st Quarter';
    const activeQuarterData = activeProject.quarters?.[activeQuarterId] || { assessments: [], scores: {} };
    const assessments = activeQuarterData.assessments || [];
    const scores = activeQuarterData.scores || {};

    activeStudents.forEach(st => {
      const g = computeProjectStudentGrade(activeProject, st.id, globalSettings.subjects, activeQuarterId);
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
    const totalAssessments = assessments.length;
    const totalPossibleCells = totalStudents * totalAssessments;
    let filledCellsCount = 0;

    activeStudents.forEach(st => {
      const studentScores = scores[st.id] || {};
      assessments.forEach(ass => {
        if (studentScores[ass.id] !== undefined) {
          filledCellsCount++;
        }
      });
    });

    const completionRate = totalPossibleCells > 0 ? Math.round((filledCellsCount / totalPossibleCells) * 100) : 0;
    const missingScoresCount = Math.max(0, totalPossibleCells - filledCellsCount);

    // Distribution Data for Recharts
    const distributionData = [
      { name: '90-100 (Outstanding)', value: outstanding, color: '#047857' },
      { name: '85-89 (Very Sat.)', value: verySatisfactory, color: '#059669' },
      { name: '80-84 (Satisfactory)', value: satisfactory, color: '#64748b' },
      { name: '75-79 (Fairly Sat.)', value: fairlySatisfactory, color: '#94a3b8' },
      { name: 'Below 75 (Need Interv)', value: didNotMeet, color: '#e11d48' }
    ];

    // Calculate individual assessment statistics
    const assessmentStats = assessments.map(ass => {
      let totalRaw = 0;
      let count = 0;
      activeStudents.forEach(st => {
        const score = scores[st.id]?.[ass.id];
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
      <div className="ui-page pb-12">
        {/* Active Project Banner */}
        <div className="ui-panel min-w-0 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 tabular-nums font-medium px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                Active workspace
              </span>
              <span className="text-sm text-slate-600 tabular-nums">ID: {activeProject.id}</span>
            </div>
            <h2 className="ui-heading text-balance">
              {activeProject.subject} • {activeProject.gradeLevel} - {activeProject.section}
            </h2>
            <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2.5">
              <span>Teacher: {activeProject.teacherName}</span>
              <span>•</span>
              <span>Quarter: {activeQuarterId}</span>
              <span>•</span>
              <span>S.Y. {activeProject.schoolYear}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setActiveRoute('portal-select')}
              className="ui-button flex-1 md:flex-none"
              title="Return to Main Portal Selection Hub"
            >
              <LayoutGrid className="h-4 w-4 text-emerald-500" /> Main Hub
            </button>
            <button
              onClick={() => setActiveRoute('class-manager')}
              className="ui-button-primary flex-1 md:flex-none"
            >
              <BookOpen className="h-4 w-4" /> Open Gradebook
            </button>
            <button
              onClick={() => openProject(null)}
              className="ui-button flex-1 md:flex-none"
            >
              <X className="h-4 w-4" /> Close Project
            </button>
          </div>
        </div>

        {/* Phase 7 Statistics Dashboard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">Learners</span>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{totalStudents}</div>
            <div className="text-sm text-slate-600 font-medium">Active roster</div>
          </div>

          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">Average Grade</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{averageGrade}%</div>
            <div className="text-sm text-slate-600 font-medium">Class mean card score</div>
          </div>

          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">Passing Rate</span>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{passingRate}%</div>
            <div className="text-sm text-slate-500 font-medium">Failing: <span className="text-rose-500">{failingRate}%</span></div>
          </div>

          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">High / Low</span>
              <Award className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {highestGrade} <span className="text-sm text-slate-600 font-medium">/ {lowestGrade}</span>
            </div>
            <div className="text-sm text-slate-600 font-medium">Extreme score bounds</div>
          </div>

          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">Completion</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-600 dark:text-slate-400">{completionRate}%</div>
            <div className="text-sm text-slate-600 font-medium">Grade cell coverage</div>
          </div>

          <div className="ui-panel min-w-0 p-4 space-y-1.5">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-sm tabular-nums font-medium">Missing Marks</span>
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className={`text-2xl font-semibold ${missingScoresCount > 0 ? "text-rose-600 dark:text-rose-500" : 'text-emerald-600'}`}>
              {missingScoresCount}
            </div>
            <div className="text-sm text-slate-600 font-medium">Blank grade records</div>
          </div>
        </div>

        {/* Bento Row: Chart & Assessment performances */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Card */}
          <div className="ui-panel min-w-0 lg:col-span-2 p-6 md:p-8 space-y-4">
            <div className="space-y-1">
              <h3 className="ui-section-title text-balance">
                Learner Grade Distribution
              </h3>
              <p className="text-pretty text-sm text-slate-600 font-medium">Frequency distribution based on official DepEd descriptors.</p>
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
          <div className="ui-panel min-w-0 p-6 md:p-8 space-y-5">
            <h3 className="ui-section-title text-balance">
              Assessment Ratios & Means
            </h3>

            {totalAssessments === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm font-medium">
                No assessments created yet. Add some in Workspace.
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {assessmentStats.map(ass => (
                  <div key={ass.id} className="space-y-1 pb-3 border-b border-slate-50 dark:border-slate-900 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={ass.name}>
                          {ass.name}
                        </div>
                        <div className="text-sm tabular-nums text-slate-600 dark:text-slate-500">
                          Category: <span className="font-medium text-slate-700">{ass.category}</span> | Perfect: {ass.perfectScore}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          Mean: {ass.averageScore}
                        </div>
                        <div className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          {ass.averagePercentage}% score
                        </div>
                      </div>
                    </div>
                    {/* Tiny Progress bar */}
                    <div className="h-1 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ass.category === 'WOW' ? 'bg-emerald-600' : ass.category === 'PPT' ? 'bg-emerald-400' : "bg-slate-500"
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
        <div className="ui-panel flex flex-col items-start justify-between gap-4 p-4 sm:p-6 lg:flex-row lg:items-center">
          <div className="min-w-0 max-w-2xl">
            <h3 className="ui-section-title text-balance">School and grading defaults</h3>
            <p className="ui-description text-pretty">
              Manage school details, teacher information, subject categories, and default passing scores in Settings.
            </p>
          </div>
          <button
            onClick={() => setActiveRoute('settings')}
            className="ui-button w-full shrink-0 sm:w-auto"
          >
            <span>Open Settings</span>
            <ChevronRight className="size-4" />
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

      const q1Proj = activeGroup.projects.find(p => (p.lastActiveQuarter || '').toLowerCase().includes('1st'));
      const q2Proj = activeGroup.projects.find(p => (p.lastActiveQuarter || '').toLowerCase().includes('2nd'));
      const q3Proj = activeGroup.projects.find(p => (p.lastActiveQuarter || '').toLowerCase().includes('3rd'));
      const q4Proj = activeGroup.projects.find(p => (p.lastActiveQuarter || '').toLowerCase().includes('4th'));

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
        const r = computeProjectStudentGrade(proj, s.id, globalSettings.subjects);
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

        const m = list.filter(isM).sort((a, b) => a.name.localeCompare(b.name));
        const f = list.filter(isF).sort((a, b) => a.name.localeCompare(b.name));
        const unspec = list.filter(s => !isM(s) && !isF(s)).sort((a, b) => a.name.localeCompare(b.name));
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
              className="ui-button"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Back to Directory</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Field */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
                <input aria-label="Search learners by name or LRN"
                  type="text"
                  placeholder="Search student..."
                  value={consolidatedSearch}
                  onChange={(e) => setConsolidatedSearch(e.target.value)}
                  className="ui-field pl-9 pr-3"
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
                    await exportConsolidatedGradesPDF(activeGroup, filename);
                  } catch (err) {
                    console.error('Export error:', err);
                  } finally {
                    setIsExportingPDF(false);
                  }
                }}
                className="ui-button"
              >
                <FileDown className="h-4 w-4" />
                <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF (All Pages)'}</span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                onClick={() => {
                  if (isAndroid()) {
                    const filename = `Consolidated_Grades_${activeGroup.gradeLevel}_${activeGroup.section}_${activeGroup.subject}.pdf`.replace(/\s+/g, '_');
                    exportConsolidatedGradesPDF(activeGroup, filename)
                      .catch(err => console.error('Export error:', err));
                    return;
                  }
                  window.print();
                }}
                className="ui-button"
              >
                <Printer className="h-4 w-4" />
                <span>{isAndroid() ? 'Print (PDF)' : 'Print Document'}</span>
              </button>

              {/* Exit Print Mode Toggle */}
              <button
                type="button"
                onClick={() => setPrintFriendly(false)}
                className="ui-button"
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
                  <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Graded Population</span>
                    <strong className="text-sm font-black text-slate-850">{gradedCount} <span className="text-[9px] text-slate-450 font-semibold font-sans">/ {fullRoster.all.length} total</span></strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Class General Mean</span>
                    <strong className="text-sm font-black text-indigo-650 font-mono">{meanFinalGrade}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Passing Rate</span>
                    <strong className="text-sm font-black text-emerald-650 font-mono">{passingRate}%</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
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
    <div className="ui-page pb-12">
      {/* Welcome Banner */}
      <div className="ui-panel min-w-0 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-400 tabular-nums font-medium px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-900/30">
              Grading hub
            </span>
            <span className="text-sm text-slate-600 tabular-nums">Offline-First</span>
          </div>
          <h2 className="ui-heading text-balance">
            {workspaceMode === 'SHS' ? 'Senior High School (SHS) Gradebook' : 'Junior High School (JHS) Gradebook'}
          </h2>
          <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold">
            {workspaceMode === 'SHS'
              ? 'Manually configure subjects, choose specific assessment profiles (1-6) with defined DepEd weights, and group by Semester or Whole Year.'
              : 'Create JHS grading projects, import class lists, build assessment rubrics, and run computations offline.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setActiveRoute('portal-select')}
            className="ui-button"
            title="Return to Main Portal Selection Hub"
          >
            <LayoutGrid className="h-4 w-4 text-emerald-400" />
            <span>Main Hub</span>
          </button>

          <div className="flex gap-3 text-center">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl min-w-[80px]">
              <div className="text-sm text-slate-600 tabular-nums font-medium">Active</div>
              <div className="text-lg font-semibold text-slate-600 dark:text-slate-400">{activeCount}</div>
            </div>
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl min-w-[80px]">
              <div className="text-sm text-slate-600 tabular-nums font-medium">Archived</div>
              <div className="text-lg font-semibold text-slate-500">{archivedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects List (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4">
            {/* Directory Header with Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-slate-600 shrink-0" />
                <h3 className="ui-section-title text-balance">
                  {selectedConsolidatedClass ? 'Annual Report Card View' : dashboardTab === 'quarters' ? 'Grading Projects Directory' : 'Consolidated Annual Directory'}
                </h3>
              </div>

              {!selectedConsolidatedClass && (
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setDashboardTab('quarters'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${dashboardTab === 'quarters'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                  >
                    Independent Quarters
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDashboardTab('consolidation'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${dashboardTab === 'consolidation'
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white "
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setSelectedConsolidatedClass(null); setPrintFriendly(false); }}
                    className="ui-button self-start"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                    <span>Back to Directory</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
                      <input aria-label="Search learners by name or LRN"
                        type="text"
                        placeholder="Search student..."
                        value={consolidatedSearch}
                        onChange={(e) => setConsolidatedSearch(e.target.value)}
                        className="ui-field pl-9 pr-3"
                      />
                    </div>

                    {/* Print Preview Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setPrintFriendly(!printFriendly)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer border w-full sm:w-auto ${printFriendly
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }`}
                    >
                      <Printer className="h-4 w-4" />
                      <span>{printFriendly ? 'Exit Print Mode' : 'Toggle Print Sheet'}</span>
                    </button>
                  </div>
                </div>

                {/* Print Banner notification */}
                {printFriendly && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm rounded-xl flex items-center gap-2.5 font-medium">
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

                  const q1Proj = activeGroup.projects.find(p => p.quarters?.['1st Quarter'] !== undefined);
                  const q2Proj = activeGroup.projects.find(p => p.quarters?.['2nd Quarter'] !== undefined);
                  const q3Proj = activeGroup.projects.find(p => p.quarters?.['3rd Quarter'] !== undefined);
                  const q4Proj = activeGroup.projects.find(p => p.quarters?.['4th Quarter'] !== undefined);

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
                  const getStudentQuarterGrade = (proj: Project, lrn: string, name: string, qId: string) => {
                    const normName = name.trim().toUpperCase();
                    const s = proj.students.find(x =>
                      (lrn && lrn !== '123456789123' && x.lrn === lrn) ||
                      x.name.trim().toUpperCase() === normName
                    );
                    if (!s) return null;
                    const r = computeProjectStudentGrade(proj, s.id, globalSettings.subjects, qId);
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

                    const m = list.filter(isM).sort((a, b) => a.name.localeCompare(b.name));
                    const f = list.filter(isF).sort((a, b) => a.name.localeCompare(b.name));
                    const unspec = list.filter(s => !isM(s) && !isF(s)).sort((a, b) => a.name.localeCompare(b.name));
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
                    const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name, '1st Quarter') : null;
                    const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name, '2nd Quarter') : null;
                    const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name, '3rd Quarter') : null;
                    const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name, '4th Quarter') : null;

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
                                  const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name, '1st Quarter') : null;
                                  const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name, '2nd Quarter') : null;
                                  const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name, '3rd Quarter') : null;
                                  const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name, '4th Quarter') : null;

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
                                  const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name, '1st Quarter') : null;
                                  const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name, '2nd Quarter') : null;
                                  const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name, '3rd Quarter') : null;
                                  const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name, '4th Quarter') : null;

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
                                    const q1 = showQ1 && q1Proj ? getStudentQuarterGrade(q1Proj, st.lrn, st.name, '1st Quarter') : null;
                                    const q2 = showQ2 && q2Proj ? getStudentQuarterGrade(q2Proj, st.lrn, st.name, '2nd Quarter') : null;
                                    const q3 = showQ3 && q3Proj ? getStudentQuarterGrade(q3Proj, st.lrn, st.name, '3rd Quarter') : null;
                                    const q4 = showQ4 && q4Proj ? getStudentQuarterGrade(q4Proj, st.lrn, st.name, '4th Quarter') : null;

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
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Graded Population</span>
                              <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{gradedCount} <span className="text-[9px] text-slate-450 font-semibold font-sans">/ {fullRoster.all.length} total</span></strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Class General Mean</span>
                              <strong className="text-sm font-black text-indigo-650 dark:text-indigo-400 font-mono">{meanFinalGrade}</strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-850 rounded-lg">
                              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Passing Rate</span>
                              <strong className="text-sm font-black text-emerald-655 dark:text-emerald-400 font-mono">{passingRate}%</strong>
                            </div>
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-850 rounded-lg">
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
                              <div className={`border-b border-slate-900/40 dark:border-slate-100/40 pb-1 font-bold uppercase font-serif tracking-wide ${globalSettings.principalName ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'}`}>
                                {globalSettings.principalName?.trim() || '_______________________'}
                              </div>
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
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {groupedClasses.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-sm font-semibold">
                    No active school year folders compiled yet. Create quarterly grading projects to see them auto-consolidated here.
                  </div>
                ) : (
                  groupedClasses.map((group) => {
                    const uniqueStudents = (() => {
                      const sMap = new Set<string>();
                      group.projects.forEach(p => p.students
                        .filter(st => st.status !== 'Dropped' && st.status !== 'Transferred')
                        .forEach(st => {
                          const lrn = (st.lrn || '').trim();
                          const validLrn = lrn.length === 12 && lrn !== '123456789123';
                          sMap.add(validLrn ? `LRN:${lrn}` : `NAME:${st.name.trim().toUpperCase()}`);
                        }));
                      return sMap.size;
                    })();

                    const q1 = group.projects.some(p => p.quarters?.['1st Quarter'] !== undefined);
                    const q2 = group.projects.some(p => p.quarters?.['2nd Quarter'] !== undefined);
                    const q3 = group.projects.some(p => p.quarters?.['3rd Quarter'] !== undefined);
                    const q4 = group.projects.some(p => p.quarters?.['4th Quarter'] !== undefined);

                    return (
                      <div key={group.key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-900/20 px-2 rounded-xl transition-colors">
                        <div className="space-y-1 max-w-[70%]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {group.subject} • {group.gradeLevel} - {group.section}
                            </span>
                            <span className="text-sm bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-sm tabular-nums font-medium">
                              S.Y. {group.schoolYear}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-500 font-semibold">
                            <span>Compiled Learners: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{uniqueStudents}</strong></span>
                            <span>|</span>
                            <span>Portals: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{group.projects.length}</strong></span>
                          </div>

                          {/* Quarters Pills row */}
                          <div className="flex gap-1.5 pt-1">
                            <span className={`text-sm tabular-nums font-medium px-1.5 py-0.5 rounded-xs border ${q1 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-500" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-600"}`}>Q1</span>
                            <span className={`text-sm tabular-nums font-medium px-1.5 py-0.5 rounded-xs border ${q2 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-500" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-600"}`}>Q2</span>
                            <span className={`text-sm tabular-nums font-medium px-1.5 py-0.5 rounded-xs border ${q3 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-500" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-600"}`}>Q3</span>
                            <span className={`text-sm tabular-nums font-medium px-1.5 py-0.5 rounded-xs border ${q4 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-500" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-600"}`}>Q4</span>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedConsolidatedClass(group.key)}
                            className="ui-button"
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
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {workspaceProjects.map((proj) => (
                  <div key={proj.id} className="py-4 flex justify-between items-center hover:bg-slate-50/30 dark:hover:bg-slate-900/20 px-2 rounded-xl transition-colors">
                    <div className="space-y-1 max-w-[65%]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {proj.subject} • {proj.gradeLevel} - {proj.section}
                        </span>
                        {proj.isCompleted && (
                          <span className="text-sm bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm tabular-nums font-semibold border border-emerald-100/40 dark:border-emerald-900/15">
                            Completed
                          </span>
                        )}
                        {proj.isArchived && (
                          <span className="text-sm bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm tabular-nums font-medium">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-600 leading-relaxed font-semibold">
                        Quarter: {proj.lastActiveQuarter || '1st Quarter'} | S.Y. {proj.schoolYear} | Learners: {proj.students.length}
                      </div>
                      <div className="text-sm tabular-nums text-slate-600 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Updated {new Date(proj.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button aria-label="Open Workspace"
                        type="button"
                        onClick={() => openProject(proj.id)}
                        className="ui-icon-button"
                        title="Open Workspace"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button aria-label="Duplicate Project"
                        type="button"
                        onClick={() => duplicateProject(proj.id)}
                        className="ui-icon-button"
                        title="Duplicate Project"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveProject(proj.id, !proj.isArchived)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${proj.isArchived
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                            : "bg-slate-50 dark:bg-slate-900 text-slate-700"
                          }`}
                        title={proj.isArchived ? "Restore Project" : "Archive Project"}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button aria-label="Delete Project"
                        type="button"
                        onClick={() => setProjectPendingDelete({
                          id: proj.id,
                          subject: proj.subject,
                          gradeLevel: proj.gradeLevel,
                          section: proj.section,
                          learnerCount: proj.students.length
                        })}
                        className="ui-icon-button"
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
          <div className="ui-panel min-w-0 p-6 md:p-8 space-y-4">
            <h3 className="ui-section-title text-balance flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-slate-600" />
              Create gradebook
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">
                  {workspaceMode === 'SHS' ? 'Subject Name (Manual Entry)' : 'Subject'}
                </label>
                {workspaceMode === 'SHS' ? (
                  <input aria-label="Subject"
                    type="text"
                    required
                    placeholder="e.g. Pre-Calculus, General Chemistry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="ui-field mt-1.5"
                  />
                ) : (
                  <select aria-label="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectType)}
                    className="ui-field mt-1.5"
                  >
                    <option value="English">English</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="AP">Araling Panlipunan (AP)</option>
                    <option value="Values Education">Values Education</option>
                    <option value="Music & Arts">Music & Arts</option>
                    <option value="PE & Health">PE & Health</option>
                    <option value="TLE">TLE</option>
                  </select>
                )}
              </div>

              {/* Assessment Profile (Only for SHS) */}
              {workspaceMode === 'SHS' && (
                <div className="space-y-2">
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Assessment Profile</label>
                  <select aria-label="Assessment profile"
                    value={shsProfileId}
                    onChange={(e) => setShsProfileId(e.target.value)}
                    className="ui-field mt-1.5"
                  >
                    <optgroup label="—— DepEd Order No. 8, s. 2015 (Old Curriculum) ——">
                      {SHS_OLD_PROFILES.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="—— MATATAG Profiles ——">
                      {SHS_PROFILES.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="—— Custom ——">
                      <option value="custom">Custom (Manual Weights %)</option>
                    </optgroup>
                  </select>

                  {/* Custom weight inputs (visible only when 'custom' is selected) */}
                  {shsProfileId === 'custom' && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 space-y-2">
                      <div className="text-sm tabular-nums font-semibold text-amber-700 dark:text-amber-400">Manual Weight Entry (must total 100%)</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">WW %</label>
                          <input aria-label="Written works weight (%)" type="number" min={0} max={100} value={customWW}
                            onChange={e => setCustomWW(parseInt(e.target.value) || 0)}
                            className="ui-field text-center"
                          />
                        </div>
                        <div>
                          <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">PT %</label>
                          <input aria-label="Performance tasks weight (%)" type="number" min={0} max={100} value={customPT}
                            onChange={e => setCustomPT(parseInt(e.target.value) || 0)}
                            className="ui-field text-center"
                          />
                        </div>
                        <div>
                          <label className="ui-label tabular-nums text-slate-500 dark:text-slate-400 block mb-1">QA %</label>
                          <input aria-label="Quarterly assessment weight (%)" type="number" min={0} max={100} value={customQA}
                            onChange={e => setCustomQA(parseInt(e.target.value) || 0)}
                            className="ui-field text-center"
                          />
                        </div>
                      </div>
                      <div className={`text-sm tabular-nums font-semibold text-center py-1 rounded-lg ${customTotal === 100 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/20'}`}>
                        Total: {customTotal}% {customTotal === 100 ? '✓ Valid' : `— Need ${100 - customTotal > 0 ? '+' : ''}${100 - customTotal}% to reach 100%`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Duration & Semester (Only for SHS) */}
              {workspaceMode === 'SHS' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Duration</label>
                    <select aria-label="Project duration"
                      value={shsDuration}
                      onChange={(e) => setShsDuration(e.target.value as 'Whole Year' | 'One Semester')}
                      className="ui-field mt-1.5"
                    >
                      <option value="Whole Year">Whole Year</option>
                      <option value="One Semester">One Semester</option>
                    </select>
                  </div>
                  {shsDuration === 'One Semester' ? (
                    <div>
                      <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Semester</label>
                      <select aria-label="Semester"
                        value={shsSemester}
                        onChange={(e) => setShsSemester(e.target.value as 'Semester 1' | 'Semester 2')}
                        className="ui-field mt-1.5"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center pt-5">
                      <span className="text-sm text-slate-600 font-medium">All Q1-Q4 active</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Section Name</label>
                <input aria-label="Section name"
                  type="text"
                  required
                  placeholder="e.g. St. Peter"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="ui-field mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Grade Level</label>
                  <select aria-label="Grade level"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="ui-field mt-1.5"
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
                  <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">School Year</label>
                  <input aria-label="School year"
                    type="text"
                    required
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="ui-field mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Passing Score</label>
                <input aria-label="Passing grade"
                  type="number"
                  min={60}
                  max={100}
                  value={passingGrade}
                  onChange={(e) => setPassingGrade(parseInt(e.target.value) || 75)}
                  className="ui-field mt-1.5"
                />
              </div>

              <div>
                <label className="ui-label tabular-nums text-slate-600 dark:text-slate-500">Transmutation / Grading Policy</label>
                <select aria-label="Grading policy"
                  value={depedPolicy}
                  onChange={(e) => setDepedPolicy(e.target.value as '2015' | '2027')}
                  className="ui-field mt-1.5"
                >
                  <option value="2015">0-Based Grading (0=0, 70=70, 100=100)</option>
                  <option value="2027">MATATAG Adjusted Transmutation (SY 2027-2028 onwards)</option>
                </select>
              </div>

              <button
                type="submit"
                className="ui-button-primary w-full"
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
        <div className="ui-dialog-overlay">
          <div role="dialog" aria-modal="true" aria-label="Notification" className="ui-dialog max-w-sm block overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-900">
              {customAlert.type === 'success' ? (
                <Sparkles className="h-6 w-6 text-emerald-500" />
              ) : customAlert.type === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-500" />
              ) : (
                <HelpCircle className="h-6 w-6 text-slate-500" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="ui-section-title text-balance">{customAlert.title}</h3>
              <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-line">{customAlert.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="ui-button w-full"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          TYPED CONFIRMATION FOR PERMANENT PROJECT DELETION
          -------------------------------------------------------- */}
      <DangerConfirmModal
        isOpen={projectPendingDelete !== null}
        title="Permanently Delete Project"
        confirmLabel="Delete Project"
        onClose={() => setProjectPendingDelete(null)}
        onConfirm={() => {
          if (!projectPendingDelete) return;
          deleteProject(projectPendingDelete.id);
          setProjectPendingDelete(null);
        }}
      >
        {projectPendingDelete && (
          <>
            You are about to permanently delete the grading project{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {projectPendingDelete.subject} • {projectPendingDelete.gradeLevel} - {projectPendingDelete.section}
            </span>
            . All {projectPendingDelete.learnerCount} student roster profile(s), attendance records, and registered grade cards in this project will be erased. Other projects are not affected.
          </>
        )}
      </DangerConfirmModal>
    </div>
  );
}
