import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { Injectable } from "@nestjs/common";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

/**
 * Builds the validator plugin set used by conformetry commands.
 */
@Injectable()
export class ValidationLanguageService {
  constructor(
    private readonly typeScriptValidatorService?: TypeScriptValidatorService,
    private readonly pythonValidatorService?: PythonValidatorService,
    private readonly markdownValidatorService?: MarkdownValidatorService,
    private readonly jsonValidatorService?: JsonValidatorService,
    private readonly textValidatorService?: TextValidatorService,
  ) {}

  /**
   * Ensures that all validator services are injected and available.
   */
  private requireValidatorServices(): {
    jsonValidatorService: JsonValidatorService;
    markdownValidatorService: MarkdownValidatorService;
    pythonValidatorService: PythonValidatorService;
    textValidatorService: TextValidatorService;
    typeScriptValidatorService: TypeScriptValidatorService;
  } {
    if (
      this.typeScriptValidatorService === undefined ||
      this.pythonValidatorService === undefined ||
      this.markdownValidatorService === undefined ||
      this.jsonValidatorService === undefined ||
      this.textValidatorService === undefined
    ) {
      throw new Error(
        "ValidationLanguageService requires injected validator services",
      );
    }

    return {
      jsonValidatorService: this.jsonValidatorService,
      markdownValidatorService: this.markdownValidatorService,
      pythonValidatorService: this.pythonValidatorService,
      textValidatorService: this.textValidatorService,
      typeScriptValidatorService: this.typeScriptValidatorService,
    };
  }

  /**
   * Returns all validator plugins in command execution order.
   */
  public buildValidatorPlugins(): ConformetryValidatorPlugin[] {
    const validatorServices = this.requireValidatorServices();
    const typeScriptValidate =
      validatorServices.typeScriptValidatorService.validate.bind(
        validatorServices.typeScriptValidatorService,
      );
    const pythonValidate =
      validatorServices.pythonValidatorService.validate.bind(
        validatorServices.pythonValidatorService,
      );
    const markdownValidate =
      validatorServices.markdownValidatorService.validate.bind(
        validatorServices.markdownValidatorService,
      );
    const jsonValidate = validatorServices.jsonValidatorService.validate.bind(
      validatorServices.jsonValidatorService,
    );
    const textValidate = validatorServices.textValidatorService.validate.bind(
      validatorServices.textValidatorService,
    );

    return [
      {
        descriptor:
          validatorServices.typeScriptValidatorService.pluginDescriptor,
        validate: typeScriptValidate,
      },
      {
        descriptor: validatorServices.pythonValidatorService.pluginDescriptor,
        validate: pythonValidate,
      },
      {
        descriptor: validatorServices.markdownValidatorService.pluginDescriptor,
        validate: markdownValidate,
      },
      {
        descriptor: validatorServices.jsonValidatorService.pluginDescriptor,
        validate: jsonValidate,
      },
      {
        descriptor: validatorServices.textValidatorService.pluginDescriptor,
        validate: textValidate,
      },
    ];
  }
}
