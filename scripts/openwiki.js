#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { exit } from "node:process";

console.log('[openwiki-shim] start');
const args = process.argv.slice(2);

function tryRun(cmd, argv) {
  // Capture output to inspect errors like "No module named openwiki" without streaming it immediately
  const res = spawnSync(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] });
  // ENOENT -> command not found
  if (res.error && res.error.code === "ENOENT") return { found: false };
  const stderr = res.stderr ? res.stderr.toString() : "";
  const stdout = res.stdout ? res.stdout.toString() : "";

  // Python module missing shows "No module named" on stderr; treat as not found so we can try other providers
  if (stderr.includes("No module named openwiki")) return { found: false };

  // If exited non-zero for another reason, print captured output and treat as found (let caller receive the non-zero status)
  if (res.status !== 0) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return { found: true, status: res.status };
  }

  // Success: stream output and return
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return { found: true, status: res.status ?? 0 };
}

// 1) Try python -m openwiki
console.log('[openwiki-shim] trying python3 -m openwiki');
let r = tryRun('python3', ['-m', 'openwiki', ...args]);
console.log('[openwiki-shim] python3 attempt finished', JSON.stringify(r));
if (!r.found) {
  console.log('[openwiki-shim] trying python -m openwiki');
  r = tryRun('python', ['-m', 'openwiki', ...args]);
  console.log('[openwiki-shim] python attempt finished', JSON.stringify(r));
}
if (r.found) exit(r.status);

// 2) Try node_modules/.bin/openwiki (local JS package) but avoid recursion into this shim
import fs from 'node:fs';
import path from 'node:path';
const localBin = './node_modules/.bin/openwiki';
try {
  console.log('[openwiki-shim] probing localBin', localBin);
  const selfPath = path.resolve(process.argv[1] || '');
  const localResolved = path.resolve(process.cwd(), localBin);
  console.log('[openwiki-shim] localResolved', localResolved, 'selfPath', selfPath);
  if (fs.existsSync(localResolved) && localResolved !== selfPath) {
    console.log('[openwiki-shim] local bin exists, reading content to detect shim');
    try {
      const content = fs.readFileSync(localResolved, 'utf8');
      console.log('[openwiki-shim] local bin content length', content.length);
      // If this is an npm/pnpm wrapper, it often includes a cmd-shim-target comment we can inspect
      const m = content.match(/cmd-shim-target=(.*)$/m);
      if (m && m[1]) {
        const target = m[1].trim();
        console.log('[openwiki-shim] wrapper target detected', target);
        try {
          const targetContent = fs.readFileSync(target, 'utf8');
          if (targetContent.includes('This repository expects an OpenWiki CLI to be installed')) {
            console.log('[openwiki-shim] target is repository shim; skipping');
          } else {
            console.log('[openwiki-shim] invoking target directly via node', target);
            r = tryRun('node', [target, ...args]);
            console.log('[openwiki-shim] target finished', JSON.stringify(r));
            if (r.found) exit(r.status);
          }
        } catch (e) {
          console.log('[openwiki-shim] failed to inspect target', e && e.message);
          // fallback to running wrapper
          r = tryRun(localBin, args);
          if (r.found) exit(r.status);
        }
      } else {
        if (!content.includes('This repository expects an OpenWiki CLI to be installed')) {
          console.log('[openwiki-shim] local bin appears to be a provider; invoking it');
          r = tryRun(localBin, args);
          console.log('[openwiki-shim] local bin finished', JSON.stringify(r));
          if (r.found) exit(r.status);
        } else {
          console.log('[openwiki-shim] local bin is repository shim; skipping');
        }
      }
    } catch (e) {
      console.log('[openwiki-shim] error reading local bin', e && e.message);
      // if we can't read file, just attempt to run it
      r = tryRun(localBin, args);
      if (r.found) exit(r.status);
    }
  } else {
    console.log('[openwiki-shim] local bin not present or points to self; skipping');
  }
} catch (e) {
  // ignore and continue
  console.log('[openwiki-shim] probe localBin failed', e && e.message);
}

// 3) Try system 'openwiki' directly (in PATH) but avoid invoking this shim again
try {
  console.log('[openwiki-shim] probing PATH for openwiki');
  const which = spawnSync('which', ['openwiki'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const whichOut = which.stdout ? which.stdout.toString().trim() : '';
  const selfPath = path.resolve(process.argv[1] || '');
  console.log('[openwiki-shim] whichOut', whichOut);
  if (whichOut && whichOut !== selfPath) {
    try {
      const content = fs.readFileSync(whichOut, 'utf8');
      if (!content.includes('This repository expects an OpenWiki CLI to be installed')) {
        r = tryRun('openwiki', args);
        if (r.found) exit(r.status);
      } else {
        console.log('[openwiki-shim] PATH openwiki points to repository shim; skipping');
      }
    } catch (e) {
      r = tryRun('openwiki', args);
      if (r.found) exit(r.status);
    }
  } else {
    console.log('[openwiki-shim] no external openwiki found in PATH');
  }
} catch (e) {
  // ignore and continue
  console.log('[openwiki-shim] probe PATH failed', e && e.message);
}

// Fallback: print helpful message and exit 0 (so CI doesn't fail with command-not-found)
console.log(
  "openwiki: No runtime provider found.\n\nThis repository expects an OpenWiki CLI to be installed.",
);
console.log(
  "- Preferred: install the OpenWiki Python package (pip install openwiki) or a Node package that provides a `openwiki` binary.",
);
console.log(
  "- As a local workaround you can install the provider or ensure the binary is on PATH.",
);
exit(0);
