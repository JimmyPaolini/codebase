// 🏷️ Types

import type { CallableDeclaration } from "../callables/callables.types";
import type ts from "typescript";

/** Arguments for reading what a declaration says about itself. */
export interface ReadAnnotationsArguments {
  readonly checker: ts.TypeChecker;
  readonly declaration: CallableDeclaration;
}
