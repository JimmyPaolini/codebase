import path from "node:path";

import { Injectable } from "@nestjs/common";
import { getProjects } from "@nx/devkit";
import _ from "lodash";
import prompts from "prompts";

import { MODULES_DIRECTORY } from "../../constants";

import type { Tree } from "@nx/devkit";

/**
 * Resolves validated generator inputs from CLI options and interactive prompts.
 */
@Injectable()
export class ResolverService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields
  readonly errorMessages = {
    moduleEmpty: `Module is required`,
    nameCase: `Name must be in kebab-case`,
    nameEmpty: `Name is required`,
    projectEmpty: `Project is required`,
    typeEmpty: `Type is required`,
  } as const;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds an error message for an invalid type choice. */
  private buildTypeChoiceError(
    input: string,
    choices: readonly string[],
  ): string {
    return `Type "${input}" is not valid. Allowed values: ${choices.join(", ")}`;
  }

  /** Resolves non-empty module names for a project. */
  private resolveModulesByProject(args: {
    project: string;
    tree: Tree;
  }): string[] {
    const { project, tree } = args;

    const modulesDirectoryPath = this.resolveProjectDirectoryPath(
      tree,
      project,
      MODULES_DIRECTORY,
    );
    const modules = tree
      .children(modulesDirectoryPath)
      .filter((moduleDirectoryName: string): boolean => {
        return (
          tree.children(path.join(modulesDirectoryPath, moduleDirectoryName))
            .length > 0
        );
      })
      .toSorted();

    if (modules.length === 0) {
      throw new Error(
        `No modules found in project "${project}". Create a module first before generating service files.`,
      );
    }

    return modules;
  }

  /**
   * Resolves the configured root path for a project.
   */
  private resolveProjectPath(tree: Tree, projectName: string): string {
    const projectConfiguration = getProjects(tree).get(projectName);
    const projectRoot =
      projectConfiguration?.root ?? projectConfiguration?.sourceRoot;

    if (!projectRoot) {
      throw new Error(
        `Project "${projectName}" has no root directory configured`,
      );
    }

    return projectRoot;
  }

  /**
   * Validates a single choice input for select-based prompts.
   */
  private validateChoiceInput(args: {
    buildChoiceError: (input: string) => string;
    choices: readonly string[];
    emptyError: string;
    input: unknown;
  }): string | true {
    const { buildChoiceError, choices, emptyError, input } = args;

    if (typeof input !== "string" || input.trim() === "") {
      return emptyError;
    }

    if (!choices.includes(input)) {
      return buildChoiceError(input);
    }

    return true;
  }

  // 🌎 Public Methods

  /**
   * Returns the list of project names that include a tag.
   */
  getProjectsByTag(args: { tag: string; tree: Tree }): string[] {
    const { tag, tree } = args;
    const allProjects = getProjects(tree);

    const projectsWithTag = [...allProjects.entries()]
      .filter(([, projectConfiguration]) => {
        return projectConfiguration.tags?.includes(tag);
      })
      .map(([projectName]) => projectName)
      .toSorted();

    if (projectsWithTag.length === 0) {
      throw new Error(`No projects with tag "${tag}" found in the workspace`);
    }

    return projectsWithTag;
  }

  /**
   * Resolves a module name from CLI option input or an interactive prompt.
   */
  async resolveModule(args: {
    message: string;
    project: string;
    tree: Tree;
    value: string | undefined;
  }): Promise<string> {
    const { message, project, tree, value } = args;
    const modules = this.resolveModulesByProject({
      project,
      tree,
    });

    const buildModuleError = (moduleName: string): string => {
      return `Module "${moduleName}" does not exist in project "${project}". Available modules: ${modules.join(", ")}`;
    };

    if (typeof value === "string" && value.trim() !== "") {
      const directValidation = this.validateChoiceInput({
        buildChoiceError: buildModuleError,
        choices: modules,
        emptyError: this.errorMessages.moduleEmpty,
        input: value,
      });

      if (directValidation !== true) {
        throw new Error(directValidation);
      }

      return value;
    }

    const response = (await prompts<"module">({
      choices: modules.map((moduleName) => {
        return { title: moduleName, value: moduleName };
      }),
      message,
      name: "module",
      type: "select",
      validate: (input: unknown): string | true => {
        return this.validateChoiceInput({
          buildChoiceError: buildModuleError,
          choices: modules,
          emptyError: this.errorMessages.moduleEmpty,
          input,
        });
      },
    })) as { module?: string };

    const promptedValidation = this.validateChoiceInput({
      buildChoiceError: buildModuleError,
      choices: modules,
      emptyError: this.errorMessages.moduleEmpty,
      input: response.module,
    });

    if (promptedValidation !== true) {
      throw new Error(promptedValidation);
    }
    const moduleResponse = response.module;

    if (typeof moduleResponse !== "string") {
      throw new TypeError(this.errorMessages.moduleEmpty);
    }

    return moduleResponse;
  }

  /**
   * Resolves a kebab-case name from CLI option input or an interactive prompt.
   */
  async resolveName(args: {
    message: string;
    value: string | undefined;
  }): Promise<string> {
    const { message, value } = args;
    const caseError = this.errorMessages.nameCase;
    const emptyError = this.errorMessages.nameEmpty;

    if (typeof value === "string" && value.trim() !== "") {
      if (value !== _.kebabCase(value)) {
        throw new Error(caseError);
      }

      return value;
    }

    const response = (await prompts<"name">({
      message,
      name: "name",
      type: "text",
      validate: (input: unknown): string | true => {
        if (typeof input !== "string" || input.trim() === "") {
          return emptyError;
        }

        if (input !== _.kebabCase(input)) {
          return caseError;
        }

        return true;
      },
    })) as { name?: string };

    const nameResponse: string | undefined = response.name;

    if (typeof nameResponse !== "string" || nameResponse.trim() === "") {
      throw new Error(emptyError);
    }

    if (nameResponse !== _.kebabCase(nameResponse)) {
      throw new Error(caseError);
    }

    return nameResponse;
  }

  /**
   * Resolves a project name from CLI option input or an interactive prompt.
   */
  async resolveProject(args: {
    message: string;
    tag: string;
    tree: Tree;
    value: string | undefined;
  }): Promise<string> {
    const { message, tag, tree, value } = args;
    const projects = this.getProjectsByTag({ tag, tree });
    const buildProjectError = (project: string): string => {
      return `Project "${project}" does not have the "${tag}" tag. Available projects: ${projects.join(", ")}`;
    };

    if (typeof value === "string" && value.trim() !== "") {
      const directValidation = this.validateChoiceInput({
        buildChoiceError: buildProjectError,
        choices: projects,
        emptyError: this.errorMessages.projectEmpty,
        input: value,
      });

      if (directValidation !== true) {
        throw new Error(directValidation);
      }

      return value;
    }

    const response = (await prompts<"project">({
      choices: projects.map((projectName) => {
        return { title: projectName, value: projectName };
      }),
      message,
      name: "project",
      type: "select",
      validate: (input: unknown): string | true => {
        return this.validateChoiceInput({
          buildChoiceError: buildProjectError,
          choices: projects,
          emptyError: this.errorMessages.projectEmpty,
          input,
        });
      },
    })) as { project?: string };

    const promptedValidation = this.validateChoiceInput({
      buildChoiceError: buildProjectError,
      choices: projects,
      emptyError: this.errorMessages.projectEmpty,
      input: response.project,
    });

    if (promptedValidation !== true) {
      throw new Error(promptedValidation);
    }
    const projectResponse = response.project;

    if (typeof projectResponse !== "string") {
      throw new TypeError(this.errorMessages.projectEmpty);
    }

    return projectResponse;
  }

  /**
   * Resolves and validates a directory inside a project root.
   */
  resolveProjectDirectoryPath(
    tree: Tree,
    projectName: string,
    directoryPath: string,
  ): string {
    const resolvedProjectPath = this.resolveProjectPath(tree, projectName);
    const resolvedDirectoryPath = path.join(resolvedProjectPath, directoryPath);

    if (!tree.exists(resolvedDirectoryPath)) {
      throw new Error(
        `Directory "${resolvedDirectoryPath}" does not exist in project "${projectName}"`,
      );
    }

    return resolvedDirectoryPath;
  }

  /**
   * Resolves a type value from CLI option input or an interactive prompt.
   */
  async resolveType(args: {
    choices?: readonly string[];
    message: string;
    value: string | undefined;
  }): Promise<string> {
    const { message, value } = args;
    const emptyError = this.errorMessages.typeEmpty;
    const choices = args.choices ?? ["applications", "packages", "tools"];
    const buildChoiceError = (input: string): string => {
      return this.buildTypeChoiceError(input, choices);
    };

    if (typeof value === "string" && value.trim() !== "") {
      const directValidation = this.validateChoiceInput({
        buildChoiceError,
        choices,
        emptyError,
        input: value,
      });

      if (directValidation !== true) {
        throw new Error(directValidation);
      }

      return value;
    }

    const response = (await prompts<"type">({
      choices: choices.map((choice) => ({ title: choice, value: choice })),
      initial: choices.indexOf("applications"),
      message,
      name: "type",
      type: "select",
      validate: (input: unknown): string | true => {
        return this.validateChoiceInput({
          buildChoiceError,
          choices,
          emptyError,
          input,
        });
      },
    })) as { type?: string };

    const promptedValidation = this.validateChoiceInput({
      buildChoiceError,
      choices,
      emptyError,
      input: response.type,
    });

    if (promptedValidation !== true) {
      throw new Error(promptedValidation);
    }

    return (
      response.type ??
      (() => {
        throw new TypeError(emptyError);
      })()
    );
  }
}
