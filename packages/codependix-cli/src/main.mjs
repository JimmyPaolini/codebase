#!/usr/bin/env node
// The `codependix` command.
//
// The SWC hooks are registered before the TypeScript sources are imported, and
// the import is dynamic so that ordering holds. @swc-node is used rather than
// Node's own type stripping because stripping erases the decorator metadata
// this package's NestJS constructor injection reads.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);

await import("./main.ts");
