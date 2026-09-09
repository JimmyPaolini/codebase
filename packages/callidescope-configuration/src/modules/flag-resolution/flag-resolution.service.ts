import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_OUTPUT_FORMATS,
  DEFAULT_OUTPUT_FORMAT,
} from "../configuration/configuration.constants";

import {
  buildUndeclaredDestinationMessage,
  buildUnknownFormatMessage,
} from "./flag-resolution.constants";

import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "../configuration/configuration.types";
import type {
  CallidescopeRunFlags,
  ResolvedRunFlags,
} from "./flag-resolution.types";

/**
 * Combines a command line with the configuration it was resolved against,
 * under one precedence rule.
 *
 * **The rule.** A flag that changes what a run judges or writes may only
 * override a value the configuration already declares. A flag that selects
 * mode or presentation is command-line only, because neither can make an
 * under-configured run legal.
 *
 * `--check` and `--write` are the mode flags and `--format` is the
 * presentation flag, so none of the three is merged into anything here — the
 * format is validated and handed back beside the configuration rather than
 * written into it. `--directories`, `--json`, and `--markdown` are overrides,
 * so each replaces exactly the field it names and leaves every neighboring
 * field as the configuration wrote it. `--config` never reaches this call at
 * all: it chooses the file the rest are resolved against.
 *
 * One service rather than a merge per command, because the four defects this
 * replaced were each a different command combining one flag with one field
 * its own way: an empty `--directories` beating the configured list, a
 * `--markdown` path discarding the heading and markers beside it, a `--json`
 * path discarding the configured indentation, and an unrecognized `--format`
 * rewritten to markdown instead of refused.
 */
@Injectable()
export class FlagResolutionService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Applies a path flag to one configured destination, and to nothing else.
   *
   * Spread over the configured object rather than resolved afresh from the
   * path: a destination carries a heading, a description, its anchors, and
   * its render and write hooks, and re-resolving from a path alone silently
   * replaced every one of them with a default.
   *
   * An undeclared destination is refused rather than invented, which is the
   * precedence rule itself: a flag may change where a declared report goes
   * and may not ask for a report the configuration never declared.
   */
  private resolveDestination<Destination extends { path: string }>(args: {
    configured: Destination | undefined;
    errors: string[];
    field: string;
    flag: string;
    flagged: string | undefined;
  }): Destination | undefined {
    if (args.flagged === undefined) {
      return args.configured;
    }

    if (args.configured === undefined) {
      args.errors.push(
        buildUndeclaredDestinationMessage({
          field: args.field,
          flag: args.flag,
        }),
      );

      return undefined;
    }

    return { ...args.configured, path: args.flagged };
  }

  /**
   * Reads the directories a run traces, preferring the flag when it named any.
   *
   * An empty list is absent rather than a scope: `--directories ""` and a
   * `--directories` nobody typed arrive here as the same value, and reading
   * either as "trace nothing" — or, as this used to, as "trace everything" in
   * defiance of a configuration that said otherwise — silently ignores the
   * configured scope.
   */
  private resolveDirectories(args: {
    configured: string[];
    flagged: readonly string[] | undefined;
  }): string[] {
    return args.flagged === undefined || args.flagged.length === 0
      ? args.configured
      : [...args.flagged];
  }

  // A deliberate misspelling: the example of a `--format` value nobody
  // recognizes, which is exactly what this refusal is about.
  // cspell:ignore mermiad
  /**
   * Reads `--format` into one of the formats a run can print.
   *
   * Anything else is refused rather than rewritten. A run that quietly
   * printed markdown for `--format mermiad` exited 0 having taught its reader
   * that the flag does nothing.
   */
  private resolveFormat(args: {
    errors: string[];
    flagged: string | undefined;
  }): CallidescopeOutputFormat {
    if (args.flagged === undefined) {
      return DEFAULT_OUTPUT_FORMAT;
    }

    const matched = CALLIDESCOPE_OUTPUT_FORMATS.find(
      (format) => format === args.flagged,
    );

    if (matched === undefined) {
      args.errors.push(buildUnknownFormatMessage(args.flagged));

      return DEFAULT_OUTPUT_FORMAT;
    }

    return matched;
  }

  // 🌎 Public Methods

  /**
   * Resolves a whole command line against one configuration.
   *
   * Every complaint is collected rather than thrown at the first one, so a
   * command line with two mistakes in it is two mistakes to fix rather than
   * two runs. Nothing has been traced or written by the time this returns, so
   * a caller that finds `errors` non-empty can refuse with the checkout
   * untouched.
   */
  public resolveRunFlags(args: {
    configuration: ResolvedCallidescopeConfiguration;
    flags: CallidescopeRunFlags;
  }): ResolvedRunFlags {
    const { configuration, flags } = args;
    const errors: string[] = [];
    const format = this.resolveFormat({ errors, flagged: flags.format });

    return {
      configuration: {
        ...configuration,
        directories: this.resolveDirectories({
          configured: configuration.directories,
          flagged: flags.directories,
        }),
        write: {
          ...configuration.write,
          json: this.resolveDestination({
            configured: configuration.write.json,
            errors,
            field: "write.json",
            flag: "--json",
            flagged: flags.json,
          }),
          markdown: this.resolveDestination({
            configured: configuration.write.markdown,
            errors,
            field: "write.markdown",
            flag: "--markdown",
            flagged: flags.markdown,
          }),
        },
      },
      errors,
      format,
    };
  }
}
