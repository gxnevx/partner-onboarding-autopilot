import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const target = path.join(root, 'dev', 'preview.html');

if (!fs.existsSync(target)) {
  throw new Error('Run pnpm preview:build first.');
}

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(fs.readFileSync(target));
});

server.listen(4173, '127.0.0.1', () => {
  console.log('Preview available at http://127.0.0.1:4173');
});
