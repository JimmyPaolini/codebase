#!/usr/bin/env node
// The `conformetry-nx-bootstrap` command, wired into a consumer's postinstall.
//
// Named `main.mjs` rather than for what it does because a `src/` root only
// admits entry-point names, and this is the package's one command entry point.
// The work it runs lives in `modules/generator/bootstrap.utilities.ts`.
//
// This is the one entry point in the workspace that still runs TypeScript
// sources through a loader, and deliberately so. Every other command-line
// package points its `bin` at emitted JavaScript, but this one cannot: it runs
// from a `postinstall`, which is before any build has happened and on a fresh
// clone `dist/` does not exist at all. A bin pointing into `dist/` would make
// `pnpm install` fail for everyone.
//
// The SWC hooks are registered before the TypeScript sources are imported, and
// the import is dynamic so that ordering holds. @swc-node is used rather than
// Node's own type stripping because stripping erases the decorator metadata
// this package's NestJS constructor injection reads, leaving every injected
// dependency `undefined` at runtime.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);

const { runBootstrapCli } =
  await import("./modules/generator/bootstrap.utilities.ts");

await runBootstrapCli(process.cwd());
