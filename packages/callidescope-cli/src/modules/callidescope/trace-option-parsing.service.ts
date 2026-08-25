import { Injectable } from "@nestjs/common";

import type { CallidescopeOutputFormat } from "@callidescope/configuration";

/**
 * Parses the workspace-scoping flags `depth` and `breadth` share with the
 * main `callidescope` command.
 *
 * `nest-commander` reads `@Option` metadata from whichever class the
 * decorator is written on, so `depth` and `breadth` each still declare their
 * own `--directories`, `--config`, and `--format` options — this only holds
 * the parsing rule so the two do not each write it out by hand.
 */
@Injectable()
export class TraceOptionParsingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parses `--config`. */
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parses `--directories`, a comma-separated list of project directories.
   *
   * Kept relative rather than resolved here: each entry is later resolved
   * against the workspace root, which is always the working directory, so
   * resolving here as well would only make a relative entry ambiguous about
   * which root it was ever relative to.
   */
  public parseDirectories(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((directory) => directory.trim())
          .filter(Boolean);
  }

  /**
   * Parses `--format`, which decides what a lookup prints.
   *
   * Anything unrecognized reads as markdown rather than failing: this decides
   * how a result is shown, and refusing to show it over a misspelled flag
   * helps nobody.
   */
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    if (value === "json" || value === "mermaid") {
      return value;
    }

    return "markdown";
  }
}
