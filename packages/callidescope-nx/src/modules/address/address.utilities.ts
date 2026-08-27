// 🛠️ Utilities

import {
  resolveAddressService,
  resolveOptionsService,
} from "../../plugin-context.utilities";
import { resolveExecutorScope } from "../plugin/plugin.utilities";

import type { AddressExecutorOptions } from "../../executors/address.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Runs one address lookup on behalf of the `depth` or `breadth` executor.
 *
 * The two differ in a single call, so the scoping, the refusals, and the
 * printing are stated once here rather than twice in the executors — which are
 * left thin enough to read as the declarations Nx treats them as.
 */
export async function runAddressExecutor(args: {
  context: ExecutorContext;
  kind: "breadth" | "depth";
  options: AddressExecutorOptions;
}): Promise<{ success: boolean }> {
  const { address } = args.options;

  if (address === undefined || address === "") {
    throw new Error(
      `The callidescope ${args.kind} executor needs an --address, as in "--address=src/foo.service.ts#FooService.bar".`,
    );
  }

  const scope = await resolveExecutorScope({
    context: args.context,
    label: args.kind,
    options: args.options,
  });
  const optionsService = await resolveOptionsService();
  const addressService = await resolveAddressService();
  const lookupArguments = {
    address,
    ...(args.options.configurationPath === undefined
      ? {}
      : { configurationPath: args.options.configurationPath }),
    directories: scope.directories,
    format: optionsService.readFormat(args.options.format),
  };
  const result =
    args.kind === "depth"
      ? await addressService.runDepth(lookupArguments)
      : await addressService.runBreadth(lookupArguments);

  // The report — or the reason the address resolved to nothing — is the
  // executor's product, so it goes to stdout either way.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
