import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ErrorsService } from "@jimmypaolini/conformetry-core";
import { Injectable } from "@nestjs/common";

import {
  PYTHON_BRIDGE_MODULE,
  PYTHON_EXECUTABLE,
  PYTHON_UNAVAILABLE_FIX,
} from "./python-validator.constants";

import type {
  PythonBridgeError,
  PythonBridgeResponse,
  RunPythonBridgeArguments,
} from "./python-validator.types";
import type { ConformanceError } from "@jimmypaolini/conformetry-core";

/**
 * Runs Python conformance checks through the Python interpreter.
 *
 * Python's syntax tree is only available from Python, so structural validation
 * shells out to a small module shipped inside this package rather than
 * approximating it with a line comparison. The subprocess is synchronous
 * because callers are, and because one file's validation has nothing to
 * overlap with.
 */
@Injectable()
export class PythonBridgeService {
  // 🏗 Dependency Injection

  constructor(private readonly errorsService: ErrorsService) {}

  // 🔐 Private Fields

  /**
   * Directory holding the `python` package, resolved from this module rather
   * than from the workspace root, so the bridge is found the same way whether
   * conformetry runs from a checkout or from `node_modules`.
   */
  private readonly pythonRootPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Wraps a bridge failure as a reportable error rather than throwing. */
  private buildBridgeError(message: string): ConformanceError[] {
    return [
      {
        errorType: "code",
        fix: PYTHON_UNAVAILABLE_FIX,
        language: "python",
        message,
      },
    ];
  }

  /** Reads the optional location fields, omitting any the bridge left out. */
  private readLocations(error: PythonBridgeError): Partial<ConformanceError> {
    const instanceColumn = this.readNumber(error, "instance_column");
    const instanceLine = this.readNumber(error, "instance_line");
    const templateColumn = this.readNumber(error, "template_column");
    const templateLine = this.readNumber(error, "template_line");

    return {
      ...(instanceColumn === undefined ? {} : { instanceColumn }),
      ...(instanceLine === undefined ? {} : { instanceLine }),
      ...(templateColumn === undefined ? {} : { templateColumn }),
      ...(templateLine === undefined ? {} : { templateLine }),
    };
  }

  /** Narrows an untrusted numeric field from the bridge payload. */
  private readNumber(
    error: PythonBridgeError,
    key: string,
  ): number | undefined {
    const value = error[key];

    return typeof value === "number" ? value : undefined;
  }

  /** Narrows an untrusted string field from the bridge payload. */
  private readString(
    error: PythonBridgeError,
    key: string,
  ): string | undefined {
    const value = error[key];

    return typeof value === "string" ? value : undefined;
  }

  /** Reads the optional expected and actual values. */
  private readValues(error: PythonBridgeError): Partial<ConformanceError> {
    const actual = this.readString(error, "actual");
    const expected = this.readString(error, "expected");

    return {
      ...(actual === undefined ? {} : { actual }),
      ...(expected === undefined ? {} : { expected }),
    };
  }

  /** Maps one snake_case bridge error onto the shared error shape. */
  private toConformanceError(error: PythonBridgeError): ConformanceError {
    return {
      ...this.readValues(error),
      ...this.readLocations(error),
      errorType: this.errorsService.resolveErrorType(error["error_type"]),
      fix: this.readString(error, "fix") ?? "Fix the conformance issue.",
      language:
        this.errorsService.resolveErrorLanguage(error["language"]) ?? "python",
      message:
        this.readString(error, "message") ?? "Python conformance issue found.",
    };
  }

  // 🌎 Public Methods

  /**
   * Compares one Python source against its rendered template.
   *
   * A missing interpreter, a crashed bridge, or unreadable output are all
   * reported as conformance errors: they mean this file could not be checked,
   * which the run should surface, but they must not abort validation of every
   * other file.
   */
  public validatePythonSource(
    args: RunPythonBridgeArguments,
  ): ConformanceError[] {
    const result = spawnSync(PYTHON_EXECUTABLE, ["-m", PYTHON_BRIDGE_MODULE], {
      cwd: this.pythonRootPath,
      encoding: "utf8",
      // eslint-disable-next-line unicorn/prevent-abbreviations
      env: { ...process.env, PYTHONPATH: this.pythonRootPath },
      input: JSON.stringify(args),
    });

    if (result.error !== undefined) {
      return this.buildBridgeError(
        `Could not run ${PYTHON_EXECUTABLE}: ${result.error.message}`,
      );
    }

    if (result.status !== 0) {
      return this.buildBridgeError(
        `Python validator exited with status ${String(result.status)}: ${result.stderr || result.stdout}`,
      );
    }

    try {
      const payload = JSON.parse(result.stdout) as PythonBridgeResponse;

      return payload.errors.map((error) => this.toConformanceError(error));
    } catch {
      return this.buildBridgeError(
        "Python validator returned output that could not be parsed.",
      );
    }
  }
}
