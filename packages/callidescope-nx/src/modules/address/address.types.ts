// 🏷️ Types

import type { CallidescopeOutputFormat } from "@callidescope/configuration";

/** Arguments for looking one callable up inside a resolved selection. */
export interface LookupArguments {
  /** `<file>#<qualified-name>`, the form every callidescope stack prints. */
  readonly address: string;
  readonly configurationPath?: string | undefined;
  /** Workspace-relative directories the lookup resolves the address against. */
  readonly directories: readonly string[];
  readonly format?: CallidescopeOutputFormat | undefined;
}

/** What one lookup produced. */
export interface LookupResult {
  /** False when the address named nothing the run traced. */
  readonly ok: boolean;
  /** The rendered report, or the reason the address could not be resolved. */
  readonly report: string;
}
