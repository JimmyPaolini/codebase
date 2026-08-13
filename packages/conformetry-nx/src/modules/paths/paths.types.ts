// 🏷️ Types

import type { Tree } from "@nx/devkit";

/** Arguments for deciding where a generator writes. */
export interface ResolveGenerationPathArguments {
  readonly configurationPath: string;
  /** The generator's own inputs, such as `project`, `module`, and `name`. */
  readonly inputs: Record<string, string | undefined>;
  readonly tree: Tree;
  readonly workspaceRoot: string;
}
