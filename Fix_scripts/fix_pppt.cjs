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

const fixPppt = (relPath) => replaceInFile(relPath, [[/pppt/g, 'ppt']]);
const files = [
  'src/data/seedData.ts',
  'src/utils.ts',
  'src/components/ClassManagerView.tsx',
  'src/components/SettingsView.tsx',
  'src/components/DashboardView.tsx',
  'src/context/AppContext.tsx'
];
files.forEach(fixPppt);

// And we still had `"QE"` instead of `"QSTE"` somewhere in ClassManagerView.tsx?
replaceInFile('src/components/ClassManagerView.tsx', [
  [/"QE"/g, '"QSTE"'],
  [/'QE'/g, "'QSTE'"]
]);

replaceInFile('src/utils.ts', [
  [/"QE"/g, '"QSTE"']
]);
