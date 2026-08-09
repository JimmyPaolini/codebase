import { access } from "node:fs/promises";
import path from "node:path";

import { prepareTemplateValidationPayload } from "@jimmypaolini/conformetry-configuration";
import { Injectable } from "@nestjs/common";

import {
  TEXT_VALIDATOR_FILE_EXTENSIONS,
  TEXT_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./text-validator.constants";

import type {
  TextValidationDocument,
  TextValidatorValidateArguments,
  TextValidatorValidateResult,
  ValidatePathExistenceArguments,
} from "./text-validator.types";

/**
 * Validates text files against conformetry templates.
 */
@Injectable()
export class TextValidatorService {
  public readonly pluginDescriptor = TEXT_VALIDATOR_PLUGIN_DESCRIPTOR;

  // 🌎 Public Methods

  /** Internal helper. */
  private buildLineCounts(text: string): Map<string, number> {
    const lineCounts = new Map<string, number>();
    for (const line of text.split("\n")) {
      lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }

    return lineCounts;
  }

  // 🔏 Private Methods

  /** Internal helper. */
  private async pathExists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }

  /** Internal helper. */
  private async validatePathExistence(
    arguments_: ValidatePathExistenceArguments,
  ): Promise<string[]> {
    const issues: string[] = [];

    for (const filePath of arguments_.filePaths) {
      const resolvedPath = path.resolve(arguments_.workingDirectory, filePath);
      if (!(await this.pathExists(resolvedPath))) {
        issues.push(`Missing text path ${resolvedPath}`);
      }
    }

    return issues;
  }

  /** Internal helper. */
  private validateTextDocument(document: TextValidationDocument): string[] {
    const instanceLineCounts = this.buildLineCounts(document.instance);
    const templateLines = document.renderedTemplate.split("\n");
    const violations: string[] = [];

    for (const [index, line] of templateLines.entries()) {
      const lineCount = instanceLineCounts.get(line) ?? 0;
      if (lineCount === 0) {
        violations.push(`Missing line at template line ${index + 1}: ${line}`);
        continue;
      }

      instanceLineCounts.set(line, lineCount - 1);
    }

    return violations;
  }

  /** Internal helper. */
  public async validate(
    arguments_: TextValidatorValidateArguments,
  ): Promise<TextValidatorValidateResult> {
    const {
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    } = arguments_;

    if (configurationPath === undefined) {
      const pathViolations = await this.validatePathExistence({
        filePaths,
        workingDirectory,
      });

      return {
        checkedPaths: filePaths,
        ok: pathViolations.length === 0,
        pluginName: TEXT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
        violations: pathViolations,
      };
    }

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: TEXT_VALIDATOR_FILE_EXTENSIONS,
      filePaths,
      ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
      workingDirectory,
    });

    const issues: string[] = [];

    for (const document of payload.documents) {
      const lineViolations = this.validateTextDocument(document);
      for (const violation of lineViolations) {
        issues.push(
          `${document.instanceFilePath}: ${violation} (template: ${document.templateFilePath})`,
        );
      }
    }

    issues.push(...payload.violations);

    return {
      checkedPaths: filePaths,
      ok: issues.length === 0,
      pluginName: TEXT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: issues,
    };
  }
}
