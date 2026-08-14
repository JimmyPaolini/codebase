import { Injectable } from "@nestjs/common";

import {
  CONFORMETRY_NX_PLUGIN_NAME,
  DEFAULT_CONFIGURATION_PATH,
  DEFAULT_VALIDATE_TARGET_NAME,
  PLUGIN_OPTION_NAMES,
} from "./options.constants";

import type { ConformetryPluginOptions } from "./options.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Narrows the untyped options object Nx hands a plugin.
 *
 * Nx passes whatever the consumer wrote in `nx.json` with no validation, so
 * every field is checked before use rather than cast. A bad value falls back
 * to its default: a typo in a target name should not stop the project graph
 * from being built.
 */
@Injectable()
/* v8 ignore stop */
export class OptionsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /** Reads a string field from an untrusted record, or `undefined`. */
  private readString(args: {
    key: string;
    options: Record<string, unknown>;
  }): string | undefined {
    const value = args.options[args.key];

    return typeof value === "string" && value !== "" ? value : undefined;
  }

  // 🌎 Public Methods

  /**
   * Reads this plugin's configured path out of a workspace's `nx.json`.
   *
   * Nx passes plugin options to `createNodes` and to executors, but not to a
   * global sync generator or to anything run outside Nx entirely, such as the
   * install-time bootstrap. Those read the registration themselves rather than
   * assuming the default, so a workspace that keeps its configuration
   * somewhere other than the root is not silently emitted from nothing.
   */
  public resolveConfigurationPath(nxConfiguration: unknown): string {
    if (typeof nxConfiguration !== "object" || nxConfiguration === null) {
      return DEFAULT_CONFIGURATION_PATH;
    }

    const { plugins }: { plugins?: unknown } = { ...nxConfiguration };

    if (!this.isUnknownArray(plugins)) {
      return DEFAULT_CONFIGURATION_PATH;
    }

    for (const entry of plugins) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }

      const { options, plugin }: { options?: unknown; plugin?: unknown } = {
        ...entry,
      };

      if (plugin === CONFORMETRY_NX_PLUGIN_NAME) {
        return this.resolvePluginOptions(options).configurationPath;
      }
    }

    return DEFAULT_CONFIGURATION_PATH;
  }

  /**
   * Extracts the generator inputs from an Nx options object.
   *
   * Nx hands a generator every option the consumer passed, including the ones
   * that configure this plugin rather than the generator. Those are dropped so
   * a template placeholder is never accidentally filled with a config path,
   * and non-string values are dropped because substitutions are text.
   */
  public resolveGeneratorInputs(
    options: unknown,
  ): Record<string, string | undefined> {
    if (typeof options !== "object" || options === null) {
      return {};
    }

    const inputs: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries({ ...options })) {
      if (PLUGIN_OPTION_NAMES.includes(key) || typeof value !== "string") {
        continue;
      }

      inputs[key] = value;
    }

    return inputs;
  }

  /** Resolves the effective plugin options from an untrusted value. */
  public resolvePluginOptions(options: unknown): ConformetryPluginOptions {
    if (typeof options !== "object" || options === null) {
      return {
        configurationPath: DEFAULT_CONFIGURATION_PATH,
        validateTargetName: DEFAULT_VALIDATE_TARGET_NAME,
      };
    }

    const record: Record<string, unknown> = { ...options };

    return {
      configurationPath:
        this.readString({ key: "configurationPath", options: record }) ??
        DEFAULT_CONFIGURATION_PATH,
      validateTargetName:
        this.readString({ key: "validateTargetName", options: record }) ??
        DEFAULT_VALIDATE_TARGET_NAME,
    };
  }
}
