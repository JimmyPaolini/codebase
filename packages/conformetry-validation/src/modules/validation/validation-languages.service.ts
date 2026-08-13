import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { JupyterValidatorService } from "@jimmypaolini/conformetry-jupyter";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypescriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { Injectable } from "@nestjs/common";

import type { ConformetryLanguageValidator } from "@jimmypaolini/conformetry-core";

/**
 * The registry of language validators a validation run drives.
 *
 * Kept apart from `ValidationService` so that adding a language touches one
 * list rather than growing the orchestrator's constructor, and so the
 * orchestrator depends on the contract rather than on six concrete packages.
 */
@Injectable()
export class ValidationLanguagesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonValidatorService: JsonValidatorService,
    private readonly jupyterValidatorService: JupyterValidatorService,
    private readonly markdownValidatorService: MarkdownValidatorService,
    private readonly pythonValidatorService: PythonValidatorService,
    private readonly textValidatorService: TextValidatorService,
    private readonly typescriptValidatorService: TypescriptValidatorService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Every registered language validator, in report order. */
  public readValidators(): ConformetryLanguageValidator[] {
    return [
      this.typescriptValidatorService,
      this.pythonValidatorService,
      this.jupyterValidatorService,
      this.markdownValidatorService,
      this.jsonValidatorService,
      this.textValidatorService,
    ];
  }
}
