const fs = require('fs');
const filePath = 'src/components/DashboardView.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Lines are 0-indexed. Block starts at line 529 (idx 528), ends at line 968 (idx 967)
const beforeLines = lines.slice(0, 528);
const afterLines = lines.slice(968);

const newBlock = `
  // --------------------------------------------------------
  // FULL-SCREEN PRINT MODE VIEW  (Dynamic Calendar-Aware)
  // --------------------------------------------------------
  if (selectedConsolidatedClass && printFriendly) {
    const activeGroup = groupedClasses.find(g => g.key === selectedConsolidatedClass);
    if (activeGroup) {
      const isSHS = activeGroup.projects[0]?.workspace === 'SHS';
      const duration = activeGroup.projects[0]?.projectDuration;
      const semester = activeGroup.projects[0]?.semester;
      const consolidatedProject = activeGroup.projects[0];
      if (!consolidatedProject) return null;

      // Dynamically get periods from calendar engine
      const projectCal = getProjectCalendar(consolidatedProject, globalSettings.calendarType);
      let activePeriods = projectCal.periods;
      if (isSHS && duration === 'One Semester') {
        const semPeriods = semester === 'Semester 2'
          ? QUARTER_CALENDAR.semester2Periods
          : QUARTER_CALENDAR.semester1Periods;
        activePeriods = activePeriods.filter(p => semPeriods.includes(p.id));
      }

      // Lookup grade for student in a specific period
      const getStudentPeriodGrade = (proj: Project, lrn: string, name: string, qId: string) => {
        const normName = name.trim().toUpperCase();
        const s = proj.students.find(x =>
          (lrn && lrn !== '123456789123' && x.lrn === lrn) ||
          x.name.trim().toUpperCase() === normName
        );
        if (!s) return null;
        const r = computeProjectStudentGrade(proj, s.id, globalSettings.subjects, qId);
        return r.hasScores ? r.finalGrade : null;
      };

      // Roster compilation
      const fullRoster = (() => {
        const studentsMap = new Map<string, Student>();
        const isDummyLrn = (l?: string) => !l || l === '123456789123' || l.startsWith('123');
        activeGroup.projects.forEach(proj => {
          proj.students.forEach(st => {
            const key = (st.lrn && !isDummyLrn(st.lrn) && st.lrn.trim().length >= 8)
              ? \`\${st.name.trim().toUpperCase()}_\${st.lrn.trim()}\`
              : st.name.trim().toUpperCase();
            if (!studentsMap.has(key)) studentsMap.set(key, st);
          });
        });
        let list = Array.from(studentsMap.values());
        if (list.length > 1) list = list.filter(s => !(s.lrn === '123456789123' && s.name.toUpperCase().includes('DELA CRUZ')));
        const isM = (s: Student) => { const sx = (s.sex || '').trim().toLowerCase(); return sx === 'male' || sx === 'm' || sx === 'boy' || sx.startsWith('m'); };
        const isF = (s: Student) => { const sx = (s.sex || '').trim().toLowerCase(); return sx === 'female' || sx === 'f' || sx === 'girl' || sx.startsWith('f'); };
        const m = list.filter(isM).sort((a, b) => a.name.localeCompare(b.name));
        const f = list.filter(isF).sort((a, b) => a.name.localeCompare(b.name));
        const unspec = list.filter(s => !isM(s) && !isF(s)).sort((a, b) => a.name.localeCompare(b.name));
        return { males: m, females: f, unspec, all: [...m, ...f, ...unspec] };
      })();

      const passingGradeVal = consolidatedProject.passingGrade ?? 75;
      const filterList = (arr: Student[]) => {
        if (!consolidatedSearch.trim()) return arr;
        const q = consolidatedSearch.toLowerCase();
        return arr.filter(s => s.name.toLowerCase().includes(q) || (s.lrn && s.lrn.includes(q)));
      };
      const filteredMales = filterList(fullRoster.males);
      const filteredFemales = filterList(fullRoster.females);
      const filteredUnspec = filterList(fullRoster.unspec);

      // Stats
      let gradedCount = 0, sumGrades = 0, passingCount = 0, highestGrade = 0, lowestGrade = 100;
      let outstanding = 0, verySat = 0, sat = 0, fairlySat = 0, didNotMeet = 0;
      fullRoster.all.forEach(st => {
        const grades = activePeriods.map(p => getStudentPeriodGrade(consolidatedProject, st.lrn, st.name, p.id));
        const qs = grades.filter(v => v !== null) as number[];
        if (qs.length > 0) {
          const fg = Math.round(qs.reduce((a, b) => a + b, 0) / qs.length);
          sumGrades += fg; gradedCount++;
          if (fg >= passingGradeVal) passingCount++;
          if (fg > highestGrade) highestGrade = fg;
          if (fg < lowestGrade) lowestGrade = fg;
          if (fg >= 90) outstanding++;
          else if (fg >= 85) verySat++;
          else if (fg >= 80) sat++;
          else if (fg >= 75) fairlySat++;
          else didNotMeet++;
        }
      });
      const meanFinalGrade = gradedCount > 0 ? Math.round(sumGrades / gradedCount) : 0;
      const passingRate = gradedCount > 0 ? Math.round((passingCount / gradedCount) * 100) : 0;

      const renderRosterRows = (list: Student[], sexColor: string, title: string) => (
        <>
          <tr className="bg-slate-100/40 text-[9px] font-sans font-black text-slate-500 border-b border-slate-200">
            <td colSpan={3 + activePeriods.length + 2} className={\`py-2 px-4 text-left uppercase tracking-wider font-extrabold \${sexColor}\`}>
              {title} ({list.length} learners)
            </td>
          </tr>
          {list.length === 0 ? (
            <tr><td colSpan={3 + activePeriods.length + 2} className="py-3 text-center text-xs italic text-slate-400">No learners found.</td></tr>
          ) : (
            list.map((st, idx) => {
              const grades = activePeriods.map(p => getStudentPeriodGrade(consolidatedProject, st.lrn, st.name, p.id));
              const qs = grades.filter(v => v !== null) as number[];
              const finalG = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
              const remark = finalG !== null ? (finalG >= passingGradeVal ? 'Passed' : 'Needs Intervention') : '-';
              return (
                <tr key={st.id} className="hover:bg-slate-50/20 text-slate-700">
                  <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-semibold text-slate-400">{idx + 1}</td>
                  <td className="py-1.5 px-4 border-r border-slate-200 text-left font-sans font-extrabold uppercase text-slate-900">{st.name}</td>
                  <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold tracking-wider text-slate-500 text-[10px]">{st.lrn}</td>
                  {grades.map((g, i) => (
                    <td key={activePeriods[i].id} className="py-1.5 px-1.5 border-r border-slate-200 text-center text-slate-900 font-semibold">
                      {g !== null ? g : '-'}
                    </td>
                  ))}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-indigo-50/15 font-black text-xs text-indigo-750">{finalG !== null ? finalG : '-'}</td>
                  <td className={\`py-1.5 px-3 text-center font-sans font-black text-[9px] uppercase \${remark === 'Passed' ? 'text-emerald-600' : remark === '-' ? 'text-slate-400' : 'text-rose-500'}\`}>{remark}</td>
                </tr>
              );
            })
          )}
        </>
      );

      return (
        <div className="space-y-6 animate-fade-in print:animate-none pb-12 bg-white text-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto print:p-0 print:m-0 print:border-0 print:shadow-none print:max-w-full print:rounded-none print:pb-0 print:space-y-4 print:block">
          {/* Print Toolbar */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-150 p-3.5 rounded-2xl print:hidden">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Print Preview Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer">
                <Printer className="h-3.5 w-3.5" /> Execute Print
              </button>
              <button onClick={() => { setPrintFriendly(false); setSelectedConsolidatedClass(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-black uppercase rounded-lg cursor-pointer">
                Exit Preview
              </button>
            </div>
          </div>

          {/* Report */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900/15">
            <h1 className="text-sm font-black tracking-wider uppercase text-slate-900">{activeGroup.schoolName}</h1>
            <p className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
              Consolidated Report of Learner Grades • S.Y. {activeGroup.schoolYear}
            </p>
            <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">
              Subject: {activeGroup.subject} | Grade & Section: {activeGroup.gradeLevel} - {activeGroup.section}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs print:border-0 print:overflow-visible">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-sans text-slate-500 uppercase tracking-wider font-black text-center">
                    <th className="py-2.5 px-4 text-left border-r border-slate-200 bg-slate-100/50 font-bold w-12">No.</th>
                    <th className="py-2.5 px-4 text-left border-r border-slate-200 bg-slate-100/50 font-bold min-w-[180px]">Learner Name</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-slate-100/50 font-bold w-28">LRN</th>
                    {activePeriods.map(p => (
                      <th key={p.id} className="py-2.5 px-1.5 text-center border-r border-slate-200 bg-indigo-50 text-indigo-700 font-black w-12">{p.label}</th>
                    ))}
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-indigo-100/30 text-indigo-800 font-black w-16">Final</th>
                    <th className="py-2.5 px-3 text-center bg-slate-50 font-black w-28">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
                  {renderRosterRows(filteredMales, 'text-indigo-700', 'Males')}
                  {renderRosterRows(filteredFemales, 'text-indigo-700', 'Females')}
                  {filteredUnspec.length > 0 && renderRosterRows(filteredUnspec, 'text-amber-700', 'Unspecified Sex')}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats + Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase">Class Performance Summary</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Graded Population</span>
                  <strong className="text-sm font-black text-slate-850">{gradedCount} <span className="text-[9px] text-slate-450 font-semibold">/ {fullRoster.all.length} total</span></strong>
                </div>
                <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Class Mean Grade</span>
                  <strong className="text-sm font-black text-indigo-650 font-mono">{meanFinalGrade}</strong>
                </div>
                <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Passing Rate</span>
                  <strong className="text-sm font-black text-emerald-650 font-mono">{passingRate}%</strong>
                </div>
                <div className="p-2.5 bg-white border border-slate-100 rounded-lg">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block">Sex Breakdown</span>
                  <span className="text-[11px] font-bold text-slate-650">{fullRoster.males.length}M • {fullRoster.females.length}F</span>
                </div>
              </div>
            </div>
            <div className="border border-dashed border-slate-200 rounded-xl p-5 flex flex-col justify-between min-h-44">
              <div>
                <h4 className="text-[9px] font-sans font-black text-slate-400 tracking-wider uppercase mb-1">Verification Signatures</h4>
                <p className="text-[8.5px] text-slate-400 leading-relaxed">This grade sheet conforms with DepEd regulations.</p>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[9px]">
                <div className="space-y-1">
                  <div className="border-b border-slate-900/40 pb-1 font-bold text-slate-900 uppercase">{globalSettings.teacherName}</div>
                  <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Subject Teacher</div>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-slate-900/40 pb-1 text-slate-400 italic">_______________________</div>
                  <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">School Principal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
`;

const newLines = [...beforeLines, ...newBlock.split('\n'), ...afterLines];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Done. Old Q1-Q4 print block replaced with dynamic activePeriods version.');
