// ♟️ Constants

import type { ScannerCase } from "./python-imports.types";

/** Nx tag a project must carry for the Python pass to discover it at all. */
export const PYTHON_PROJECT_TAG = "language:python";

/** Path segment every Python fixture sits under, inside `fixtures/`. */
export const PYTHON_FIXTURES_SEGMENT = "python";

/** Fixture exercising every case the hand-rolled statement scanner handles. */
export const SCANNER_FIXTURE = "scanner";

/**
 * The scanner cases the fixture demonstrates, and the file each one lives in.
 *
 * Rendered into the example so a reader sees the whole surface of the parser
 * without opening every fixture file.
 */
export const SCANNER_CASES: ScannerCase[] = [
  {
    description: "A `#` inside a string literal, and a quote inside a comment",
    file: "catalog.py",
  },
  {
    description:
      "A parenthesized `from ... import (first, second)` over several lines",
    file: "parenthesized.py",
  },
  { description: "A backslash continuation", file: "continued.py" },
  {
    description: "A comma-separated `import package.first, package.second`",
    file: "main.py",
  },
  {
    description:
      "`from . import sibling` — only the module imported _from_ is kept, so this resolves the package's own `__init__.py` and never `sibling.py`",
    file: "main.py",
  },
  {
    description: "`from ..constants import FIRST` — one level further up",
    file: "shared/deep/cousin.py",
  },
  {
    description: "A directory made importable by `__init__.py`",
    file: "shared/__init__.py",
  },
];

/** The statements the scanner deliberately does not walk. */
export const SCANNER_NON_CASES: ScannerCase[] = [
  { description: "An import indented inside a function", file: "nested.py" },
  {
    description: "An import inside an `if TYPE_CHECKING:` block",
    file: "nested.py",
  },
  {
    description:
      "`from third_party_package import Missing` — resolves to no file this project owns",
    file: "main.py",
  },
];
