import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const styles = fs.readFileSync(path.join(root, 'src', 'Styles.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'App.html'), 'utf8');
const state = fs.readFileSync(path.join(root, 'dev', 'mock-state.json'), 'utf8');

const mock = `
<script>
  const __mockState = ${state};
  let __successHandler = () => {};
  let __failureHandler = () => {};
  const __runner = new Proxy({
    withSuccessHandler(handler) {
      __successHandler = handler;
      return __runner;
    },
    withFailureHandler(handler) {
      __failureHandler = handler;
      return __runner;
    }
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => {
        setTimeout(() => {
          try {
            const result = property === 'getAppState'
              ? structuredClone(__mockState)
              : structuredClone(__mockState);
            __successHandler(result);
          } catch (error) {
            __failureHandler(error);
          }
        }, 120);
      };
    }
  });
  window.google = { script: { run: __runner } };
</script>`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Partner Onboarding Autopilot — Local Preview</title>
    ${styles}
  </head>
  <body>
    <div id="app">
      <div class="boot"><div class="boot-mark">PC</div><p>Loading partner operations…</p></div>
    </div>
    <div id="toast" class="toast" aria-live="polite"></div>
    ${mock}
    ${app}
  </body>
</html>`;

const target = path.join(root, 'dev', 'preview.html');
fs.writeFileSync(target, html);
console.log(`Built ${target}`);
