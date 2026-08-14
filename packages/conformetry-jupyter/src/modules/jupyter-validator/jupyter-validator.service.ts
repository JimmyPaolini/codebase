import { JsonComparisonService } from "@conformetry/json";
import { MarkdownValidatorService } from "@conformetry/markdown";
import { PythonBridgeService } from "@conformetry/python";
import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import { JupyterNotebookService } from "./jupyter-notebook.service";
import {
  JUPYTER_VALIDATOR_DESCRIPTOR,
  NOTEBOOK_ENVELOPE_KEYS,
} from "./jupyter-validator.constants";

import type { PairedCells } from "./jupyter-validator.types";
import type {
  ConformanceError,
  ConformetryLanguageValidator,
  PreparedValidationDocument,
} from "@conformetry/core";
import type { JsonValue } from "@conformetry/json";

/**
 * Checks that a Jupyter notebook conforms to its template.
 *
 * A notebook is three formats at once, so this validator composes the three
 * that already exist rather than reimplementing any: JSON for the envelope,
 * markdown for prose cells, and the Python bridge for code cells. Validating a
 * code cell through Python's own parser is what lets a notebook be re-run and
 * reformatted without failing.
 */
@Injectable()
export class JupyterValidatorService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonComparisonService: JsonComparisonService,
    private readonly jupyterNotebookService: JupyterNotebookService,
    private readonly markdownValidatorService: MarkdownValidatorService,
    private readonly pythonBridgeService: PythonBridgeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = JUPYTER_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /** Prefixes an error's message so a reader knows which cell it came from. */
  private attributeToCell(args: {
    cell: PairedCells;
    errors: ConformanceError[];
  }): ConformanceError[] {
    return args.errors.map((error) => {
      return {
        ...error,
        message: `Cell ${String(args.cell.index + 1)} (${args.cell.kind}): ${error.message}`,
      };
    });
  }

  /** Reduces a notebook to the envelope keys that are compared structurally. */
  private readEnvelope(content: string): JsonValue {
    const parsed = parse(content) as JsonValue;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const envelope: Record<string, JsonValue> = {};

    for (const key of NOTEBOOK_ENVELOPE_KEYS) {
      const value = parsed[key];

      if (value !== undefined) {
        envelope[key] = value;
      }
    }

    return envelope;
  }

  /** Validates one paired cell with the validator matching its kind. */
  private validateCell(args: {
    cell: PairedCells;
    document: PreparedValidationDocument;
  }): ConformanceError[] {
    const { cell } = args;

    if (cell.kind === "markdown") {
      return this.attributeToCell({
        cell,
        errors: this.markdownValidatorService.validateDocument({
          ...args.document,
          instance: cell.instanceSource,
          renderedTemplate: cell.templateSource,
        }),
      });
    }

    if (cell.kind === "code") {
      return this.attributeToCell({
        cell,
        errors: this.pythonBridgeService.validatePythonSource({
          filename: `${args.document.filename}#cell-${String(cell.index + 1)}.py`,
          instance: cell.instanceSource,
          template: cell.templateSource,
        }),
      });
    }

    return [];
  }

  // 🌎 Public Methods

  /** Reports every notebook difference: envelope, missing cells, cell contents. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): ConformanceError[] {
    const templateNotebook = this.jupyterNotebookService.parseNotebook(
      document.renderedTemplate,
    );
    const instanceNotebook = this.jupyterNotebookService.parseNotebook(
      document.instance,
    );
    const { missingCells, pairedCells } = this.jupyterNotebookService.pairCells(
      {
        instanceNotebook,
        templateNotebook,
      },
    );

    return [
      ...this.jsonComparisonService.compare({
        instanceValue: this.readEnvelope(document.instance),
        language: "json",
        templateValue: this.readEnvelope(document.renderedTemplate),
      }),
      ...missingCells.map((cell) => {
        return {
          errorType: "code" as const,
          expected: cell.templateSource,
          fix: `Add a ${cell.kind} cell matching the template's cell ${String(cell.index + 1)}.`,
          language: "python" as const,
          message: `Missing ${cell.kind} cell ${String(cell.index + 1)}`,
        };
      }),
      ...pairedCells.flatMap((cell) => this.validateCell({ cell, document })),
    ];
  }
}
