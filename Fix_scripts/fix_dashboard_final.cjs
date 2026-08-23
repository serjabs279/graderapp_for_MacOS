const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DashboardView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The file has a corrupted block starting at the button element.
// We need to find and replace the exact broken section.
const corruptedMarker = `            <span>Configure System Setup</span>\r\n            if (!studentsMap.has(key)) {`;

const fixedBlock = `            <span>Configure System Setup</span>
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
      const getStudentQuarterGrade = (proj, lrn, name, qId) => {
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
        const studentsMap = new Map();
        const isDummyLrn = (l) => !l || l === '123456789123' || l.startsWith('123');
        
        activeGroup.projects.forEach(proj => {
          proj.students.forEach(st => {
            const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8) 
              ? \`\${st.name.trim().toUpperCase()}_\${st.lrn.trim()}\`
              : st.name.trim().toUpperCase();
            if (!studentsMap.has(key)) {`;

if (content.includes(corruptedMarker)) {
  // Find where the roster code begins after the corrupted marker
  const corruptedStart = content.indexOf(corruptedMarker);
  // Find the end of the fullRoster block closing
  const rosterClosing = `        return { males: m, females: f, unspec, all: [...m, ...f, ...unspec] };\r\n      })();`;
  const rosterEnd = content.indexOf(rosterClosing);
  
  if (rosterEnd !== -1) {
    // Replace from corrupted marker to end of roster (exclusive of rosterClosing)  
    const before = content.substring(0, corruptedStart);
    const after = content.substring(rosterEnd); // Keep the rosterClosing and everything after
    
    content = before + fixedBlock + '\r\n' + after;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed corrupted block');
  } else {
    console.log('ERROR: Could not find rosterClosing pattern');
    console.log('First 200 chars after marker:', content.substring(corruptedStart, corruptedStart + 200));
  }
} else {
  console.log('ERROR: Could not find corrupted marker');
  // Dump what we see around the area
  const idx = content.indexOf('Configure System Setup');
  if (idx !== -1) {
    console.log('Context around "Configure System Setup":');
    console.log(JSON.stringify(content.substring(idx, idx + 200)));
  }
}
