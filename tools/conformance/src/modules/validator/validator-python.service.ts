import { spawnSync } from "node:child_process";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { workspaceRoot } from "@nx/devkit";

import type { ConformanceError } from "./validator.types";

/**
 * Bridges TypeScript validation flow to Python validators.
 */
@Injectable()
export class ValidatorPythonService {
  // 🏗 Dependency Injection

  constructor() {}

  private static readonly PYTHON_BRIDGE_EXTENSIONS = new Set([".ipynb", ".py"]);

  /**
   * Adds a property only when the value is defined.
   */
  private addDefinedProperty<K extends keyof ConformanceError>(
    target: Partial<ConformanceError>,
    key: K,
    value: ConformanceError[K] | undefined,
  ): void {
    if (value !== undefined) {
      Object.assign(target, { [key]: value });
    }
  }

  /**
   * Maps Python error payload keys to TypeScript conformance error shape.
   */
  private mapPythonError(error: Record<string, unknown>): ConformanceError {
    const conformanceError: ConformanceError = {
      errorType: this.readErrorType(error),
      fix: this.readString(error, "fix") ?? "Fix the conformance issue.",
      message:
        this.readString(error, "message") ?? "Python conformance issue found.",
    };

    this.addDefinedProperty(
      conformanceError,
      "actual",
      this.readString(error, "actual"),
    );
    this.addDefinedProperty(
      conformanceError,
      "expected",
      this.readString(error, "expected"),
    );
    this.addDefinedProperty(
      conformanceError,
      "instanceColumn",
      this.readNumber(error, "instance_column"),
    );
    this.addDefinedProperty(
      conformanceError,
      "instanceLine",
      this.readNumber(error, "instance_line"),
    );
    this.addDefinedProperty(
      conformanceError,
      "instancePath",
      this.readString(error, "instance_path"),
    );
    this.addDefinedProperty(
      conformanceError,
      "language",
      this.readLanguage(error),
    );
    this.addDefinedProperty(
      conformanceError,
      "templateColumn",
      this.readNumber(error, "template_column"),
    );
    this.addDefinedProperty(
      conformanceError,
      "templateLine",
      this.readNumber(error, "template_line"),
    );
    this.addDefinedProperty(
      conformanceError,
      "templatePath",
      this.readString(error, "template_path"),
    );

    return conformanceError;
  }

  /**
   * Reads error type with guard.
   */
  private readErrorType(
    error: Record<string, unknown>,
  ): ConformanceError["errorType"] {
    const errorType = this.readString(error, "error_type");
    if (
      errorType === "code" ||
      errorType === "comment" ||
      errorType === "directory" ||
      errorType === "file"
    ) {
      return errorType;
    }
    return "code";
  }

  /**
   * Reads error language with guard.
   */
  private readLanguage(
    error: Record<string, unknown>,
  ): ConformanceError["language"] {
    const language = this.readString(error, "language");
    if (
      language === "javascript" ||
      language === "json" ||
      language === "markdown" ||
      language === "python" ||
      language === "text" ||
      language === "typescript"
    ) {
      return language;
    }
    return undefined;
  }

  /**
   * Reads optional numeric field.
   */
  private readNumber(
    error: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = error[key];
    return typeof value === "number" ? value : undefined;
  }

  /**
   * Reads optional string field.
   */
  private readString(
    error: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = error[key];
    return typeof value === "string" ? value : undefined;
  }

  /**
   * Validates Python or notebook content via the Python validator runtime.
   */
  validatePythonConformance(args: {
    data: Record<string, unknown>;
    extension: string;
    filename: string;
    instance: string;
    template: string;
  }): { errors: ConformanceError[] } {
    if (!ValidatorPythonService.PYTHON_BRIDGE_EXTENSIONS.has(args.extension)) {
      throw new Error(
        `Python validator bridge only supports .py and .ipynb files. Received: ${args.extension}`,
      );
    }

    const pythonEnvironment = {
      ...process.env,
      PYTHONPATH: path.join(
        workspaceRoot,
        "tools/conformance/src/modules/validator",
      ),
    };
    const spawnOptions: NonNullable<Parameters<typeof spawnSync>[2]> = {
      cwd: workspaceRoot,
      encoding: "utf8",
      ["env"]: pythonEnvironment,
      input: JSON.stringify(args),
    };
    const result = spawnSync("python3", ["-m", "python.bridge"], spawnOptions);

    if (result.status !== 0) {
      throw new Error(
        `Python validator failed: ${result.stderr || result.stdout}`,
      );
    }

    const output =
      typeof result.stdout === "string"
        ? result.stdout
        : result.stdout.toString("utf8");
    const payload = JSON.parse(output) as {
      errors: Record<string, unknown>[];
    };
    return {
      errors: payload.errors.map((error) => this.mapPythonError(error)),
    };
  }
}
