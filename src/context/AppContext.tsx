import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, GlobalSettings, Student, Assessment, SubjectType } from '../types';
import { DEFAULT_GLOBAL_SETTINGS, SEED_PROJECTS } from '../data/seedData';
import { SHS_PROFILES } from '../utils';

interface AppContextType {
  projects: Project[];
  activeProjectId: string | null;
  globalSettings: GlobalSettings;
  darkMode: boolean;
  activeRoute: 'dashboard' | 'class-manager' | 'settings' | 'about';
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
  createProject: (meta: Omit<Project, 'id' | 'students' | 'assessments' | 'scores' | 'createdAt' | 'updatedAt'>) => string;
  openProject: (id: string | null) => void;
  saveProject: (project: Project) => void;
  duplicateProject: (id: string) => void;
  archiveProject: (id: string, archive: boolean) => void;
  toggleProjectCompleted: (id: string, completed: boolean) => void;
  deleteProject: (id: string) => void;
  
  // Roster / Student operations within active project
  addStudentToActive: (student: Omit<Student, 'id'>) => void;
  updateStudentInActive: (student: Student) => void;
  deleteStudentFromActive: (studentId: string) => void;
  importRosterToActive: (students: Omit<Student, 'id'>[], replaceExisting?: boolean) => void;
  syncRosterToSectionGroup: (schoolYear: string, gradeLevel: string, section: string, sourceStudents: Student[]) => void;
  
  // Assessment operations within active project
  addAssessmentToActive: (assessment: Omit<Assessment, 'id' | 'order'>) => void;
  updateAssessmentInActive: (assessment: Assessment) => void;
  deleteAssessmentFromActive: (assessmentId: string) => void;
  reorderAssessmentsInActive: (assessments: Assessment[]) => void;
  
  // Gradebook cell updates
  updateScoreInActive: (studentId: string, assessmentId: string, score: number) => void;
  clearScoreInActive: (studentId: string, assessmentId: string) => void;

  // Settings & Db Operations
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  toggleDarkMode: () => void;
  setActiveRoute: (route: 'dashboard' | 'class-manager' | 'settings' | 'about') => void;
  resetDatabase: () => void;
  backupData: () => string;
  restoreData: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<'dashboard' | 'class-manager' | 'settings' | 'about'>('dashboard');
  const [workspaceMode, setWorkspaceModeState] = useState<'JHS' | 'SHS'>('JHS');

  // Sidebar collapsing state
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authUsername, setAuthUsername] = useState<string>('admin');
  const [authPassword, setAuthPassword] = useState<string>('admin123');

  // Load from local storage
  useEffect(() => {
    const localProjects = localStorage.getItem('srphs_projects_p2');
    const localActiveId = localStorage.getItem('srphs_active_id_p2');
    const localSettings = localStorage.getItem('srphs_settings_p2');
    const localDarkMode = localStorage.getItem('srphs_dark_mode');
    const localWorkspace = localStorage.getItem('srphs_workspace_mode');
    
    const localSidebar = localStorage.getItem('srphs_sidebar_collapsed');
    const localLoggedIn = localStorage.getItem('srphs_logged_in');
    const localUsername = localStorage.getItem('srphs_auth_username');
    const localPassword = localStorage.getItem('srphs_auth_password');

    if (localSidebar) {
      setSidebarCollapsedState(JSON.parse(localSidebar));
    }
    if (localLoggedIn) {
      setIsLoggedIn(JSON.parse(localLoggedIn));
    }
    if (localUsername) {
      setAuthUsername(localUsername);
    }
    if (localPassword) {
      setAuthPassword(localPassword);
    }

    if (localProjects) {
      setProjects(JSON.parse(localProjects));
    } else {
      setProjects(SEED_PROJECTS);
      localStorage.setItem('srphs_projects_p2', JSON.stringify(SEED_PROJECTS));
    }

    // Commented out to ensure the general Landing Dashboard (Project Hub) always shows on startup
    // if (localActiveId) {
    //   setActiveProjectId(localActiveId);
    // }

    if (localSettings) {
      setGlobalSettings(JSON.parse(localSettings));
    } else {
      setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
      localStorage.setItem('srphs_settings_p2', JSON.stringify(DEFAULT_GLOBAL_SETTINGS));
    }

    if (localDarkMode) {
      const isDark = JSON.parse(localDarkMode);
      setDarkMode(isDark);
    }

    if (localWorkspace === 'SHS') {
      setWorkspaceModeState('SHS');
    } else {
      setWorkspaceModeState('JHS');
    }
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
    localStorage.setItem('srphs_projects_p2', JSON.stringify(updatedProjects));
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

  const createProject = (meta: Omit<Project, 'id' | 'students' | 'assessments' | 'scores' | 'createdAt' | 'updatedAt'>) => {
    const newId = `project-${Date.now()}`;
    
    // Check if it's SHS and what the profile is
    const isSHS = meta.workspace === 'SHS';
    let hasExam = true;
    if (isSHS && meta.assessmentProfileId) {
      const profile = SHS_PROFILES.find(p => p.id === meta.assessmentProfileId);
      if (profile && profile.qa === 0) {
        hasExam = false;
      }
    }

    const defaultAssessments: Assessment[] = [
      { id: `as-${Date.now()}-ww1`, name: "Written Work 1", category: "WW", perfectScore: 20, order: 0, date: new Date().toISOString().split('T')[0], description: "Initial assessment" },
      { id: `as-${Date.now()}-pt1`, name: "Performance Task 1", category: "PT", perfectScore: 50, order: 1, date: new Date().toISOString().split('T')[0], description: "Initial performance task" }
    ];

    if (hasExam) {
      defaultAssessments.push({ 
        id: `as-${Date.now()}-qe`, 
        name: "Quarterly Exam", 
        category: "QE", 
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

    const newProject: Project = {
      ...meta,
      id: newId,
      students: inheritedStudents,
      assessments: defaultAssessments,
      scores: {},
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
    const newScores = { ...active.scores };
    delete newScores[studentId]; // cleanup scores
    const updatedProj: Project = {
      ...active,
      students: active.students.filter(s => s.id !== studentId),
      scores: newScores
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
  const addAssessmentToActive = (assessmentData: Omit<Assessment, 'id' | 'order'>) => {
    const active = getActiveProject();
    if (!active) return;
    const maxOrder = active.assessments.reduce((max, a) => a.order > max ? a.order : max, -1);
    const newAssessment: Assessment = {
      ...assessmentData,
      id: `assess-${Date.now()}`,
      order: maxOrder + 1
    };
    const updatedProj: Project = {
      ...active,
      assessments: [...active.assessments, newAssessment]
    };
    updateActiveProject(updatedProj);
  };

  const updateAssessmentInActive = (assessment: Assessment) => {
    const active = getActiveProject();
    if (!active) return;
    const updatedProj: Project = {
      ...active,
      assessments: active.assessments.map(a => a.id === assessment.id ? assessment : a)
    };
    updateActiveProject(updatedProj);
  };

  const deleteAssessmentFromActive = (assessmentId: string) => {
    const active = getActiveProject();
    if (!active) return;
    // Clean up scores of that assessment
    const newScores = { ...active.scores };
    Object.keys(newScores).forEach(studentId => {
      if (newScores[studentId]) {
        const studentScores = { ...newScores[studentId] };
        delete studentScores[assessmentId];
        newScores[studentId] = studentScores;
      }
    });
    const updatedProj: Project = {
      ...active,
      assessments: active.assessments.filter(a => a.id !== assessmentId),
      scores: newScores
    };
    updateActiveProject(updatedProj);
  };

  const reorderAssessmentsInActive = (assessments: Assessment[]) => {
    const active = getActiveProject();
    if (!active) return;
    const updatedProj: Project = {
      ...active,
      assessments: assessments.map((a, index) => ({ ...a, order: index }))
    };
    updateActiveProject(updatedProj);
  };

  // Score editing
  const updateScoreInActive = (studentId: string, assessmentId: string, score: number) => {
    const active = getActiveProject();
    if (!active) return;
    const currentScores = active.scores[studentId] || {};
    const updatedProj: Project = {
      ...active,
      scores: {
        ...active.scores,
        [studentId]: {
          ...currentScores,
          [assessmentId]: score
        }
      }
    };
    updateActiveProject(updatedProj);
  };

  const clearScoreInActive = (studentId: string, assessmentId: string) => {
    const active = getActiveProject();
    if (!active) return;
    const currentScores = { ...(active.scores[studentId] || {}) };
    delete currentScores[assessmentId];
    const updatedProj: Project = {
      ...active,
      scores: {
        ...active.scores,
        [studentId]: currentScores
      }
    };
    updateActiveProject(updatedProj);
  };

  // Settings & DB Management
  const updateGlobalSettings = (settings: Partial<GlobalSettings>) => {
    const updated = { ...globalSettings, ...settings } as GlobalSettings;
    setGlobalSettings(updated);
    localStorage.setItem('srphs_settings_p2', JSON.stringify(updated));
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const resetDatabase = () => {
    setProjects(SEED_PROJECTS);
    setGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
    setActiveProjectId(null);
    localStorage.setItem('srphs_projects_p2', JSON.stringify(SEED_PROJECTS));
    localStorage.setItem('srphs_settings_p2', JSON.stringify(DEFAULT_GLOBAL_SETTINGS));
    localStorage.removeItem('srphs_active_id_p2');
    alert("Offline Database successfully reset to system defaults.");
  };

  const backupData = () => {
    const data = {
      projects,
      globalSettings,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
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
      
      updateGlobalSettings,
      toggleDarkMode,
      setActiveRoute,
      resetDatabase,
      backupData,
      restoreData
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
