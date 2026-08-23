const fs = require('fs');
const path = require('path');

const replaceInFile = (relPath, replacements) => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (typeof from === 'string' ? content.includes(from) : from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
};

replaceInFile('src/components/ClassManagerView.tsx', [
  [/'QE' \| 'WOW' \| 'PPT'/g, "'QSTE' | 'WOW' | 'PPT'"],
  [/'QE' \| 'PPT' \| 'WOW'/g, "'QSTE' | 'PPT' | 'WOW'"],
  [/"QE" \| "PPT" \| "WOW"/g, '"QSTE" | "PPT" | "WOW"'],
  [/"QE" \| "WOW" \| "PPT"/g, '"QSTE" | "WOW" | "PPT"'],
  [/ppptPercentage/g, 'pptPercentage'],
  [/ppptRawSum/g, 'pptRawSum'],
  [/ppptMaxSum/g, 'pptMaxSum'],
  [/{ wow: number; pt: number; qa: number }/g, '{ wow: number; ppt: number; qste: number }']
]);

replaceInFile('src/utils.ts', [
  [/ww: /g, 'wow: '],
  [/pt: /g, 'ppt: '],
  [/qa: /g, 'qste: '],
  [/"QE"/g, '"QSTE"']
]);

replaceInFile('src/components/Sidebar.tsx', [
  [/\.quarter/g, '.lastActiveQuarter']
]);

replaceInFile('src/components/adviser/AwardeesTab.tsx', [
  [/type HonorsLabel = 'With Highest Honors' \| 'With High Honors' \| 'With Honors';/g, "type HonorsLabel = 'With Highest Honors' | 'With High Honors' | 'With Honors' | undefined;"]
]);
