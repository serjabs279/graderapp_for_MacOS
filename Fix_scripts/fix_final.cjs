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
  [/pppt/g, 'ppt']
]);
replaceInFile('src/components/DashboardView.tsx', [
  [/pppt/g, 'ppt']
]);
replaceInFile('src/utils.ts', [
  [/pppt/g, 'ppt'],
  [/ww:/g, 'wow:'],
  [/pt:/g, 'ppt:'],
  [/qa:/g, 'qste:'],
  [/\.ww/g, '.wow'],
  [/\.pt/g, '.ppt'],
  [/\.qa/g, '.qste'],
  [/"QE"/g, '"QSTE"']
]);
replaceInFile('src/context/AppContext.tsx', [
  [/\.qa/g, '.qste']
]);

// Wait, I should also replace `.ww` etc in AppContext if SHSProfile is there.
replaceInFile('src/context/AppContext.tsx', [
  [/\.ww/g, '.wow'],
  [/\.pt/g, '.ppt'],
  [/\.qa/g, '.qste']
]);

// Let's check SHSProfile in types.ts
replaceInFile('src/types.ts', [
  [/ww: number/g, 'wow: number'],
  [/pt: number/g, 'ppt: number'],
  [/qa: number/g, 'qste: number']
]);
