import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { workspaceRoot } from "@nx/devkit";

import { GeneratorService } from "../generator/generator.service";

import { ValidatorJsonService } from "./validator-json.service";
import { ValidatorMarkdownService } from "./validator-markdown.service";
import { ValidatorPythonService } from "./validator-python.service";
import { ValidatorTextService } from "./validator-text.service";
import { ValidatorTypescriptService } from "./validator-typescript.service";

import type {
  ConformanceError,
  InstanceDirectoryValidationResult,
} from "./validator.types";

/**
 * File and directory conformance validation utilities.
 */
@Injectable()
export class ValidatorFilesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly validatorJsonService: ValidatorJsonService,
    private readonly validatorMarkdownService: ValidatorMarkdownService,
    private readonly validatorTextService: ValidatorTextService,
  ) {}

  private static readonly PYTHON_EXTENSIONS = new Set([".ipynb", ".py"]);

  private static readonly TS_EXTENSIONS = new Set([
    ".cjs",
    ".js",
    ".jsx",
    ".mjs",
    ".ts",
    ".tsx",
  ]);

  private readonly validatorPythonService = new ValidatorPythonService();
  private readonly validatorTypescriptService =
    new ValidatorTypescriptService();

  /**
   * Builds missing-file conformance error.
   */
  private buildMissingFileError(
    instanceFilePath: string,
    templateFilePath: string,
  ): {
    errors: ConformanceError[];
    instanceFilePath: string;
    templateFilePath: string;
  } {
    return {
      errors: [
        {
          errorType: "file",
          fix: `Create the file using the generator or manually based on the template at ${templateFilePath}`,
          message: `Missing file: ${instanceFilePath}`,
        },
      ],
      instanceFilePath,
      templateFilePath,
    };
  }

  /**
   * Builds substitution data from the instance directory name.
   */
  private buildNameData(name: string): Record<string, string> {
    const substitutions = this.generatorService.buildNameSubstitutions(name);

    return {
      name,
      nameCamelCase: substitutions.nameCamelCase,
      nameKebabCase: substitutions.nameKebabCase,
      namePascalCase: substitutions.namePascalCase,
      nameSnakeCase: substitutions.nameSnakeCase,
    };
  }

  /**
   * Formats one failing directory section.
   */
  private formatDirectoryLines(
    directoryName: string,
    fileResults: InstanceDirectoryValidationResult["results"],
    directoryIndex: number,
  ): string[] {
    const failingFiles = fileResults.filter(
      (result) => result.errors.length > 0,
    );
    const header = [
      "",
      `${String(directoryIndex + 1)}. directory: ${directoryName}`,
    ];
    const fileLines = failingFiles.flatMap((fileResult, index) =>
      this.formatFileResultLines(fileResult, index),
    );
    return [...header, ...fileLines];
  }

  /**
   * Formats one conformance error block.
   */
  private formatErrorLines(error: ConformanceError, index: number): string[] {
    return [
      "",
      `     ${String(index + 1)}. ${error.message}`,
      ...this.formatLocationLines({
        column: error.instanceColumn,
        jsonPath: error.instancePath,
        line: error.instanceLine,
        prefix: "Instance",
      }),
      ...this.formatLocationLines({
        column: error.templateColumn,
        jsonPath: error.templatePath,
        line: error.templateLine,
        prefix: "Template",
      }),
      ...(error.expected === undefined
        ? []
        : [`        Expected: \`${error.expected}\``]),
      ...(error.actual === undefined
        ? []
        : [`        Actual  : \`${error.actual}\``]),
      `        Fix     : ${error.fix}`,
    ];
  }

  /**
   * Formats one failing file section.
   */
  private formatFileResultLines(
    fileResult: InstanceDirectoryValidationResult["results"][number],
    fileIndex: number,
  ): string[] {
    const header = [
      "",
      `  ${String(fileIndex + 1)}. file: ${fileResult.filename}`,
      `     Instance: ${path.relative(workspaceRoot, fileResult.instanceFilePath)}`,
      `     Template: ${path.relative(workspaceRoot, fileResult.templateFilePath)}`,
    ];
    const errorLines = fileResult.errors.flatMap((error, index) =>
      this.formatErrorLines(error, index),
    );
    return [...header, ...errorLines];
  }

  /**
   * Formats location metadata lines.
   */
  private formatLocationLines(args: {
    column: number | undefined;
    jsonPath: string | undefined;
    line: number | undefined;
    prefix: string;
  }): string[] {
    const { column, jsonPath, line, prefix } = args;
    if (line !== undefined) {
      const columnText =
        column === undefined ? "" : `, Column ${String(column)}`;
      return [`        ${prefix}: Line ${String(line)}${columnText}`];
    }
    if (jsonPath !== undefined) {
      return [`        ${prefix}: JSON path "${jsonPath}"`];
    }
    return [];
  }

  /**
   * Type guard for filesystem ENOENT errors.
   */
  private isNodeJsErrnoException(
    error: unknown,
  ): error is NodeJS.ErrnoException {
    return typeof error === "object" && error !== null && "code" in error;
  }

  /**
   * Resolves project description from pyproject.toml when available.
   */
  private resolveProjectDescription(instanceDirectoryPath: string): string {
    const pyprojectPath = path.join(instanceDirectoryPath, "pyproject.toml");
    if (!fs.existsSync(pyprojectPath)) {
      return "";
    }
    const pyprojectContent = fs.readFileSync(pyprojectPath, "utf8");
    const descriptionMatch =
      /^description\s*=\s*["'](?<description>.*)["']$/mu.exec(pyprojectContent);
    if (descriptionMatch?.groups?.["description"] === undefined) {
      return "";
    }
    return descriptionMatch.groups["description"];
  }

  /**
   * Resolves a single template filename to instance filename and validates.
   */
  private resolveTemplateFile(args: {
    data: Record<string, unknown>;
    instanceDirectoryPath: string;
    templateDirectoryPath: string;
    templateFilename: string;
  }): {
    errors: ConformanceError[];
    filename: string;
    instanceFilePath: string;
    templateFilePath: string;
  } {
    const {
      data,
      instanceDirectoryPath,
      templateDirectoryPath,
      templateFilename,
    } = args;
    const instanceFilename = templateFilename.replaceAll(
      /__(\w+)__/g,
      (match: string, field: string) => {
        const value = data[field];
        return typeof value === "string" ? value : match;
      },
    );
    const instanceFilePath = path.join(instanceDirectoryPath, instanceFilename);
    const templateFilePath = path.join(templateDirectoryPath, templateFilename);
    return {
      filename: instanceFilename,
      ...this.validateInstanceFile({
        data,
        instanceFilePath,
        templateFilePath,
      }),
    };
  }

  /**
   * Selects validator based on file extension.
   */
  private selectValidator(args: {
    data: Record<string, unknown>;
    extension: string;
    filename: string;
    instance: string;
    template: string;
  }): { errors: ConformanceError[] } {
    const { data, extension, filename, instance, template } = args;
    if (extension === ".json") {
      return this.validatorJsonService.validateJsonConformance({
        data,
        filename,
        instance,
        template,
      });
    }
    if (extension === ".md") {
      return this.validatorMarkdownService.validateMarkdownConformance({
        data,
        filename,
        instance,
        template,
      });
    }
    if (extension === ".txt") {
      return this.validatorTextService.validateTextConformance({
        data,
        filename,
        instance,
        template,
      });
    }
    if (ValidatorFilesService.TS_EXTENSIONS.has(extension)) {
      return this.validatorTypescriptService.validateTypescriptConformance({
        data,
        filename,
        instance,
        template,
      });
    }
    if (ValidatorFilesService.PYTHON_EXTENSIONS.has(extension)) {
      return this.validatorPythonService.validatePythonConformance({
        data,
        extension,
        filename,
        instance,
        template,
      });
    }
    return this.validatorTextService.validateTextConformance({
      data,
      filename,
      instance,
      template,
    });
  }

  /**
   * Formats nested directory/file conformance errors into a single string.
   */
  stringifyConformanceErrors(
    results: InstanceDirectoryValidationResult[],
  ): null | string {
    const directoriesWithErrors = results.filter((result) =>
      result.results.some((fileResult) => fileResult.errors.length > 0),
    );
    if (directoriesWithErrors.length === 0) return null;

    const count = directoriesWithErrors.length;
    const header = `Conformance validation failed — ${String(count)} director${count === 1 ? "y" : "ies"} with errors.`;
    const body = directoriesWithErrors.flatMap(
      ({ directoryName, results: fileResults }, index) =>
        this.formatDirectoryLines(directoryName, fileResults, index),
    );
    return [header, ...body].join("\n");
  }

  /**
   * Validates all template files in a directory against the instance directory.
   */
  validateInstanceDirectory(args: {
    descriptionOverride?: string;
    instanceDirectoryPath: string;
    nameOverride?: string;
    templateDirectoryPath: string;
  }): InstanceDirectoryValidationResult {
    const {
      descriptionOverride,
      instanceDirectoryPath,
      nameOverride,
      templateDirectoryPath,
    } = args;
    const name =
      nameOverride === undefined
        ? path.basename(instanceDirectoryPath)
        : nameOverride;
    const data = this.buildNameData(name);
    const description =
      descriptionOverride === undefined
        ? this.resolveProjectDescription(instanceDirectoryPath)
        : descriptionOverride;
    const substitutions = { ...data, description };

    const templateFilenames = fs
      .readdirSync(templateDirectoryPath, { withFileTypes: true })
      .filter((node) => node.isFile())
      .map((node) => node.name);

    const results = templateFilenames.map((templateFilename) =>
      this.resolveTemplateFile({
        data: substitutions,
        instanceDirectoryPath,
        templateDirectoryPath,
        templateFilename,
      }),
    );

    return { directoryName: name, results };
  }

  /**
   * Validates one instance file against one template file.
   */
  validateInstanceFile(args: {
    data: Record<string, unknown>;
    instanceFilePath: string;
    templateFilePath: string;
  }): {
    errors: ConformanceError[];
    instanceFilePath: string;
    templateFilePath: string;
  } {
    const { data, instanceFilePath, templateFilePath } = args;
    try {
      const instance = fs.readFileSync(instanceFilePath, "utf8");
      const template = fs.readFileSync(templateFilePath, "utf8");
      const filename = path.basename(instanceFilePath);
      const extension = filename.slice(filename.lastIndexOf("."));
      const { errors } = this.selectValidator({
        data,
        extension,
        filename,
        instance,
        template,
      });
      return { errors, instanceFilePath, templateFilePath };
    } catch (error) {
      if (this.isNodeJsErrnoException(error) && error.code === "ENOENT") {
        return this.buildMissingFileError(instanceFilePath, templateFilePath);
      }
      throw error;
    }
  }
}
