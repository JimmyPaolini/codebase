#!/usr/bin/env node
// The `conformetry` command.
//
// The bin name is deliberately the bare word rather than the package name:
// `node_modules/.bin/conformetry` and `node_modules/conformetry` are different
// places, so this CLI and the emitted Nx generator collection can both be
// addressed as `conformetry` without contending for the same path.
//
// The SWC hooks are registered before the TypeScript sources are imported, and
// the import is dynamic so that ordering holds. @swc-node is used rather than
// Node's own type stripping because stripping erases the decorator metadata
// this package's NestJS constructor injection reads.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);

await import("./main.ts");
