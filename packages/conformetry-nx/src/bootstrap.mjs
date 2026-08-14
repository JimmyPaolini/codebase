#!/usr/bin/env node
// The `conformetry-nx-bootstrap` command, wired into a consumer's postinstall.
//
// The SWC hooks are registered before the TypeScript sources are imported, and
// the import is dynamic so that ordering holds. @swc-node is used rather than
// Node's own type stripping because stripping erases the decorator metadata
// this package's NestJS constructor injection reads, leaving every injected
// dependency `undefined` at runtime.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);

const { runBootstrapCli } = await import("./bootstrap.utilities.ts");

await runBootstrapCli(process.cwd());
