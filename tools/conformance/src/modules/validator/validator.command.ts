import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

import {
  isValidatorRuleName,
  VALIDATOR_RULE_NAMES,
} from "./validator.constants";
import { ValidatorService } from "./validator.service";

import type {
  ValidatorCommandOptions,
  ValidatorRequest,
  ValidatorRuleName,
} from "./validator.types";

/**
 * Executes project conformance validation and emits JSON output.
 */
@Command({
  description: "Run the validator command",
  name: "validator",
})
@Injectable()
export class ValidatorCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly validatorService: ValidatorService,
  ) {
    super();
    this.logger.setContext(ValidatorCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses `--projects` as a comma-separated list of Nx project names.
   */
  @Option({
    description: "Comma-separated project names to validate",
    flags: "--projects [projects]",
  })
  parseProjects(value: string | undefined): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((projectName) => projectName.trim())
      .filter((projectName) => projectName.length > 0);
  }

  /**
   * Parses `--rules` as a comma-separated list of validation rule names.
   */
  @Option({
    description: `Comma-separated validation rules (${VALIDATOR_RULE_NAMES.join(", ")})`,
    flags: "--rules [rules]",
  })
  parseRules(value: string | undefined): undefined | ValidatorRuleName[] {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((ruleName) => ruleName.trim())
      .filter(
        (ruleName): ruleName is ValidatorRuleName =>
          ruleName.length > 0 && isValidatorRuleName(ruleName),
      );
  }

  /**
   * Runs validation and throws when any selected project fails.
   */
  async run(
    _passedParameters: string[],
    options: ValidatorCommandOptions,
  ): Promise<void> {
    const request: ValidatorRequest = {};
    if (options.projects !== undefined) {
      request.projects = options.projects;
    }
    if (options.rules !== undefined) {
      request.rules = options.rules;
    }

    const validatorResult = await this.validatorService.validate(request);

    this.logger.log(JSON.stringify(validatorResult, null, 2));

    if (!validatorResult.passed) {
      throw new Error("Validation failed");
    }
  }
}
