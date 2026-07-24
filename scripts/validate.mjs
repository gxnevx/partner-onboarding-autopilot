import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceDirectory = path.join(root, 'src');
const files = fs.readdirSync(sourceDirectory);
const serverFiles = files.filter(file => file.endsWith('.gs'));
const clientFile = path.join(sourceDirectory, 'App.html');

for (const file of serverFiles) {
  const source = fs.readFileSync(path.join(sourceDirectory, file), 'utf8');
  new Function(source);
}

const clientSource = fs
  .readFileSync(clientFile, 'utf8')
  .replace(/^\s*<script>\s*/, '')
  .replace(/\s*<\/script>\s*$/, '');
new Function(clientSource);

const manifest = JSON.parse(
  fs.readFileSync(path.join(sourceDirectory, 'appsscript.json'), 'utf8'),
);

if (manifest.runtimeVersion !== 'V8') {
  throw new Error('Apps Script must use the V8 runtime.');
}

console.log(
  `Validated ${serverFiles.length} server files, App.html, and appsscript.json.`,
);
