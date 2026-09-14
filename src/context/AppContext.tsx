import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, GlobalSettings, Student, Assessment, SubjectType, QuarterData, AdviserClass, OverrideLogEntry, ImportedSubjectGrades, LearnerObservedValues, StudentAttendance, ObservedValueRating, ArchiveFile, ArchiveValidationResult, ARCHIVE_VERSION, APP_VERSION } from '../types';
import { DEFAULT_GLOBAL_SETTINGS, SEED_PROJECTS } from '../data/seedData';
import { SHS_PROFILES } from '../utils';
import { getCalendar, getProjectPeriods, getFirstPeriod } from '../calendar/academicCalendar';
import { persistLoad, persistSave, bootstrapAppDataBackup } from '../utils/tauriPersistence';

interface AppContextType {
  projects: Project[];
  activeProjectId: string | null;
  globalSettings: GlobalSettings;
  darkMode: boolean;
  activeRoute: 'dashboard' | 'class-manager' | 'settings' | 'about' | 'adviser';
  workspaceMode: 'JHS' | 'SHS';
  setWorkspaceMode: (mode: 'JHS' | 'SHS') => void;
  
  // Sidebar Collapsing
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Authentication
  isLoggedIn: boolean;
  authUsername: string;
  authPassword: string;
  login: (username: string, password: string) => boolean;
  bypassLogin: (superuserPassword: string) => boolean;
  logout: () => void;
  updateCredentials: (username: string, password: string) => void;
  
  // Project operations
  createProject: (meta: Omit<Project, 'id' | 'students' | 'quarters' | 'lastActiveQuarter' | 'createdAt' | 'updatedAt'>) => string;
  openProject: (id: string | null) => void;
  saveProject: (project: Project) => void;
  duplicateProject: (id: string) => void;
  archiveProject: (id: string, archive: boolean) => void;
  toggleProjectCompleted: (id: string, completed: boolean) => void;
  deleteProject: (id: string) => void;
  updateActiveProjectQuarter: (quarterId: string) => void;
  migrateQuarterData: (sourceQuarter: string, targetQuarter: string, clearSource?: boolean) => boolean;
  
  // Roster / Student operations within active project
  addStudentToActive: (student: Omit<Student, 'id'>) => void;
  updateStudentInActive: (student: Student) => void;
  deleteStudentFromActive: (studentId: string) => void;
  importRosterToActive: (students: Omit<Student, 'id'>[], replaceExisting?: boolean) => void;
  syncRosterToSectionGroup: (schoolYear: string, gradeLevel: string, section: string, sourceStudents: Student[]) => void;
  
  // Assessment operations within active project
  addAssessmentToActive: (quarterId: string, assessment: Omit<Assessment, 'id' | 'order'>) => void;
  updateAssessmentInActive: (quarterId: string, assessment: Assessment) => void;
  deleteAssessmentFromActive: (quarterId: string, assessmentId: string) => void;
  reorderAssessmentsInActive: (quarterId: string, assessments: Assessment[]) => void;
  
  // Gradebook cell updates
  updateScoreInActive: (quarterId: string, studentId: string, assessmentId: string, score: number) => void;
  clearScoreInActive: (quarterId: string, studentId: string, assessmentId: string) => void;
  updateReassessmentScoreInActive: (quarterId: string, studentId: string, assessmentId: string, score: number) => void;
  clearReassessmentScoreInActive: (quarterId: string, studentId: string, assessmentId: string) => void;
  toggleReassessmentForAssessment: (quarterId: string, assessmentId: string, enabled: boolean) => void;
  updateReassessmentSettingsInActive: (settings: { enabled: boolean; masteryThreshold: number; interventionThreshold: number; policy: 'Average' | 'Highest' | 'Replacement' }) => void;
  enableReassessmentModeForQuarter: (quarterId: string, settings: { enabled: boolean; masteryThreshold: number; interventionThreshold: number; policy: 'Average' | 'Highest' | 'Replacement' }) => void;

  // Grade Adjustment Feature in Active Project
  toggleGradeAdjustmentMode: (quarterId: string, enabled: boolean) => void;
  setGradeAdjustmentForStudent: (quarterId: string, studentId: string, entry: import('../types').GradeAdjustmentEntry) => void;
  removeGradeAdjustmentForStudent: (quarterId: string, studentId: string) => void;
  updateProjectTeacherInfo: (
    projectIdOrInfo: string | { teacherName?: string; schoolName?: string; passingGrade?: number; section?: string; gradeLevel?: string; subject?: string; depedPolicy?: '2015' | '2027'; customWeights?: { wow: number; ppt: number; qste: number } },
    info?: { teacherName?: string; schoolName?: string; passingGrade?: number; section?: string; gradeLevel?: string; subject?: string; depedPolicy?: '2015' | '2027'; customWeights?: { wow: number; ppt: number; qste: number } }
  ) => void;

  // Settings & Db Operations
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  toggleDarkMode: () => void;
  setActiveRoute: (route: 'dashboard' | 'class-manager' | 'settings' | 'about' | 'adviser') => void;
  resetDatabase: () => void;
  backupData: () => string;
  restoreData: (json: string) => boolean;
  restoreArchive: (archive: ArchiveFile) => boolean;
  rolloverAcademicYear: (newYear: string, calendarType: 'Quarter' | 'Trimester') => boolean;
  // Adviser Portal
  adviserClasses: AdviserClass[];
  saveAdviserClass: (cls: AdviserClass) => void;
  updateAdviserClass: (classId: string, updater: (cls: AdviserClass) => AdviserClass) => void;
  deleteAdviserClass: (id: string) => void;
  setActiveAdviserClass: (id: string | null) => void;
  importSubjectGrades: (classId: string, payload: ImportedSubjectGrades) => void;
  replaceSubjectGrades: (classId: string, subjectUID: string, quarterKey: string, payload: ImportedSubjectGrades) => void;
  lockSubjectGrades: (classId: string, subjectUID: string, quarterKey: string, lock: boolean) => void;
  setManualPromotionStatus: (classId: string, lrn: string, status: 'Promoted' | 'Retained' | null) => void;
  setObservedValue: (classId: string, lrn: string, quarter: string, field: 'responsible' | 'obedient' | 'compassionate' | 'kind' | 'serviceOriented', rating: ObservedValueRating) => void;
  setAttendance: (classId: string, lrn: string, month: string, daysAbsent: number) => void;
  addOverrideLogEntry: (classId: string, entry: Omit<OverrideLogEntry, 'id' | 'timestamp'>) => void;
  overrideStudentGrade: (classId: string, subjectUID: string, quarterKey: string, lrn: string, newGrade: number, reason: string, componentSubjectName?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<'dashboard' | 'class-manager' | 'settings' | 'about' | 'adviser'>('dashboard');
  const [workspaceMode, setWorkspaceModeState] = useState<'JHS' | 'SHS'>('JHS');
  const [adviserClasses, setAdviserClasses] = useState<AdviserClass[]>([]);

  // Sidebar collapsing state
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authUsername, setAuthUsername] = useState<string>('admin');
  const [authPassword, setAuthPassword] = useState<string>('admin123');

  // Load from local storage (with AppData fallback for Tauri reinstall safety)
  useEffect(() => {
    const initAsync = async () => {
      // ── Simple keys (localStorage only, no big data) ─────────────────
      const localActiveId  = localStorage.getItem('srphs_active_id_p2');
      const localDarkMode  = localStorage.getItem('srphs_dark_mode');
      const localWorkspace = localStorage.getItem('srphs_workspace_mode');
      const localSidebar   = localStorage.getItem('srphs_sidebar_collapsed');
      const localLoggedIn  = localStorage.getItem('srphs_logged_in');
      const localUsername  = localStorage.getItem('srphs_auth_username');
      const localPassword  = localStorage.getItem('srphs_auth_password');

      if (localSidebar)  setSidebarCollapsedState(JSON.parse(localSidebar));
      if (localLoggedIn) setIsLoggedIn(JSON.parse(localLoggedIn));
      if (localUsername) setAuthUsername(localUsername);
      if (localPassword) setAuthPassword(localPassword);

      // ── Projects: try localStorage → AppData backup → seeds ──────────
      const localProjects = await persistLoad('srphs_projects_p2');
      if (localProjects) {
        try {
          const parsed = JSON.parse(localProjects) as Project[];
          let migratedAny = false;
          const migrated = parsed.map(p => {
            // Migration 1: quarters schema
            if (!p.quarters) {
              migratedAny = true;
              const oldQuarter = (p as any).quarter || getFirstPeriod();
              const quarters: Record<string, QuarterData> = {};
              const qs = getProjectPeriods(p, 'Quarter');
              qs.forEach(q => { quarters[q] = { assessments: [], scores: {} }; });
              quarters[oldQuarter] = {
                assessments: (p as any).assessments || [],
                scores: (p as any).scores || {}
              };
              p = { ...p, quarters, lastActiveQuarter: oldQuarter };
            }
            // Migration 2: subjectUID
            if (!p.subjectUID) {
              migratedAny = true;
              const year = new Date(p.createdAt || Date.now()).getFullYear();
              const cleanGrade = (p.gradeLevel || '0').replace(/\D/g, '') || '0';
              const subjPrefix = (p.subject || 'SUB').substring(0, 3).toUpperCase();
              const randomNum = Math.floor(10000 + Math.random() * 90000);
              p = { ...p, subjectUID: `${cleanGrade}_${subjPrefix}_${randomNum}_${year}` };
            }
            return p;
          });
          setProjects(migrated);
          if (migratedAny) {
            await persistSave('srphs_projects_p2', JSON.stringify(migrated));
          }
        } catch (e) {
          console.error('Failed to parse or migrate local projects', e);
          // Parse error on existing data — keep empty rather than overwriting with seeds
          setProjects([]);
        }
      } else {
        // Genuine first install: no data anywhere → load seeds
        setProjects(SEED_PROJECTS);
        await persistSave('srphs_projects_p2', JSON.stringify(SEED_PROJECTS));
      }

      // ── Settings: try localStorage → AppData backup → defaults ───────
      const localSettings = await persistLoad('srphs_settings_p2');
      if (localSettings) {
        setGlobalSettings(JSON.parse(localSettings));
      } else {
        setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
        await persistSave('srphs_settings_p2', JSON.stringify(DEFAULT_GLOBAL_SETTINGS));
      }

      if (localDarkMode) {
        setDarkMode(JSON.parse(localDarkMode));
      }

      if (localWorkspace === 'SHS') {
        setWorkspaceModeState('SHS');
      } else {
        setWorkspaceModeState('JHS');
      }

      // ── Adviser classes: try localStorage → AppData backup ────────────
      const localAdviserClasses = await persistLoad('srphs_adviser_classes');
      if (localAdviserClasses) {
        try {
          const parsed = JSON.parse(localAdviserClasses) as AdviserClass[];
          const migrated = parsed.map(cls => {
            if (cls.workspace === 'JHS' && (!cls.languageGroups || !cls.languageGroups.some(g => g.label === 'MAPEH'))) {
              return {
                ...cls,
                languageGroups: [
                  ...(cls.languageGroups || []),
                  { label: 'MAPEH', subjects: ['Music & Arts', 'PE & Health'] }
                ]
              };
            }
            return cls;
          });
          setAdviserClasses(migrated);
        } catch {}
      }

      // ── One-time: create AppData backups for existing users upgrading ─
      bootstrapAppDataBackup();
    };

    initAsync();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('srphs_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('srphs_sidebar_collapsed', JSON.stringify(collapsed));
  };

  const login = (username: string, password: string): boolean => {
    if (username.trim().toLowerCase() === authUsername.toLowerCase() && password === authPassword) {
      setIsLoggedIn(true);
      localStorage.setItem('srphs_logged_in', 'true');
      return true;
    }
    return false;
  };

  const bypassLogin = (superuserPassword: string): boolean => {
    if (superuserPassword === 'SRPHS_SUPER_BYPASS_2026') {
      setIsLoggedIn(true);
      localStorage.setItem('srphs_logged_in', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('srphs_logged_in');
  };

  const updateCredentials = (username: string, password: string) => {
    setAuthUsername(username);
    setAuthPassword(password);
    localStorage.setItem('srphs_auth_username', username);
    localStorage.setItem('srphs_auth_password', password);
  };

  const setWorkspaceMode = (mode: 'JHS' | 'SHS') => {
    setWorkspaceModeState(mode);
    localStorage.setItem('srphs_workspace_mode', mode);
    // Switch workspace and clear active project to avoid cross-contamination
    setActiveProjectId(null);
    localStorage.removeItem('srphs_active_id_p2');
  };

  const saveProjectsToStorage = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    const serialized = JSON.stringify(updatedProjects);
    localStorage.setItem('srphs_projects_p2', serialized);
    // Fire-and-forget: also backup to AppData so reinstalls can't lose data
    persistSave('srphs_projects_p2', serialized);
  };

  const syncRosterToSectionGroup = (schoolYear: string, gradeLevel: string, section: string, sourceStudents: Student[]) => {
    const normGl = gradeLevel.trim().toLowerCase();
    const normSec = section.trim().toLowerCase();
    
    const updated = projects.map(p => {
      const matchSy = p.schoolYear === schoolYear;
      const matchGl = p.gradeLevel.trim().toLowerCase() === normGl;
      const matchSec = p.section.trim().toLowerCase() === normSec;

      if (matchSy && matchGl && matchSec) {
        const syncedStudents = sourceStudents.map((s, idx) => ({
          ...s,
          id: s.id || `student-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
        }));
        return {
          ...p,
          students: syncedStudents,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    saveProjectsToStorage(updated);
  };

  const createProject = (meta: Omit<Project, 'id' | 'students' | 'quarters' | 'lastActiveQuarter' | 'createdAt' | 'updatedAt'>) => {
    const newId = `project-${Date.now()}`;
    const year = new Date().getFullYear();
    
    // Offline-safe Subject UID: [gradelevel]_[3letters]_[random]_[year]
    const cleanGrade = meta.gradeLevel.replace(/\D/g, '') || '0';
    const subjPrefix = (meta.subject || 'SUB').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const subjectUID = `${cleanGrade}_${subjPrefix}_${randomNum}_${year}`;

    // Check if it's SHS and what the profile is
    const isSHS = meta.workspace === 'SHS';
    let hasExam = true;
    if (isSHS && meta.assessmentProfileId) {
      const profile = SHS_PROFILES.find(p => p.id === meta.assessmentProfileId);
      if (profile && profile.qste === 0) {
        hasExam = false;
      }
    }

    const defaultAssessments: Assessment[] = [
      { id: `as-${Date.now()}-ww1`, name: "Written/Oral Work 1", category: "WOW", perfectScore: 20, order: 0, date: new Date().toISOString().split('T')[0], description: "Initial assessment" },
      { id: `as-${Date.now()}-pt1`, name: "Performance/ Product tasks 1", category: "PPT", perfectScore: 50, order: 1, date: new Date().toISOString().split('T')[0], description: "Initial Performance/ Product tasks" }
    ];

    if (hasExam) {
      defaultAssessments.push({ 
        id: `as-${Date.now()}-qe`, 
        name: "Quarterly/Term Exams", 
        category: "QSTE", 
        perfectScore: 50, 
        order: 2, 
        date: new Date().toISOString().split('T')[0], 
        description: "Periodical assessment" 
      });
    }

    // Auto-inherit roster from existing project in same schoolYear, grade level & section if available
    const existingSameSection = projects.find(p => 
      p.schoolYear === meta.schoolYear &&
      p.gradeLevel.trim().toLowerCase() === meta.gradeLevel.trim().toLowerCase() &&
      p.section.trim().toLowerCase() === meta.section.trim().toLowerCase() &&
      p.students && p.students.length > 0
    );

    const inheritedStudents = existingSameSection
      ? existingSameSection.students.map((s, idx) => ({ ...s, id: `student-${Date.now()}-${idx}` }))
      : [];
      
    const periods = getProjectPeriods(meta, globalSettings.calendarType);
    const initialQuarters: Record<string, { assessments: Assessment[], scores: any }> = {};
    
    periods.forEach((p, idx) => {
      initialQuarters[p] = { 
        assessments: idx === 0 ? JSON.parse(JSON.stringify(defaultAssessments)) : [], 
        scores: {} 
      };
    });

    const newProject: Project = {
      ...meta,
      id: newId,
      subjectUID,
      students: inheritedStudents,
      quarters: initialQuarters,
      lastActiveQuarter: periods.length > 0 ? periods[0] : getFirstPeriod(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newProject, ...projects];
    saveProjectsToStorage(updated);
    setActiveProjectId(newId);
    localStorage.setItem('srphs_active_id_p2', newId);
    return newId;
  };

  const openProject = (id: string | null) => {
    setActiveProjectId(id);
    if (id) {
      localStorage.setItem('srphs_active_id_p2', id);
    } else {
      localStorage.removeItem('srphs_active_id_p2');
    }
  };

  const saveProject = (project: Project) => {
    const updated = projects.map(p => p.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : p);
    saveProjectsToStorage(updated);
  };

  const duplicateProject = (id: string) => {
    const src = projects.find(p => p.id === id);
    if (!src) return;
    const dup: Project = {
      ...src,
      id: `project-${Date.now()}`,
      gradeLevel: `${src.gradeLevel} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [dup, ...projects];
    saveProjectsToStorage(updated);
  };

  const archiveProject = (id: string, archive: boolean) => {
    const updated = projects.map(p => p.id === id ? { ...p, isArchived: archive, updatedAt: new Date().toISOString() } : p);
    saveProjectsToStorage(updated);
  };

  const toggleProjectCompleted = (id: string, completed: boolean) => {
    const updated = projects.map(p => p.id === id ? { ...p, isCompleted: completed, updatedAt: new Date().toISOString() } : p);
    saveProjectsToStorage(updated);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjectsToStorage(updated);
    if (activeProjectId === id) {
      openProject(null);
    }
  };

  // Helper to fetch active project
  const getActiveProject = (): Project | undefined => {
    return projects.find(p => p.id === activeProjectId);
  };

  const updateActiveProject = (updatedProj: Project) => {
    saveProject(updatedProj);
  };
  
  const updateActiveProjectQuarter = (quarterId: string) => {
    const active = getActiveProject();
    if (!active) return;
    const updatedProj: Project = {
      ...active,
      lastActiveQuarter: quarterId
    };
    updateActiveProject(updatedProj);
  };

  // Student Manager functions
  const addStudentToActive = (studentData: Omit<Student, 'id'>) => {
    const active = getActiveProject();
    if (!active) return;
    const newStudent: Student = {
      ...studentData,
      id: `student-${Date.now()}`
    };
    const updatedProj: Project = {
      ...active,
      students: [...active.students, newStudent]
    };
    updateActiveProject(updatedProj);
  };

  const updateStudentInActive = (student: Student) => {
    const active = getActiveProject();
    if (!active) return;
    const updatedProj: Project = {
      ...active,
      students: active.students.map(s => s.id === student.id ? student : s)
    };
    updateActiveProject(updatedProj);
  };

  const deleteStudentFromActive = (studentId: string) => {
    const active = getActiveProject();
    if (!active) return;
    
    const newQuarters = { ...active.quarters };
    Object.keys(newQuarters).forEach(q => {
      const qData = newQuarters[q];
      const newScores = { ...qData.scores };
      delete newScores[studentId]; // cleanup scores
      newQuarters[q] = { ...qData, scores: newScores };
    });

    const updatedProj: Project = {
      ...active,
      students: active.students.filter(s => s.id !== studentId),
      quarters: newQuarters
    };
    updateActiveProject(updatedProj);
  };

  const importRosterToActive = (newStudents: Omit<Student, 'id'>[], replaceExisting: boolean = false) => {
    const active = getActiveProject();
    if (!active) return;
    const formatted = newStudents.map((s, idx) => ({
      ...s,
      id: `student-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`
    }));

    let finalStudentsList: Student[] = [];

    // Check if existing list has only placeholder default student(s) like DELA CRUZ, JOHN REYES with 123456789123
    const isOnlyPlaceholder = active.students.length <= 2 && active.students.some(s => 
      s.lrn === '123456789123' || s.name.toUpperCase().includes('DELA CRUZ, JOHN REYES')
    );

    if (replaceExisting || active.students.length === 0 || isOnlyPlaceholder) {
      finalStudentsList = formatted;
    } else {
      const existingKeys = new Set(active.students.map(s => (s.lrn && s.lrn !== '123456789123' ? s.lrn.trim() : s.name.toUpperCase().trim())));
      const filteredNew = formatted.filter(s => {
        const key = s.lrn && s.lrn !== '123456789123' ? s.lrn.trim() : s.name.toUpperCase().trim();
        return !existingKeys.has(key);
      });
      finalStudentsList = [...active.students, ...filteredNew];
    }

    const updatedProj: Project = {
      ...active,
      students: finalStudentsList,
      updatedAt: new Date().toISOString()
    };
    updateActiveProject(updatedProj);

    // Auto sync to all projects belonging to the same Grade Level and Section
    syncRosterToSectionGroup(active.schoolYear, active.gradeLevel, active.section, finalStudentsList);
  };

  // Assessment Builder functions
  const addAssessmentToActive = (quarterId: string, assessmentData: Omit<Assessment, 'id' | 'order'>) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const maxOrder = qData.assessments.reduce((max, a) => a.order > max ? a.order : max, -1);
    const newAssessment: Assessment = {
      ...assessmentData,
      id: `assess-${Date.now()}`,
      order: maxOrder + 1
    };
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: [...qData.assessments, newAssessment]
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const updateAssessmentInActive = (quarterId: string, assessment: Assessment) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: qData.assessments.map(a => a.id === assessment.id ? assessment : a)
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const deleteAssessmentFromActive = (quarterId: string, assessmentId: string) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    // Clean up scores of that assessment
    const newScores = { ...qData.scores };
    Object.keys(newScores).forEach(studentId => {
      if (newScores[studentId]) {
        const studentScores = { ...newScores[studentId] };
        delete studentScores[assessmentId];
        newScores[studentId] = studentScores;
      }
    });
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: qData.assessments.filter(a => a.id !== assessmentId),
          scores: newScores
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const reorderAssessmentsInActive = (quarterId: string, assessments: Assessment[]) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: assessments.map((a, index) => ({ ...a, order: index }))
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  // Score editing
  const updateScoreInActive = (quarterId: string, studentId: string, assessmentId: string, score: number) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const currentScores = qData.scores[studentId] || {};
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          scores: {
            ...qData.scores,
            [studentId]: {
              ...currentScores,
              [assessmentId]: score
            }
          }
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const clearScoreInActive = (quarterId: string, studentId: string, assessmentId: string) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const currentScores = { ...(qData.scores[studentId] || {}) };
    delete currentScores[assessmentId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          scores: {
            ...qData.scores,
            [studentId]: currentScores
          }
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const updateReassessmentScoreInActive = (quarterId: string, studentId: string, assessmentId: string, score: number) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const currentScores = qData.reassessmentScores?.[studentId] || {};
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          reassessmentScores: {
            ...(qData.reassessmentScores || {}),
            [studentId]: {
              ...currentScores,
              [assessmentId]: score
            }
          }
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const clearReassessmentScoreInActive = (quarterId: string, studentId: string, assessmentId: string) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const currentScores = { ...(qData.reassessmentScores?.[studentId] || {}) };
    delete currentScores[assessmentId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          reassessmentScores: {
            ...(qData.reassessmentScores || {}),
            [studentId]: currentScores
          }
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const toggleReassessmentForAssessment = (quarterId: string, assessmentId: string, enabled: boolean) => {
    const active = getActiveProject();
    if (!active || !active.quarters[quarterId]) return;
    const qData = active.quarters[quarterId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: qData.assessments.map(a => 
            a.id === assessmentId ? { ...a, reassessmentEnabled: enabled } : a
          )
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const updateReassessmentSettingsInActive = (settings: { enabled: boolean; masteryThreshold: number; interventionThreshold: number; policy: 'Average' | 'Highest' | 'Replacement' }) => {
    const active = getActiveProject();
    if (!active) return;
    const updatedProj: Project = {
      ...active,
      reassessmentSettings: settings
    };
    updateActiveProject(updatedProj);
  };

  // Atomically enable reassessment mode: sets project-level settings AND enables
  // reassessmentEnabled on every assessment in the given quarter in one save.
  const enableReassessmentModeForQuarter = (quarterId: string, settings: { enabled: boolean; masteryThreshold: number; interventionThreshold: number; policy: 'Average' | 'Highest' | 'Replacement' }) => {
    const active = getActiveProject();
    if (!active) return;
    const qData = active.quarters[quarterId];
    if (!qData) return;
    const updatedProj: Project = {
      ...active,
      reassessmentSettings: settings,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          assessments: qData.assessments.map(a => ({ ...a, reassessmentEnabled: true }))
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const toggleGradeAdjustmentMode = (quarterId: string, enabled: boolean) => {
    const active = getActiveProject();
    if (!active) return;
    const qData = active.quarters[quarterId];
    if (!qData) return;
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          adjustmentModeEnabled: enabled
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const setGradeAdjustmentForStudent = (quarterId: string, studentId: string, entry: import('../types').GradeAdjustmentEntry) => {
    const active = getActiveProject();
    if (!active) return;
    const qData = active.quarters[quarterId];
    if (!qData) return;
    const currentAdjustments = qData.adjustments || {};
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          adjustmentModeEnabled: true,
          adjustments: {
            ...currentAdjustments,
            [studentId]: entry
          }
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const removeGradeAdjustmentForStudent = (quarterId: string, studentId: string) => {
    const active = getActiveProject();
    if (!active) return;
    const qData = active.quarters[quarterId];
    if (!qData || !qData.adjustments) return;
    const currentAdjustments = { ...qData.adjustments };
    delete currentAdjustments[studentId];
    const updatedProj: Project = {
      ...active,
      quarters: {
        ...active.quarters,
        [quarterId]: {
          ...qData,
          adjustments: currentAdjustments
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const updateProjectTeacherInfo = (
    projectIdOrInfo: string | { teacherName?: string; schoolName?: string; passingGrade?: number; section?: string; gradeLevel?: string; subject?: string; depedPolicy?: '2015' | '2027'; customWeights?: { wow: number; ppt: number; qste: number } },
    maybeInfo?: { teacherName?: string; schoolName?: string; passingGrade?: number; section?: string; gradeLevel?: string; subject?: string; depedPolicy?: '2015' | '2027'; customWeights?: { wow: number; ppt: number; qste: number } }
  ) => {
    let targetProjectId = activeProjectId;
    let info = maybeInfo;

    if (typeof projectIdOrInfo === 'string') {
      targetProjectId = projectIdOrInfo;
    } else if (projectIdOrInfo && typeof projectIdOrInfo === 'object') {
      info = projectIdOrInfo;
    }

    if (!info || !targetProjectId) return;

    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.id === targetProjectId) {
          return {
            ...p,
            ...(info!.teacherName !== undefined ? { teacherName: info!.teacherName } : {}),
            ...(info!.schoolName !== undefined ? { schoolName: info!.schoolName } : {}),
            ...(info!.passingGrade !== undefined ? { passingGrade: info!.passingGrade } : {}),
            ...(info!.section !== undefined ? { section: info!.section } : {}),
            ...(info!.gradeLevel !== undefined ? { gradeLevel: info!.gradeLevel } : {}),
            ...(info!.subject !== undefined ? { subject: info!.subject } : {}),
            ...(info!.depedPolicy !== undefined ? { depedPolicy: info!.depedPolicy } : {}),
            ...(info!.customWeights !== undefined ? { customWeights: info!.customWeights } : {}),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      const serialized = JSON.stringify(updated);
      localStorage.setItem('srphs_projects_p2', serialized);
      persistSave('srphs_projects_p2', serialized);
      return updated;
    });

    // Also update global default teacher/school name if updated
    if (info.teacherName || info.schoolName) {
      setGlobalSettings(curr => {
        const next = {
          ...curr,
          ...(info!.teacherName ? { teacherName: info!.teacherName } : {}),
          ...(info!.schoolName ? { schoolName: info!.schoolName } : {})
        };
        const serialized = JSON.stringify(next);
        localStorage.setItem('srphs_settings_p2', serialized);
        persistSave('srphs_settings_p2', serialized);
        return next;
      });
    }
  };

  const migrateQuarterData = (sourceQuarter: string, targetQuarter: string, clearSource: boolean = true): boolean => {
    const active = getActiveProject();
    if (!active || !active.quarters[sourceQuarter]) return false;
    if (sourceQuarter === targetQuarter) return false;

    const sourceData = active.quarters[sourceQuarter];
    const clonedSourceData: QuarterData = JSON.parse(JSON.stringify(sourceData));

    const updatedQuarters: Record<string, QuarterData> = {
      ...active.quarters,
      [targetQuarter]: clonedSourceData
    };

    if (clearSource) {
      updatedQuarters[sourceQuarter] = {
        assessments: [],
        scores: {},
        reassessmentScores: {},
        adjustmentModeEnabled: false,
        adjustments: {}
      };
    }

    const updatedProj: Project = {
      ...active,
      quarters: updatedQuarters,
      lastActiveQuarter: targetQuarter,
      updatedAt: new Date().toISOString()
    };

    updateActiveProject(updatedProj);
    return true;
  };

  // Settings & DB Management
  const updateGlobalSettings = (settings: Partial<GlobalSettings>) => {
    const updated = { ...globalSettings, ...settings } as GlobalSettings;
    setGlobalSettings(updated);
    const serialized = JSON.stringify(updated);
    localStorage.setItem('srphs_settings_p2', serialized);
    persistSave('srphs_settings_p2', serialized);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const resetDatabase = () => {
    setProjects(SEED_PROJECTS);
    setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
    setActiveProjectId(null);
    const projSerialized = JSON.stringify(SEED_PROJECTS);
    const setSerialized = JSON.stringify(DEFAULT_GLOBAL_SETTINGS);
    localStorage.setItem('srphs_projects_p2', projSerialized);
    localStorage.setItem('srphs_settings_p2', setSerialized);
    persistSave('srphs_projects_p2', projSerialized);
    persistSave('srphs_settings_p2', setSerialized);
    localStorage.removeItem('srphs_active_id_p2');
    alert("Offline Database successfully reset to system defaults.");
  };

  const backupData = () => {
    // Read directly from localStorage to avoid stale closure issues where React
    // state may not reflect the latest persisted data at time of backup.
    const rawProjects = localStorage.getItem('srphs_projects_p2');
    const rawSettings = localStorage.getItem('srphs_settings_p2');
    const rawAdviserClasses = localStorage.getItem('srphs_adviser_classes');
    const projectsSnap: Project[] = rawProjects ? JSON.parse(rawProjects) : projects;
    const settingsSnap: GlobalSettings = rawSettings ? JSON.parse(rawSettings) : globalSettings;
    const adviserSnap: AdviserClass[] = rawAdviserClasses ? JSON.parse(rawAdviserClasses) : adviserClasses;

    const totalStudents = projectsSnap.reduce((sum, p) => sum + (p.students?.length ?? 0), 0)
      + adviserSnap.reduce((sum, c) => sum + (c.students?.length ?? 0), 0);

    const archive: ArchiveFile = {
      metadata: {
        archiveVersion: ARCHIVE_VERSION,
        appVersion: APP_VERSION,
        schoolYear: settingsSnap.activeSchoolYear ?? 'Unknown',
        calendarType: settingsSnap.calendarType ?? 'Quarter',
        createdAt: new Date().toISOString(),
        createdBy: settingsSnap.teacherName ?? 'Administrator',
        totalProjects: projectsSnap.length,
        totalStudents,
        totalAdviserClasses: adviserSnap.length,
      },
      projects: projectsSnap,
      adviserClasses: adviserSnap,
      globalSettings: settingsSnap,
    };
    return JSON.stringify(archive, null, 2);
  };

  const restoreData = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && Array.isArray(parsed.projects)) {
        saveProjectsToStorage(parsed.projects);
        if (parsed.globalSettings) {
          setGlobalSettings(parsed.globalSettings);
          localStorage.setItem('srphs_settings_p2', JSON.stringify(parsed.globalSettings));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  /**
   * Restore a validated ArchiveFile into application storage.
   * Always call validateArchive() before calling this.
   */
  const restoreArchive = (archive: ArchiveFile): boolean => {
    try {
      // Restore projects
      saveProjectsToStorage(archive.projects);

      // Restore adviser classes
      const adviser = Array.isArray(archive.adviserClasses) ? archive.adviserClasses : [];
      setAdviserClasses(adviser);
      const advSerialized = JSON.stringify(adviser);
      localStorage.setItem('srphs_adviser_classes', advSerialized);
      persistSave('srphs_adviser_classes', advSerialized);

      // Restore global settings (strip transient active-selection fields)
      const settings: GlobalSettings = {
        ...archive.globalSettings,
        activeAdviserClassId: undefined,
      };
      setGlobalSettings(settings);
      const setSerialized = JSON.stringify(settings);
      localStorage.setItem('srphs_settings_p2', setSerialized);
      persistSave('srphs_settings_p2', setSerialized);

      // Clear active project selection
      setActiveProjectId(null);
      localStorage.removeItem('srphs_active_id_p2');

      return true;
    } catch (e) {
      console.error('restoreArchive failed:', e);
      return false;
    }
  };

  const rolloverAcademicYear = (newYear: string, calendarType: 'Quarter' | 'Trimester'): boolean => {
    try {
      // Clear Projects
      setProjects([]);
      localStorage.setItem('srphs_projects_p2', JSON.stringify([]));
      persistSave('srphs_projects_p2', JSON.stringify([]));
      
      // Clear Adviser Classes
      setAdviserClasses([]);
      localStorage.setItem('srphs_adviser_classes', JSON.stringify([]));
      persistSave('srphs_adviser_classes', JSON.stringify([]));

      // Reset active selections
      setActiveProjectId(null);
      localStorage.removeItem('srphs_active_id_p2');
      
      // Update Settings
      const newSettings = { ...globalSettings, activeSchoolYear: newYear, calendarType, activeAdviserClassId: undefined };
      setGlobalSettings(newSettings);
      const setSerialized = JSON.stringify(newSettings);
      localStorage.setItem('srphs_settings_p2', setSerialized);
      persistSave('srphs_settings_p2', setSerialized);
      
      return true;
    } catch (e) {
      console.error('Failed to rollover academic year:', e);
      return false;
    }
  };

  // ─── Adviser Portal Methods ──────────────────────────────────────────────────

  const saveAdviserClass = (cls: AdviserClass) => {
    const existing = adviserClasses.findIndex(c => c.id === cls.id);
    const updated = existing >= 0
      ? adviserClasses.map(c => c.id === cls.id ? cls : c)
      : [...adviserClasses, cls];
    persistAdviserClasses(updated);
  };

  const deleteAdviserClass = (id: string) => {
    persistAdviserClasses(adviserClasses.filter(c => c.id !== id));
  };

  // Persist helper (used by saveAdviserClass / deleteAdviserClass only)
  const persistAdviserClasses = (cls: AdviserClass[]) => {
    setAdviserClasses(cls);
    const serialized = JSON.stringify(cls);
    localStorage.setItem('srphs_adviser_classes', serialized);
    persistSave('srphs_adviser_classes', serialized);
  };

  // Uses functional updater so back-to-back calls don't overwrite each other
  const updateAdviserClass = (classId: string, updater: (cls: AdviserClass) => AdviserClass) => {
    setAdviserClasses(prev => {
      const updated = prev.map(c => c.id === classId ? updater(c) : c);
      const serialized = JSON.stringify(updated);
      localStorage.setItem('srphs_adviser_classes', serialized);
      persistSave('srphs_adviser_classes', serialized);
      return updated;
    });
  };

  const setActiveAdviserClass = (id: string | null) => {
    updateGlobalSettings({ activeAdviserClassId: id ?? undefined });
  };

  const importSubjectGrades = (classId: string, payload: ImportedSubjectGrades) => {
    updateAdviserClass(classId, cls => ({
      ...cls,
      importedGrades: [...cls.importedGrades, payload]
    }));
  };

  const replaceSubjectGrades = (classId: string, subjectUID: string, quarterKey: string, payload: ImportedSubjectGrades) => {
    updateAdviserClass(classId, cls => ({
      ...cls,
      importedGrades: cls.importedGrades.map(g =>
        g.subjectUID === subjectUID && g.quarterKey === quarterKey ? payload : g
      )
    }));
  };

  const lockSubjectGrades = (classId: string, subjectUID: string, quarterKey: string, lock: boolean) => {
    updateAdviserClass(classId, cls => ({
      ...cls,
      importedGrades: cls.importedGrades.map(g =>
        g.subjectUID === subjectUID && g.quarterKey === quarterKey
          ? { ...g, isLocked: lock, lockedAt: lock ? new Date().toISOString() : undefined }
          : g
      )
    }));
  };

  const setManualPromotionStatus = (classId: string, lrn: string, status: 'Promoted' | 'Retained' | null) => {
    updateAdviserClass(classId, cls => {
      const updated = { ...cls.manualPromotionStatus };
      if (status === null) delete updated[lrn];
      else updated[lrn] = status;
      return { ...cls, manualPromotionStatus: updated };
    });
  };

  const setObservedValue = (classId: string, lrn: string, quarter: string, field: 'responsible' | 'obedient' | 'compassionate' | 'kind' | 'serviceOriented', rating: ObservedValueRating) => {
    updateAdviserClass(classId, cls => {
      const existing = cls.observedValues.find(v => v.studentLRN === lrn);
      const emptyQ = (): { responsible: ObservedValueRating; obedient: ObservedValueRating; compassionate: ObservedValueRating; kind: ObservedValueRating; serviceOriented: ObservedValueRating } =>
        ({ responsible: '' as ObservedValueRating, obedient: '' as ObservedValueRating, compassionate: '' as ObservedValueRating, kind: '' as ObservedValueRating, serviceOriented: '' as ObservedValueRating });
      if (existing) {
        return {
          ...cls,
          observedValues: cls.observedValues.map(v =>
            v.studentLRN === lrn
              ? { ...v, quarters: { ...v.quarters, [quarter]: { ...emptyQ(), ...v.quarters[quarter], [field]: rating } } }
              : v
          ) as LearnerObservedValues[]
        };
      }
      return {
        ...cls,
        observedValues: [...cls.observedValues, { studentLRN: lrn, quarters: { [quarter]: { ...emptyQ(), [field]: rating } } }] as LearnerObservedValues[]
      };
    });
  };

  const setAttendance = (classId: string, lrn: string, month: string, daysAbsent: number) => {
    updateAdviserClass(classId, cls => {
      const existing = cls.attendance.find(a => a.studentLRN === lrn);
      const schoolDays = cls.attendanceConfig.schoolDaysPerMonth[month] || 0;
      if (existing) {
        return {
          ...cls,
          attendance: cls.attendance.map(a =>
            a.studentLRN === lrn
              ? { ...a, months: { ...a.months, [month]: { schoolDays, daysAbsent } } }
              : a
          )
        };
      }
      return {
        ...cls,
        attendance: [...cls.attendance, { studentLRN: lrn, months: { [month]: { schoolDays, daysAbsent } } }]
      };
    });
  };

  const addOverrideLogEntry = (classId: string, entry: Omit<OverrideLogEntry, 'id' | 'timestamp'>) => {
    updateAdviserClass(classId, cls => ({
      ...cls,
      overrideLog: [{
        ...entry,
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString()
      }, ...cls.overrideLog]
    }));
  };

  const overrideStudentGrade = (
    classId: string,
    subjectUID: string,
    quarterKey: string,
    lrn: string,
    newGrade: number,
    reason: string,
    componentSubjectName?: string
  ) => {
    updateAdviserClass(classId, cls => {
      let loggedPrevValue = 'None';
      let loggedSubjectName = '';

      const updatedGrades = cls.importedGrades.map(g => {
        const isTarget = (g.subjectUID === subjectUID || (componentSubjectName && g.subjectName === componentSubjectName)) && g.quarterKey === quarterKey;
        if (!isTarget) return g;

        loggedSubjectName = g.subjectName;

        // If it's a composite language/MAPEH group
        if (g.isLanguageGroup && g.languageRawGrades) {
          const updatedRaw = { ...g.languageRawGrades };
          let matchedKey: string | null = null;

          if (componentSubjectName) {
            if (updatedRaw[componentSubjectName] !== undefined) {
              matchedKey = componentSubjectName;
            } else {
              const normalized = componentSubjectName.replace('/', ' & ');
              const slashed = componentSubjectName.replace(' & ', '/');
              if (updatedRaw[normalized] !== undefined) matchedKey = normalized;
              else if (updatedRaw[slashed] !== undefined) matchedKey = slashed;
            }
          }

          if (matchedKey) {
            loggedSubjectName = `${g.subjectName} (${matchedKey})`;
            const prevCompGrade = updatedRaw[matchedKey]?.[lrn];
            if (prevCompGrade !== undefined) loggedPrevValue = String(prevCompGrade);

            updatedRaw[matchedKey] = {
              ...updatedRaw[matchedKey],
              [lrn]: newGrade
            };

            // Recompute composite final grade for this student
            const keys = Object.keys(updatedRaw);
            const compGrades = keys
              .map(k => updatedRaw[k]?.[lrn])
              .filter((v): v is number => v !== undefined && v !== null);

            const newCompAvg = compGrades.length > 0
              ? Math.round((compGrades.reduce((a, b) => a + b, 0) / compGrades.length) * 100) / 100
              : newGrade;

            return {
              ...g,
              languageRawGrades: updatedRaw,
              grades: {
                ...g.grades,
                [lrn]: newCompAvg
              }
            };
          } else {
            // Overriding the composite subject overall
            const prevGrade = g.grades[lrn];
            if (prevGrade !== undefined) loggedPrevValue = String(prevGrade);
            return {
              ...g,
              grades: {
                ...g.grades,
                [lrn]: newGrade
              }
            };
          }
        }

        // Regular non-composite subject
        const prevGrade = g.grades[lrn];
        if (prevGrade !== undefined) loggedPrevValue = String(prevGrade);

        return {
          ...g,
          grades: {
            ...g.grades,
            [lrn]: newGrade
          }
        };
      });

      const student = cls.students.find(s => s.lrn === lrn);
      const finalLog = [{
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        adviserName: cls.adviserName,
        studentLRN: lrn,
        studentName: student ? student.name : 'Unknown',
        subjectUID,
        subjectName: loggedSubjectName || 'Unknown Subject',
        quarterKey,
        action: 'Grade Edited' as const,
        previousValue: loggedPrevValue,
        newValue: String(newGrade),
        reason
      }, ...cls.overrideLog];

      return {
        ...cls,
        importedGrades: updatedGrades,
        overrideLog: finalLog
      };
    });
  };

  return (
    <AppContext.Provider value={{
      projects,
      activeProjectId,
      globalSettings,
      darkMode,
      activeRoute,
      workspaceMode,
      setWorkspaceMode,
      sidebarCollapsed,
      setSidebarCollapsed,
      isLoggedIn,
      authUsername,
      authPassword,
      login,
      bypassLogin,
      logout,
      updateCredentials,
      createProject,
      openProject,
      saveProject,
      duplicateProject,
      archiveProject,
      toggleProjectCompleted,
      deleteProject,
      updateActiveProjectQuarter,
      
      addStudentToActive,
      updateStudentInActive,
      deleteStudentFromActive,
      importRosterToActive,
      syncRosterToSectionGroup,
      
      addAssessmentToActive,
      updateAssessmentInActive,
      deleteAssessmentFromActive,
      reorderAssessmentsInActive,
      
      updateScoreInActive,
      clearScoreInActive,
      updateReassessmentScoreInActive,
      clearReassessmentScoreInActive,
      toggleReassessmentForAssessment,
      updateReassessmentSettingsInActive,
      enableReassessmentModeForQuarter,
      
      toggleGradeAdjustmentMode,
      setGradeAdjustmentForStudent,
      removeGradeAdjustmentForStudent,
      updateProjectTeacherInfo,
      migrateQuarterData,
      
      updateGlobalSettings,
      toggleDarkMode,
      setActiveRoute,
      resetDatabase,
      backupData,
      restoreData,
      restoreArchive,
      rolloverAcademicYear,

      // Adviser Portal
      adviserClasses,
      saveAdviserClass,
      updateAdviserClass,
      deleteAdviserClass,
      setActiveAdviserClass,
      importSubjectGrades,
      replaceSubjectGrades,
      lockSubjectGrades,
      setManualPromotionStatus,
      setObservedValue,
      setAttendance,
      addOverrideLogEntry,
      overrideStudentGrade,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
