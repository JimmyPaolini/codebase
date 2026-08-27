// 🛠️ Utilities

import { runAddressExecutor } from "../../modules/address/address.utilities";

import type { AddressExecutorOptions } from "../address.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Prints every call stack above and below one callable — every caller chain up to a root, every callee chain down to a leaf.
 *
 * The address is resolved against the target's own project and its Nx
 * dependencies rather than the whole workspace, which is both faster than the
 * `callidescope depth` command and the set the address actually belongs to.
 */
export default async function depthExecutor(
  options: AddressExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  return await runAddressExecutor({ context, kind: "depth", options });
}
