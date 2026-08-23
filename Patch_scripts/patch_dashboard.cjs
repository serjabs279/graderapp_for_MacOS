const fs = require('fs');

const filePath = 'src/components/DashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rewrite the full screen print mode view (selectedConsolidatedClass && printFriendly)
const printViewStartIdx = content.indexOf('if (selectedConsolidatedClass && printFriendly) {');
const printViewEndIdx = content.indexOf('  // --------------------------------------------------------\n  // PROJECT HUB');

if (printViewStartIdx !== -1 && printViewEndIdx !== -1) {
  const before = content.substring(0, printViewStartIdx);
  const after = content.substring(printViewEndIdx);

  const newPrintView = `if (selectedConsolidatedClass && printFriendly) {
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
              ? \`\${st.name.trim().toUpperCase()}_\${st.lrn.trim()}\`
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
      let passingCount = 0;
      let highestGrade = 0;
      let lowestGrade = 100;

      // Annual descriptors distribution counters
      let outstanding = 0;
      let verySat = 0;
      let sat = 0;
      let fairlySat = 0;
      let didNotMeet = 0;

      fullRoster.all.forEach(st => {
        const periodGrades = activePeriods.map(p => getStudentQuarterGrade(consolidatedProject, st.lrn, st.name, p.id));
        const qs = periodGrades.filter(v => v !== null) as number[];
        if (qs.length > 0) {
          const finalG = Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
          sumGrades += finalG;
          gradedCount++;

          if (finalG >= passingGradeVal) passingCount++;
          if (finalG > highestGrade) highestGrade = finalG;
          if (finalG < lowestGrade) lowestGrade = finalG;

          if (finalG >= 90) outstanding++;
          else if (finalG >= 85) verySat++;
          else if (finalG >= 80) sat++;
          else if (finalG >= 75) fairlySat++;
          else didNotMeet++;
        }
      });

      const meanFinalGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
      const passingRate = gradedCount > 0 ? Math.round((passingCount / gradedCount) * 100) : 0;

      const renderRosterTableBody = (title: string, list: Student[], sexColor: string) => {
        return (
          <>
            <tr className="bg-slate-100/40 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200">
              <td colSpan={5 + activePeriods.length} className={\`py-2 px-4 text-left uppercase tracking-wider font-extrabold \${sexColor}\`}>
                {title} ({list.length} learners)
              </td>
            </tr>
            {list.length === 0 ? (
              <tr className="text-center text-slate-450 text-xs italic">
                <td colSpan={5 + activePeriods.length} className="py-3">No learners found.</td>
              </tr>
            ) : (
              list.map((st, idx) => {
                const periodGrades = activePeriods.map(p => getStudentQuarterGrade(consolidatedProject, st.lrn, st.name, p.id));
                const qs = periodGrades.filter(v => v !== null) as number[];
                const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                return (
                  <tr key={st.id} className="hover:bg-slate-50/20 text-slate-700">
                    <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-extrabold uppercase text-slate-900">{st.name}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                    {activePeriods.map((p, pIdx) => {
                      const grade = periodGrades[pIdx];
                      return (
                        <td key={p.id} className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">
                          {grade !== null ? grade : '-'}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-indigo-50/15 font-black text-xs text-indigo-750">
                      {finalG !== null ? finalG : '-'}
                    </td>
                    <td className={\`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase \${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}\`}>
                      {remark}
                    </td>
                  </tr>
                );
              })
            )}
          </>
        );
      };

      return (
        <div className="space-y-6 animate-fade-in print:animate-none pb-12 bg-white text-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto print:p-0 print:m-0 print:border-0 print:shadow-none print:max-w-full print:rounded-none print:pb-0 print:space-y-4 print:block print:h-auto print:max-h-none print:overflow-visible">
          {/* Floating Print Utility Bar (Non-Printable) */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-150 p-3.5 rounded-2xl print:hidden">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Print Preview Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Execute Print
              </button>
              <button
                onClick={() => setSelectedConsolidatedClass(null)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
              >
                Exit Preview
              </button>
            </div>
          </div>

          <div id="print-sheet-area" className="space-y-6 print:p-0">
            {/* School Heading Panel */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900/15">
              <h1 className="text-sm font-black tracking-wider uppercase text-slate-900 font-serif">{activeGroup.schoolName}</h1>
              <p className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                Consolidated Report of Learner Grades • S.Y. {activeGroup.schoolYear}
              </p>
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
                      {activePeriods.map(p => (
                        <th key={p.id} className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">
                          {p.label}
                        </th>
                      ))}
                      <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-indigo-100/30 text-indigo-800 font-black w-16">Final</th>
                      <th className="py-2.5 px-3 text-center bg-slate-50 text-slate-650 font-black w-28">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
                    {renderRosterTableBody('Males', filteredMales, 'text-indigo-700')}
                    {renderRosterTableBody('Females', filteredFemales, 'text-indigo-700')}
                    {filteredUnspec.length > 0 && renderRosterTableBody('Unspecified Sex', filteredUnspec, 'text-amber-700')}
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
  }`;

  content = before + newPrintView + '\n' + after;
}

// 2. Rewrite the inline print view (the one inside the return block)
// Let's locate the return tab block.
const inlineReportStart = content.indexOf('{dashboardTab === \'consolidation\' && (');
const inlineReportEnd = content.indexOf('          {/* System Settings & Actions Card (Non-active project) */}');

if (inlineReportStart !== -1 && inlineReportEnd !== -1) {
  const before = content.substring(0, inlineReportStart);
  const after = content.substring(inlineReportEnd);

  const newInlineReport = `{dashboardTab === 'consolidation' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-6 md:p-8 rounded-2xl shadow-3xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-850">
            <div className="space-y-1">
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono font-bold px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30 uppercase">
                Consolidated Report Generator
              </span>
              <h3 className="text-base font-black text-slate-850 dark:text-slate-150 tracking-tight">Class Consolidation View</h3>
            </div>
            {selectedConsolidatedClass && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => setPrintFriendly(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="h-4 w-4" /> Open Print View
                </button>
                <button
                  onClick={() => setSelectedConsolidatedClass(null)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer border border-slate-150 dark:border-slate-800"
                >
                  Exit Sheet
                </button>
              </div>
            )}
          </div>

          {!selectedConsolidatedClass ? (
            <div className="space-y-3.5">
              <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Select Class Section Group
              </span>
              {groupedClasses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No section groups compiled yet. Spin up projects to initialize.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedClasses.map(group => {
                    const uniqueStudentsCount = (() => {
                      const sMap = new Map();
                      group.projects.forEach(p => p.students.forEach(st => sMap.set(st.name, true)));
                      return sMap.size;
                    })();

                    // A single project now holds all quarters. Check which quarter keys have data.
                    const consolidatedProject = group.projects[0];
                    const quarterKeys = consolidatedProject ? Object.keys(consolidatedProject.quarters || {}) : [];
                    const q1 = quarterKeys.some(q => q.includes('1st') || q.includes('Term 1'));
                    const q2 = quarterKeys.some(q => q.includes('2nd') || q.includes('Term 2'));
                    const q3 = quarterKeys.some(q => q.includes('3rd') || q.includes('Term 3'));
                    const q4 = quarterKeys.some(q => q.includes('4th'));

                    const hasTrimester = consolidatedProject?.workspace === 'JHS' && globalSettings.calendarType === 'Trimester';

                    return (
                      <button
                        key={group.key}
                        onClick={() => setSelectedConsolidatedClass(group.key)}
                        className="w-full text-left p-4.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800 transition-all space-y-3 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {group.subject} • {group.gradeLevel} ({group.section})
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {group.schoolYear} • {uniqueStudentsCount} Learners
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasTrimester ? (
                            <>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>T1</span>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>T2</span>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>T3</span>
                            </>
                          ) : (
                            <>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>Q1</span>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>Q2</span>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>Q3</span>
                              <span className={\`text-[8px] font-mono font-bold px-2 py-0.5 rounded border \${q4 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-250'}\`}>Q4</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            (() => {
              const activeGroup = groupedClasses.find(g => g.key === selectedConsolidatedClass);
              if (!activeGroup) return null;

              const isSHS = activeGroup.projects[0]?.workspace === 'SHS';
              const duration = activeGroup.projects[0]?.projectDuration;
              const semester = activeGroup.projects[0]?.semester;

              const consolidatedProject = activeGroup.projects[0];
              if (!consolidatedProject) return null;

              const projectCal = getProjectCalendar(consolidatedProject, globalSettings.calendarType);
              let activePeriods = projectCal.periods;
              if (isSHS && duration === 'One Semester') {
                const semPeriods = semester === 'Semester 2'
                  ? QUARTER_CALENDAR.semester2Periods
                  : QUARTER_CALENDAR.semester1Periods;
                activePeriods = activePeriods.filter(p => semPeriods.includes(p.id));
              }

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

              const fullRoster = (() => {
                const studentsMap = new Map<string, Student>();
                const isDummyLrn = (l?: string) => !l || l === '123456789123' || l.startsWith('123');

                activeGroup.projects.forEach(proj => {
                  proj.students.forEach(st => {
                    const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8) 
                      ? \`\${st.name.trim().toUpperCase()}_\${st.lrn.trim()}\`
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

              const filterList = (arr: Student[]) => {
                if (!consolidatedSearch.trim()) return arr;
                const q = consolidatedSearch.toLowerCase();
                return arr.filter(s => s.name.toLowerCase().includes(q) || (s.lrn && s.lrn.includes(q)));
              };

              const filteredMales = filterList(fullRoster.males);
              const filteredFemales = filterList(fullRoster.females);
              const filteredUnspec = filterList(fullRoster.unspec);

              let gradedCount = 0;
              let sumGrades = 0;
              let passingCount = 0;
              let highestGrade = 0;
              let lowestGrade = 100;

              let outstanding = 0;
              let verySat = 0;
              let sat = 0;
              let fairlySat = 0;
              let didNotMeet = 0;

              fullRoster.all.forEach(st => {
                const periodGrades = activePeriods.map(p => getStudentQuarterGrade(consolidatedProject, st.lrn, st.name, p.id));
                const qs = periodGrades.filter(v => v !== null) as number[];
                if (qs.length > 0) {
                  const finalG = Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
                  sumGrades += finalG;
                  gradedCount++;

                  if (finalG >= passingGradeVal) passingCount++;
                  if (finalG > highestGrade) highestGrade = finalG;
                  if (finalG < lowestGrade) lowestGrade = finalG;

                  if (finalG >= 90) outstanding++;
                  else if (finalG >= 85) verySat++;
                  else if (finalG >= 80) sat++;
                  else if (finalG >= 75) fairlySat++;
                  else didNotMeet++;
                }
              });

              const meanFinalGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
              const passingRate = gradedCount > 0 ? Math.round((passingCount / gradedCount) * 100) : 0;

              const renderRosterTableBody = (title: string, list: Student[], sexColor: string) => {
                return (
                  <>
                    <tr className="bg-slate-100/40 dark:bg-slate-950/30 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200 dark:border-slate-855 text-left">
                      <td colSpan={5 + activePeriods.length} className={\`py-2 px-4 uppercase tracking-wider font-extrabold \${sexColor}\`}>
                        {title} ({list.length} learners)
                      </td>
                    </tr>
                    {list.length === 0 ? (
                      <tr className="text-center text-slate-450 text-xs italic">
                        <td colSpan={5 + activePeriods.length} className="py-3">No learners found.</td>
                      </tr>
                    ) : (
                      list.map((st, idx) => {
                        const periodGrades = activePeriods.map(p => getStudentQuarterGrade(consolidatedProject, st.lrn, st.name, p.id));
                        const qs = periodGrades.filter(v => v !== null) as number[];
                        const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
                        const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-850/10 text-slate-700 dark:text-slate-300">
                            <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-4 border-r border-slate-200 dark:border-slate-800 text-left font-sans font-extrabold uppercase text-slate-900 dark:text-white">{st.name}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                            {activePeriods.map((p, pIdx) => {
                              const grade = periodGrades[pIdx];
                              return (
                                <td key={p.id} className="py-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-900 dark:text-white font-semibold">
                                  {grade !== null ? grade : '-'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800 text-center bg-indigo-50/15 dark:bg-indigo-950/15 font-black text-xs text-indigo-700 dark:text-indigo-400">
                              {finalG !== null ? finalG : '-'}
                            </td>
                            <td className={\`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase \${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500 font-extrabold'}\`}>
                              {remark}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </>
                );
              };

              return (
                <div className="space-y-6">
                  {/* Search Bar for consolidated table */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search learners..."
                        value={consolidatedSearch}
                        onChange={(e) => setConsolidatedSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div id="print-sheet-area" className={\`space-y-6 \${printFriendly ? 'p-6 bg-white text-slate-900 border-0 rounded-xl' : ''}\`}>
                    {/* School Heading Panel */}
                    <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900/15">
                      <h1 className="text-sm font-black tracking-wider uppercase text-slate-900 font-serif">{activeGroup.schoolName}</h1>
                      <p className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                        Consolidated Grade Sheet
                      </p>
                      <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wide">
                        Subject: {activeGroup.subject} | Grade & Section: {activeGroup.gradeLevel} - {activeGroup.section} | S.Y. {activeGroup.schoolYear}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border-spacing-0 select-none text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/40 text-[9px] font-sans text-slate-450 dark:text-slate-500 uppercase tracking-wider font-black text-center">
                              <th className="py-2.5 px-4 text-left border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold w-12">No.</th>
                              <th className="py-2.5 px-4 text-left border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold min-w-[180px]">Learner Name</th>
                              <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-bold w-28">LRN</th>
                              {activePeriods.map(p => (
                                <th key={p.id} className="py-2.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-black w-12">
                                  {p.label}
                                </th>
                              ))}
                              <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-100/30 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 font-black w-16">Final</th>
                              <th className="py-2.5 px-3 text-center bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 font-black w-28">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-850/60 font-mono text-slate-700 dark:text-slate-350">
                            {renderRosterTableBody('Males', filteredMales, 'text-indigo-700 dark:text-indigo-400')}
                            {renderRosterTableBody('Females', filteredFemales, 'text-indigo-700 dark:text-indigo-400')}
                            {filteredUnspec.length > 0 && renderRosterTableBody('Unspecified Sex', filteredUnspec, 'text-amber-700 dark:text-amber-400')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
      {/* System Settings & Actions Card (Non-active project) */}`;

  content = before + newInlineReport + content.substring(inlineReportEnd + '          {/* System Settings & Actions Card (Non-active project) */}'.length);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched DashboardView print sheets dynamically!');
