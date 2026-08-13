// 🛠️ Utilities

import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
  OUT_OF_SYNC_MESSAGE,
} from "../../modules/generator/generator.constants";
import { DEFAULT_CONFIGURATION_PATH } from "../../modules/options/options.constants";
import { resolveGeneratorService } from "../../plugin-context.utilities";

import type { SyncGeneratorOptions } from "./generator.types";
import type { Tree } from "@nx/devkit";

/**
 * Regenerates the workspace's conformetry generator plugin.
 *
 * Registered as a global sync generator, so `nx sync:check` fails whenever the
 * configuration declares a generator the emitted plugin does not, and `nx sync`
 * fixes it. Writing through the tree rather than to disk is what makes the
 * check possible: Nx compares the tree against the working copy.
 */
export default async function syncGenerator(
  tree: Tree,
  options?: SyncGeneratorOptions,
): Promise<{ outOfSyncMessage: string }> {
  const generatorService = await resolveGeneratorService();
  const files = await generatorService.emitPlugin({
    configurationPath: options?.configurationPath ?? DEFAULT_CONFIGURATION_PATH,
    outputPath: options?.outputPath ?? DEFAULT_OUTPUT_PATH,
    packageName: options?.packageName ?? DEFAULT_PACKAGE_NAME,
  });

  for (const file of files) {
    tree.write(file.filePath, file.content);
  }

  return { outOfSyncMessage: OUT_OF_SYNC_MESSAGE };
}
