// 🏷️ Types

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { CallableAddressResolution } from "@callidescope/graph";

/** Options `depth` and `breadth` accept, scoping a lookup to one workspace. */
export interface AddressCommandOptions {
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  /** `false` when `--no-interactive` opted out of prompting for a missing value. */
  readonly interactive?: boolean | undefined;
}

/** Arguments for resolving `depth` or `breadth`'s address argument. */
export interface LookupAddressArguments {
  readonly address: string;
  readonly options: AddressCommandOptions;
}

/** What resolving one address against a workspace produced. */
export interface LookupAddressOutcome {
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly located: LocateOutcome;
  readonly resolution: CallableAddressResolution;
}
