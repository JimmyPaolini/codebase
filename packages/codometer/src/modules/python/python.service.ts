import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable, Logger } from "@nestjs/common";

import { EMPTY_PYTHON_RESULT } from "./python.constants";

import type { PythonResult } from "./python.types";

/**
 * Executes the Python analysis script and returns aggregated metrics.
 */
@Injectable()
export class PythonService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(PythonService.name);
  private readonly scriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "python.service.py",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Analyze the given Python files, resolved relative to the directory.
   *
   * The paths travel over stdin rather than argv so that a repository with
   * thousands of Python files cannot overflow the command-line length limit.
   */
  analyze(pythonFiles: string[], directory: string): PythonResult {
    if (pythonFiles.length === 0) {
      return { ...EMPTY_PYTHON_RESULT };
    }

    try {
      const output = execSync(`uv run python "${this.scriptPath}"`, {
        cwd: directory,
        encoding: "utf8",
        input: pythonFiles.join("\n"),
      });

      return JSON.parse(output.trim()) as PythonResult;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`🐍 Skipped Python analysis`, undefined, {
        reason: message,
      });
      return { ...EMPTY_PYTHON_RESULT };
    }
  }
}
