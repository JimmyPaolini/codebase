// cspell:ignore atrule — postcss spells its at-rule node type without a hyphen.
import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";
import postcss from "postcss";

import { CSS_MEDIA_AT_RULE, EMPTY_CSS_RESULT } from "./css.constants";

import type { CssInput, CssResult } from "./css.types";
import type { ChildNode } from "postcss";

/**
 * Walks parsed stylesheets to collect structural metrics.
 *
 * Parsed with postcss, which the repository's stylelint already reads CSS
 * through, so a selector split across lines counts once and a declaration
 * inside a comment counts not at all.
 */
@Injectable()
export class CssService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(CssService.name);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records one node against the running totals. */
  private countNode(node: ChildNode, result: CssResult): void {
    if (node.type === "comment") {
      result.comments++;
      return;
    }

    if (node.type === "decl") {
      result.declarations++;

      if (node.prop.startsWith("--")) {
        result.customProperties++;
      }

      return;
    }

    if (node.type === "atrule") {
      result.atRules++;

      if (node.name === CSS_MEDIA_AT_RULE) {
        result.mediaQueries++;
      }

      return;
    }

    result.rules++;
    // A rule's selector list is one rule with several selectors, and both
    // numbers say something different about a stylesheet.
    result.selectors += node.selectors.length;
  }

  // 🌎 Public Methods

  /** Analyze the given stylesheets, resolved against the directory. */
  analyze({ cssFiles, workingDirectory }: CssInput): CssResult {
    const result: CssResult = { ...EMPTY_CSS_RESULT };

    for (const filePath of cssFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );
        const root = postcss.parse(content);

        result.files++;
        result.lines += content.split("\n").length;

        root.walk((node) => {
          this.countNode(node, result);
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`🎨 Skipped CSS analysis for ${filePath}`, undefined, {
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
