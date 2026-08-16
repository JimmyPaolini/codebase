import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable, Logger } from "@nestjs/common";

import { EMPTY_PYTHON_RESULT } from "./measure-python.constants";

import type { MeasurePythonResult } from "./measure-python.types";

/**
 * Executes the Python analysis script and returns aggregated metrics.
 */
@Injectable()
export class MeasurePythonService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(MeasurePythonService.name);
  private readonly scriptPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "measure-python.service.py",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Analyze Python files within the provided directory.
   */
  analyze(directory: string): MeasurePythonResult {
    try {
      const output = execSync(`uv run python "${this.scriptPath}"`, {
        cwd: directory,
        encoding: "utf8",
      });

      return JSON.parse(output.trim()) as MeasurePythonResult;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`🐍 Skipped Python analysis`, undefined, {
        reason: message,
      });
      return { ...EMPTY_PYTHON_RESULT };
    }
  }
}
