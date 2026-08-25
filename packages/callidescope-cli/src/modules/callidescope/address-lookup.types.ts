// 🏷️ Types

import type {
  AddressCommandOptions,
  LocateOutcome,
} from "./callidescope.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";
import type { CallableAddressResolution } from "@callidescope/graph";

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
