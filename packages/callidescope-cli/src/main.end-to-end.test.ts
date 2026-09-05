import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

/** This package's own `main.ts`, spawned the way the `start` target does. */
const ENTRY_POINT = path.resolve(import.meta.dirname, "main.ts");

/**
 * The TypeScript loader, as an absolute URL resolved from this file.
 *
 * The package's own `esm-register` entry registers the hook against the
 * working directory, and every run below sets that to a throwaway workspace
 * with no `node_modules` in it. Registering the resolved hook directly is
 * what makes the loader independent of where the command is run from.
 */
const LOADER_HOOK = import.meta.resolve("@swc-node/register/esm");

/**
 * The compiler options the spawned run reads.
 *
 * Not optional: NestJS constructor injection reads the metadata
 * `emitDecoratorMetadata` emits, and a loader falling back to its own
 * defaults produces a CLI whose every command is missing its dependencies.
 */
const LOADER_PROJECT = path.resolve(import.meta.dirname, "..", "tsconfig.json");

/**
 * Runs the `callidescope` command against a workspace, and returns its exit
 * code.
 *
 * A real process rather than a resolved command, because the exit code is the
 * whole subject: nest-commander's default handler writes a thrown error to
 * stderr and leaves the code at zero, which no in-process test of the command
 * can see.
 */
function runCallidescope(workspaceRoot: string): {
  output: string;
  status: null | number;
} {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(path.join(workspaceRoot, "register.mjs")).toString(),
      ENTRY_POINT,
      "callidescope",
      "--config",
      path.join(workspaceRoot, "callidescope.config.json"),
      "--check",
      "depth",
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, SWC_NODE_PROJECT: LOADER_PROJECT },
    },
  );

  return {
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

/** Writes a project holding one traceable source file. */
function writeReadableProject(workspaceRoot: string, name: string): void {
  const root = path.join(workspaceRoot, "packages", name);

  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { noLib: true, target: "es2022" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "src", "index.ts"),
    "export function entry(): void {}\n",
    "utf8",
  );
}

/**
 * Writes a project whose `tsconfig.json` names a compiler target TypeScript
 * rejects.
 *
 * The shape of the one committed in `codependix-examples`, which exists to be
 * unreadable and must stay that way.
 */
function writeUnreadableProject(workspaceRoot: string, name: string): void {
  const root = path.join(workspaceRoot, "packages", name);

  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "not-a-real-target" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "src", "index.ts"),
    "export function broken(): void {}\n",
    "utf8",
  );
}

/** Builds a throwaway workspace carrying the tool's default configuration. */
function writeWorkspace(): string {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "callidescope-exit-"));

  writeFileSync(
    path.join(workspaceRoot, "callidescope.config.json"),
    JSON.stringify({ limits: { maximumDepth: 6 } }),
    "utf8",
  );
  writeFileSync(
    path.join(workspaceRoot, "register.mjs"),
    `import { register } from "node:module";\nregister(${JSON.stringify(LOADER_HOOK)});\n`,
    "utf8",
  );

  return workspaceRoot;
}

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  describe("the exit code of a run that could not trace", () => {
    it("passes a workspace it traced without finding anything", () => {
      expect.hasAssertions();

      const workspaceRoot = writeWorkspace();

      writeReadableProject(workspaceRoot, "readable");

      expect(runCallidescope(workspaceRoot).status).toBe(0);
    });

    it("fails a workspace whose only project cannot be read", () => {
      expect.hasAssertions();

      // The regression. This used to print the parsing failure and exit 0,
      // so the depth gate passed for having traced nothing at all.
      const workspaceRoot = writeWorkspace();

      writeUnreadableProject(workspaceRoot, "broken");

      expect(runCallidescope(workspaceRoot).status).toBe(1);
    });

    it("fails a workspace holding one unreadable project among readable ones", () => {
      expect.hasAssertions();

      const workspaceRoot = writeWorkspace();

      writeReadableProject(workspaceRoot, "readable");
      writeUnreadableProject(workspaceRoot, "broken");

      const { output, status } = runCallidescope(workspaceRoot);

      // Traced, and then failed for the project it could not reach — rather
      // than abandoned at the first `tsconfig.json` it could not parse.
      expect(status).toBe(1);
      expect(output).toContain("Skipped projects it could not read");
    });
  });
});
