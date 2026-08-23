const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/DashboardView.tsx',
  'src/components/ClassManagerView.tsx',
  'src/components/adviser/SF9RatingModal.tsx',
  'src/utils/pdfExport.ts',
  'src/utils/adviser/sf9Export.ts'
];

for (const relPath of filesToUpdate) {
  const filePath = path.join(__dirname, relPath);
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert imports at the top
  if (!content.includes('calendar/academicCalendar')) {
    const importPath = relPath.includes('adviser/') ? '../../calendar/academicCalendar' : '../calendar/academicCalendar';
    if (content.startsWith('import React')) {
      content = content.replace(/^(import.*?;)/m, `$1\nimport { getCalendar, getFirstPeriod } from '${importPath}';`);
    } else if (content.startsWith('import')) {
      content = content.replace(/^(import.*?;)/m, `$1\nimport { getCalendar, getFirstPeriod } from '${importPath}';`);
    } else {
      content = `import { getCalendar, getFirstPeriod } from '${importPath}';\n` + content;
    }
  }

  // DashboardView specific logic for initial state
  if (relPath.includes('DashboardView.tsx')) {
    content = content.replace(/useState\('1st Quarter'\)/g, "useState(getFirstPeriod())");
    content = content.replace(/setQuarter\('1st Quarter'\)/g, "setQuarter(getFirstPeriod())");
    content = content.replace(/quarter !== '1st Quarter' && quarter !== '2nd Quarter'/g, "quarter !== getCalendar().periods[0]?.id && quarter !== getCalendar().periods[1]?.id");
    content = content.replace(/\|\| '1st Quarter'/g, "|| getFirstPeriod()");
    content = content.replace(/'1st Quarter'/g, "(getCalendar().periods[0]?.id || '1st Quarter')");
    content = content.replace(/'2nd Quarter'/g, "(getCalendar().periods[1]?.id || '2nd Quarter')");
    content = content.replace(/'3rd Quarter'/g, "(getCalendar().periods[2]?.id || '3rd Quarter')");
    content = content.replace(/'4th Quarter'/g, "(getCalendar().periods[3]?.id || '4th Quarter')");
  }

  // ClassManagerView
  if (relPath.includes('ClassManagerView.tsx')) {
    content = content.replace(/\|\| '1st Quarter'/g, "|| getFirstPeriod()");
  }

  // SF9RatingModal
  if (relPath.includes('SF9RatingModal.tsx')) {
    content = content.replace(/const quartersList = \['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'\];/g, "const quartersList = getCalendar().periods.map(p => p.id);");
  }

  // pdfExport
  if (relPath.includes('pdfExport.ts')) {
    content = content.replace(/\|\| '1st Quarter'/g, "|| getFirstPeriod()");
    content = content.replace(/'1st Quarter'/g, "(getCalendar().periods[0]?.id || '1st Quarter')");
  }

  // sf9Export
  if (relPath.includes('sf9Export.ts')) {
    content = content.replace(/const quarters = \['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'\];/g, "const quarters = getCalendar().periods.map(p => p.id);");
    content = content.replace(/subj\.quarters\['1st Quarter'\]/g, "subj.quarters[getCalendar().periods[0]?.id as string]");
    content = content.replace(/s\.quarters\['1st Quarter'\]/g, "s.quarters[getCalendar().periods[0]?.id as string]");
    content = content.replace(/s\.quarters\['2nd Quarter'\]/g, "s.quarters[getCalendar().periods[1]?.id as string]");
    content = content.replace(/'1st Quarter'/g, "getCalendar().periods[0]?.id as string");
    content = content.replace(/'2nd Quarter'/g, "getCalendar().periods[1]?.id as string");
    content = content.replace(/'3rd Quarter'/g, "getCalendar().periods[2]?.id as string");
    content = content.replace(/'4th Quarter'/g, "getCalendar().periods[3]?.id as string");
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Done replacement');
