import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { CallidescopeOutputFormat } from "@callidescope/configuration";

/**
 * Parses the workspace-scoping flags `depth` and `breadth` share with the
 * main `callidescope` command.
 *
 * `nest-commander` reads `@Option` metadata from whichever class the
 * decorator is written on, so `depth` and `breadth` each still declare their
 * own `--directory`, `--config`, `--projects`, and `--format` options — this
 * only holds the parsing rule so the two do not each write it out by hand.
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
   * Parses `--directory`.
   *
   * Resolved rather than kept as written: everything downstream compares
   * absolute paths against this prefix to decide whether a file is part of
   * the traced code, and a relative root makes every one of those comparisons
   * fail — which reads as a workspace containing nothing at all.
   */
  public parseDirectory(value: string | undefined): string {
    return path.resolve(value ?? process.cwd());
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

  /** Parses `--projects`, a comma-separated list of Nx project names. */
  public parseProjects(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
  }
}
