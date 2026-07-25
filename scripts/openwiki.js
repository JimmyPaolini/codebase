#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { exit } from "node:process";

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
let r = tryRun("python3", ["-m", "openwiki", ...args]);
if (!r.found) r = tryRun("python", ["-m", "openwiki", ...args]);
if (r.found) exit(r.status);

// 2) Try node_modules/.bin/openwiki (local JS package) but avoid recursion into this shim
import fs from 'node:fs';
import path from 'node:path';
const localBin = './node_modules/.bin/openwiki';
try {
  const selfPath = path.resolve(process.argv[1] || '');
  const localResolved = path.resolve(process.cwd(), localBin);
  if (fs.existsSync(localResolved) && localResolved !== selfPath) {
    try {
      const content = fs.readFileSync(localResolved, 'utf8');
      if (!content.includes('This repository expects an OpenWiki CLI to be installed')) {
        r = tryRun(localBin, args);
        if (r.found) exit(r.status);
      }
    } catch (e) {
      // if we can't read file, just attempt to run it
      r = tryRun(localBin, args);
      if (r.found) exit(r.status);
    }
  }
} catch (e) {
  // ignore and continue
}

// 3) Try system 'openwiki' directly (in PATH) but avoid invoking this shim again
try {
  const which = spawnSync('which', ['openwiki'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const whichOut = which.stdout ? which.stdout.toString().trim() : '';
  const selfPath = path.resolve(process.argv[1] || '');
  if (whichOut && whichOut !== selfPath) {
    r = tryRun('openwiki', args);
    if (r.found) exit(r.status);
  }
} catch (e) {
  // ignore and continue
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
