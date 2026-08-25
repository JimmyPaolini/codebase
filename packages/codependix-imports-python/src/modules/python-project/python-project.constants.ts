// ♟️ Constants

/** Nx tag a project must carry to be discovered as a Python project. */
export const PYTHON_PROJECT_TAG = "language:python";

/** Extension a Python source file carries. */
export const PYTHON_FILE_EXTENSION = ".py";

/** File name a directory carries when it is itself an importable package. */
export const PYTHON_PACKAGE_INIT_FILE_NAME = "__init__.py";

/** Directory names walked past rather than into when discovering source files. */
export const PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "node_modules",
]);
