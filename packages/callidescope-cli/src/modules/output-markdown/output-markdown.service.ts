import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { MissingMarkdownPathError } from "./output-markdown.errors";

import type {
  SyncAnchoredBlockArguments,
  SyncMarkdownArguments,
  SyncProjectReadmesArguments,
  WrapInAnchorsArguments,
} from "./output-markdown.types";
import type { MarkdownAnchorHelpers } from "@callidescope/configuration";

/**
 * Splices a generated block into a markdown file, between two anchors.
 *
 * Staleness is decided by comparing the extracted block against the
 * regenerated one, byte for byte. A file with no anchors, or no file at all,
 * counts as stale rather than as an error, so check mode reports the same thing
 * whether the block drifted or was never written.
 */
@Injectable()
export class OutputMarkdownService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the pattern matching everything between the two anchors. */
  private buildBlockPattern(
    destination: SyncAnchoredBlockArguments["destination"],
  ): RegExp {
    return new RegExp(
      String.raw`${this.escapePattern(destination.startMarker)}[\s\S]*?${this.escapePattern(destination.endMarker)}`,
    );
  }

  /** Escapes a marker so it can sit inside a pattern. */
  private escapePattern(value: string): string {
    return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }

  /** Reads a file, treating an absent one as empty. */
  private readExisting(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /** Builds the helpers a configured `write` function is handed. */
  public buildHelpers(args: SyncMarkdownArguments): MarkdownAnchorHelpers {
    const { content } = args;

    return {
      endMarker: args.destination.endMarker,
      startMarker: args.destination.startMarker,
      syncAnchoredBlock: (overrides): boolean =>
        this.syncAnchoredBlock({
          check: args.check,
          content: overrides?.content ?? content,
          destination: args.destination,
          path: overrides?.path,
        }),
      wrapInAnchors: (override): string =>
        this.wrapInAnchors({
          content: override ?? content,
          destination: args.destination,
        }),
    };
  }

  /** Syncs the configured markdown destination with the current findings. */
  public sync(args: SyncMarkdownArguments): boolean {
    const { content } = args;
    const custom = args.destination.write;

    if (custom === undefined) {
      return this.syncAnchoredBlock({
        check: args.check,
        content,
        destination: args.destination,
        path: args.destination.path,
      });
    }

    return custom({
      check: args.check,
      content,
      helpers: this.buildHelpers(args),
      path: args.destination.path,
      result: args.result,
    });
  }

  /**
   * Splices the anchored block into a file.
   *
   * Appends the block when the anchors are absent, creates the file when it
   * does not exist, and in check mode writes nothing and reports whether the
   * file already holds the current block.
   */
  public syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean {
    const target = args.path ?? args.destination.path;

    if (target.length === 0) {
      throw new MissingMarkdownPathError();
    }

    const resolvedPath = path.resolve(target);
    const existing = this.readExisting(resolvedPath);
    const generated = this.wrapInAnchors(args);
    const pattern = this.buildBlockPattern(args.destination);

    if (args.check) {
      return pattern.exec(existing)?.[0] === generated;
    }

    if (!existing.includes(args.destination.startMarker)) {
      // Trailing newlines are trimmed before the separator goes in: a file
      // that already ended with one would otherwise gain a second blank line
      // every time, which every markdown linter rejects.
      const body = existing.trimEnd();
      const separator = body.length === 0 ? "" : `${body}\n\n`;

      writeFileSync(resolvedPath, `${separator}${generated}\n`, "utf8");

      return true;
    }

    // Replaced through a function so a `$` in the generated content is not read
    // as a pattern reference.
    writeFileSync(
      resolvedPath,
      existing.replace(pattern, () => generated),
      "utf8",
    );

    return true;
  }

  /**
   * Splices one section into each traced project's own README.
   *
   * Every path is visited even in check mode, so one stale README does not
   * hide the next twenty — a caller fixing them wants the whole list.
   */
  public syncProjectReadmes(args: SyncProjectReadmesArguments): string[] {
    const stale: string[] = [];

    for (const section of args.sections) {
      const current = this.syncAnchoredBlock({
        check: args.check,
        content: section.content,
        destination: {
          description: undefined,
          endMarker: args.destination.endMarker,
          path: section.path,
          render: undefined,
          startMarker: args.destination.startMarker,
          write: undefined,
        },
        path: section.path,
      });

      if (!current) {
        stale.push(section.path);
      }
    }

    return stale;
  }

  /** Wraps content in the configured anchors. */
  public wrapInAnchors(args: WrapInAnchorsArguments): string {
    // A blank line after the opening anchor so a formatter reading the file
    // afterwards leaves the block alone.
    return `${args.destination.startMarker}\n\n${args.content}\n${args.destination.endMarker}`;
  }
}
