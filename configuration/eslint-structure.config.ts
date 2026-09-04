/**
 * A second ESLint pass that exists for exactly one rule.
 *
 * `project-structure/folder-structure` listens on `Program`, so it only fires
 * on a file ESLint parsed into a JavaScript syntax tree. Two file types in this
 * workspace never get one. `.md` is parsed with `@eslint/markdown`'s
 * `markdown/gfm` language, whose tree is mdast and carries no `Program` node.
 * `.html` is matched by no config block at all, so ESLint never visits it.
 *
 * Neither can be fixed by adding a block to `eslint.config.ts`: ESLint resolves
 * exactly one `language` per file, so the markdown rules and the structure rule
 * cannot both read the same file in one pass. This config runs the same rule
 * against the same `codebase-structure.json` in a pass of its own, parsing
 * those files into an empty `Program`. Only the path is judged — nothing here
 * reads a file's contents, which is why a stub parser is sufficient and why
 * this pass costs a fraction of the main one.
 */
import projectStructurePlugin from "eslint-plugin-project-structure";

import type { ConfigWithExtends } from "typescript-eslint";

import type { AST, Linter } from "eslint";

const EMPTY_LOCATION = { column: 0, line: 1 };

/**
 * Parses any file into an empty `Program` so that path-only rules fire without
 * the file's real syntax ever being read.
 */
const pathOnlyParser: Linter.Parser = {
  parseForESLint: () => ({
    ast: {
      body: [],
      comments: [],
      loc: { end: EMPTY_LOCATION, start: EMPTY_LOCATION },
      range: [0, 0],
      sourceType: "module",
      tokens: [],
      type: "Program",
    } as AST.Program,
  }),
};

export default [
  {
    ignores: [
      "**/.conformetry",
      "**/.nx",
      "**/.pnpm-store",
      "**/.venv",
      "**/build",
      "**/coverage",
      "**/dist",
      "**/node_modules",
      "**/tmp",
      "CHANGELOG.md",
      // Symlinked mirrors of AGENTS.md — judged once at the source
      ".github/copilot-instructions.md",
      "CLAUDE.md",
    ],
  },
  {
    files: ["**/*.html", "**/*.md", "**/*.mdx"],
    languageOptions: {
      parser: pathOnlyParser,
    },
    plugins: {
      "project-structure": projectStructurePlugin,
    },
    rules: {
      "project-structure/folder-structure": "error",
    },
    settings: {
      "project-structure/folder-structure-config-path":
        "configuration/codebase-structure.json",
    },
  },
] as ConfigWithExtends[];
