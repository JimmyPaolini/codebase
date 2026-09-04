/**
 * Judges markdown paths, which the main pass structurally cannot.
 *
 * `project-structure/folder-structure` listens on `Program`, so it fires only
 * on a file ESLint parsed into a JavaScript syntax tree. `.md` never gets one:
 * it resolves to `@eslint/markdown`'s `markdown/gfm` language, whose tree is
 * mdast. ESLint allows exactly one language per file, and the two cannot be
 * reconciled in a single pass — verified both ways:
 *
 * - Giving `.md` this parser without overriding `language` leaves the markdown
 *   rules working and the structure rule silently never firing, which is the
 *   bug this pass exists to fix.
 * - Overriding `language` to `"@/js"` so the rule does fire rejects the
 *   markdown block's own options: `Key "languageOptions": Unexpected key
 *   "frontmatter" found.`
 *
 * Folding markdown into `eslint.config.ts` therefore means dropping its
 * `@eslint/markdown` block — around fifteen rules, `no-html` among them, which
 * this repository enables precisely because `markdownlint`'s MD033 is off. A
 * second pass is the cheaper of the two. `.html` needs none of this and is
 * judged in the main config, which owns the parser both share.
 */
import { pathOnlyParser } from "./eslint.config";

import projectStructurePlugin from "eslint-plugin-project-structure";

import type { ConfigWithExtends } from "typescript-eslint";

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
    files: ["**/*.md"],
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
