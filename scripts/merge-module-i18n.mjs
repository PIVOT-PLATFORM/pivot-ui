// Merge each activatable module's translation catalogue into the shell's global
// Transloco catalogue at build time.
//
// The shell loads a single global `/assets/i18n/{lang}.json` (no per-module Transloco
// scope). Each `@pivot-platform/{module}-ui` package ships its own translations under
// `i18n/{lang}.json` (see each module repo's ng-package.json `assets`). This postbuild
// step reads those from `node_modules` and deep-merges them into the built catalogue in
// `dist`, so module labels resolve without hand-copying keys into the shell.
//
// Runs as the `postbuild` npm script — i.e. after `ng build` has copied the shell's own
// base catalogue (public/assets/i18n) into dist. The shell's own keys always win on a
// leaf conflict; a module that ships no i18n is skipped (graceful — labels fall back to
// raw keys, exactly as before this mechanism existed).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['fr', 'en'];
const MODULES = ['collaboratif-ui', 'agilite-ui'];
// Dev-harness-only namespaces shipped by a module but irrelevant to the shell.
const SKIP_TOP = new Set(['app']);

const distDir = join(root, 'dist/frontend/browser/assets/i18n');
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** Add keys from `src` into `dst`; `dst` (shell) wins on a leaf conflict. */
function deepMerge(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (!(k in dst)) dst[k] = v;
    else if (isObj(dst[k]) && isObj(v)) deepMerge(dst[k], v);
  }
  return dst;
}

let failed = false;
for (const lang of LANGS) {
  const target = join(distDir, `${lang}.json`);
  if (!existsSync(target)) {
    console.warn(`[i18n-merge] base catalogue missing: ${target} — skipped`);
    continue;
  }
  const base = JSON.parse(readFileSync(target, 'utf8'));
  let merged = 0;
  for (const mod of MODULES) {
    const src = join(root, 'node_modules', '@pivot-platform', mod, 'i18n', `${lang}.json`);
    if (!existsSync(src)) {
      console.warn(`[i18n-merge] ${mod} ships no ${lang} catalogue — skipped (labels will fall back to raw keys)`);
      continue;
    }
    try {
      const cat = JSON.parse(readFileSync(src, 'utf8'));
      for (const top of SKIP_TOP) delete cat[top];
      deepMerge(base, cat);
      merged++;
    } catch (err) {
      console.error(`[i18n-merge] failed to merge ${mod} (${lang}): ${err.message}`);
      failed = true;
    }
  }
  writeFileSync(target, JSON.stringify(base, null, 2) + '\n');
  console.log(`[i18n-merge] ${lang}: merged ${merged}/${MODULES.length} module catalogues`);
}

if (failed) process.exit(1);
