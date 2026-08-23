const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DashboardView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The block currently in the file is broken - we need to reconstruct
// lines 522-531 which had orphaned helper code
const brokenBlock = `    if (activeGroup) {
          (lrn && lrn !== '123456789123' && x.lrn === lrn) || 
          x.name.trim().toUpperCase() === normName
        );
        if (!s) return null;
        const r = computeProjectStudentGrade(proj, s.id, globalSettings.subjects, qId);
        return r.hasScores ? r.finalGrade : null;
      };

      // Roster Compilation`;

const fixedBlock = `    if (activeGroup) {
      const isSHS = activeGroup.projects[0]?.workspace === 'SHS';
      const duration = activeGroup.projects[0]?.projectDuration;
      const semester = activeGroup.projects[0]?.semester;

      const consolidatedProject = activeGroup.projects[0];
      if (!consolidatedProject) return null;

      // Dynamically determine which periods are shown based on calendar & SHS duration
      const projectCal = getProjectCalendar(consolidatedProject, globalSettings.calendarType);
      let activePeriods = projectCal.periods;
      if (isSHS && duration === 'One Semester') {
        const semPeriods = semester === 'Semester 2'
          ? QUARTER_CALENDAR.semester2Periods
          : QUARTER_CALENDAR.semester1Periods;
        activePeriods = activePeriods.filter(p => semPeriods.includes(p.id));
      }
      // Legacy show flags (needed for td cell rendering compat)
      const showQ1 = activePeriods.some(p => p.id === QUARTER_CALENDAR.periods[0]?.id);
      const showQ2 = activePeriods.some(p => p.id === QUARTER_CALENDAR.periods[1]?.id);
      const showQ3 = activePeriods.some(p => p.id === QUARTER_CALENDAR.periods[2]?.id);
      const showQ4 = activePeriods.some(p => p.id === QUARTER_CALENDAR.periods[3]?.id);

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

      // Roster Compilation`;

content = content.replace(brokenBlock, fixedBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed broken block. Lines replaced:', content.includes('const isSHS') ? 'YES' : 'NO');
