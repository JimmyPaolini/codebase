import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const destinationDirectory = path.resolve(workspaceRoot, "dist", "tarballs");

/** The list of publishable package directories in the publish set. */
export const publishSetProjects = [
  // Conformetry (8)
  "packages/ic-suite/conformetry/conformetry-cli",
  "packages/ic-suite/conformetry/conformetry-configuration",
  "packages/ic-suite/conformetry/conformetry-core",
  "packages/ic-suite/conformetry/conformetry-generation",
  "packages/ic-suite/conformetry/conformetry-languages",
  "packages/ic-suite/conformetry/conformetry-nx",
  "packages/ic-suite/conformetry/conformetry-output",
  "packages/ic-suite/conformetry/conformetry-validation",

  // Codometer (6)
  "packages/ic-suite/codometer/codometer-cli",
  "packages/ic-suite/codometer/codometer-configuration",
  "packages/ic-suite/codometer/codometer-core",
  "packages/ic-suite/codometer/codometer-languages",
  "packages/ic-suite/codometer/codometer-measurement",
  "packages/ic-suite/codometer/codometer-output",

  // Callidescope (6)
  "packages/ic-suite/callidescope/callidescope-cli",
  "packages/ic-suite/callidescope/callidescope-configuration",
  "packages/ic-suite/callidescope/callidescope-core",
  "packages/ic-suite/callidescope/callidescope-graph",
  "packages/ic-suite/callidescope/callidescope-nx",
  "packages/ic-suite/callidescope/callidescope-output",

  // Codependix (8)
  "packages/ic-suite/codependix/codependix-boundaries",
  "packages/ic-suite/codependix/codependix-cli",
  "packages/ic-suite/codependix/codependix-configuration",
  "packages/ic-suite/codependix/codependix-core",
  "packages/ic-suite/codependix/codependix-file-imports",
  "packages/ic-suite/codependix/codependix-nestjs-modules",
  "packages/ic-suite/codependix/codependix-nx-projects",
  "packages/ic-suite/codependix/codependix-output",
] as const;

/**
 * Packs every package in the publish set into `dist/tarballs`.
 *
 * @returns Array of generated tarball filenames.
 */
export function packPublishSet(): string[] {
  mkdirSync(destinationDirectory, { recursive: true });

  const filterArguments: string[] = [];
  for (const projectPath of publishSetProjects) {
    filterArguments.push("--filter", `./${projectPath}`);
  }

  execFileSync(
    "pnpm",
    [...filterArguments, "pack", "--pack-destination", destinationDirectory],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
    },
  );

  const packedTarballs = readdirSync(destinationDirectory).filter((file) =>
    file.endsWith(".tgz"),
  );

  return packedTarballs;
}

packPublishSet();
