// 🏷️ Types

import type {
  LoadConfigurationArguments,
  LoadedCallidescopeConfiguration,
  LoadedCallidescopeConfigurationFile,
} from "./configuration.types";

/**
 * The two reads the collaborators behind `ConfigurationService` need from a
 * configuration file loader.
 *
 * Narrow on purpose, and passed in rather than injected: it is what leaves the
 * whole layer replaceable by a double at its one public surface, without the
 * classes behind that surface pointing at each other. The overload pair
 * mirrors the loader's own — naming a path guarantees one back.
 *
 * `ConfigurationService` hands over itself rather than the loader it holds.
 * The two satisfy this interface identically and measure the same depth, so
 * what the choice decides is only whether a caller stubbing the one public
 * object has stubbed what these collaborators read. It has, which is the
 * property publishing one object exists to give.
 */
export interface ConfigurationFileReader {
  findConfigurationFileAt(directory: string): string | undefined;
  loadConfigurationFile(
    args: LoadConfigurationArguments & { configurationPath: string },
  ): Promise<LoadedCallidescopeConfigurationFile>;
  loadConfigurationFile(
    args?: LoadConfigurationArguments,
  ): Promise<LoadedCallidescopeConfiguration>;
}
