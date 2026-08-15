// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/**
 * Extensions the Python validator claims.
 *
 * Notebooks are deliberately absent — `.ipynb` is a JSON envelope containing
 * markdown and code cells, so `conformetry-jupyter` owns it and calls back
 * into this package for the code cells alone.
 */
export const PYTHON_VALIDATOR_FILE_EXTENSIONS = [".py"];

/** Identifies the Python validator to the orchestrator and `--rules` filter. */
export const PYTHON_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks Python structure and comments against templates",
  fileExtensions: PYTHON_VALIDATOR_FILE_EXTENSIONS,
  name: "python",
};

/** Interpreter used to run the validator bridge. */
export const PYTHON_EXECUTABLE = "python3";

/** Module the bridge is invoked as, resolved against the package's `src`. */
export const PYTHON_BRIDGE_MODULE = "python.bridge";

/** Guidance shown when the interpreter is missing or the bridge fails. */
export const PYTHON_UNAVAILABLE_FIX =
  "Install Python 3 and ensure `python3` is on PATH; conformetry validates Python files through the interpreter's own ast module.";
