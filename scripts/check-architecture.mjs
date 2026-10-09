import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['app', 'components', 'lib', 'backend', 'scripts'];
const forbidden = [
  { label: 'Prisma client import', pattern: /@prisma\/client/ },
  { label: 'Prisma runtime import', pattern: /(?:from|require\()\s*['"][^'"]*prisma/ },
  { label: 'MongoDB connection string', pattern: /mongodb(?:\+srv)?:\/\//i },
  { label: 'MongoDB driver reference', pattern: /\bMongoClient\b|\bmongoose\b/ },
];

function filesUnder(path) {
  return readdirSync(path).flatMap(name => {
    const full = join(path, name);
    const info = statSync(full);
    if (info.isDirectory()) return filesUnder(full);
    return /\.(?:ts|tsx|js|mjs|py|json)$/.test(name) ? [full] : [];
  });
}

const sourcePaths = [
  'package.json',
  'middleware.ts',
  ...roots.flatMap(root => {
    try { return filesUnder(root); } catch { return []; }
  }),
];
const failures = [];
for (const path of sourcePaths) {
  let source;
  try { source = readFileSync(path, 'utf8'); } catch { continue; }
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) failures.push(path + ': ' + rule.label);
  }
}
if (failures.length) {
  console.error('Architecture guard failed:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('PASS: runtime source has no Prisma or MongoDB dependencies.');
