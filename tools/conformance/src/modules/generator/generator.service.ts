import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { workspaceRoot } from "@nx/devkit";
import _ from "lodash";
import mustache from "mustache";
import { flushChanges } from "nx/src/generators/tree";

import type { NameSubstitutions } from "./generator.types";
import type { Tree } from "@nx/devkit";

/**
 * Shared generator service for handling file generation and template rendering.
 */
@Injectable()
export class GeneratorService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** String-case enum values used by generator substitutions. */
  public readonly stringCase = {
    CAMEL_CASE: "CAMEL_CASE",
    KEBAB_CASE: "KEBAB_CASE",
    PASCAL_CASE: "PASCAL_CASE",
    SNAKE_CASE: "SNAKE_CASE",
  } as const;

  /** Maps string-case enum values to conversion functions. */
  public readonly converterByStringCase: Record<
    "CAMEL_CASE" | "KEBAB_CASE" | "PASCAL_CASE" | "SNAKE_CASE",
    (value: string) => string
  > = {
    [this.stringCase.CAMEL_CASE]: (value) => _.camelCase(value),
    [this.stringCase.KEBAB_CASE]: (value) => _.kebabCase(value),
    [this.stringCase.PASCAL_CASE]: (value) => _.upperFirst(_.camelCase(value)),
    [this.stringCase.SNAKE_CASE]: (value) => _.snakeCase(value),
  };

  // 🔏 Private Methods

  /**
   * Recursively renders templates into the target directory.
   */
  private generateFilesRecursively<
    Substitutions extends Record<keyof Substitutions, string>,
  >(args: {
    instanceDirectoryPath: string;
    substitutions: Substitutions;
    templateDirectoryPath: string;
    tree: Tree;
  }): void {
    const {
      instanceDirectoryPath,
      substitutions,
      templateDirectoryPath,
      tree,
    } = args;

    const renderTemplateName = (name: string): string => {
      return name.replaceAll(
        /__(\w+)__/g,
        (token: string, field: string): string => {
          const substitutionValue = (
            substitutions as Partial<Record<string, string>>
          )[field];

          if (substitutionValue === undefined) {
            return token;
          }

          return substitutionValue;
        },
      );
    };

    const templateNodes = fs.readdirSync(templateDirectoryPath, {
      withFileTypes: true,
    });

    for (const templateNode of templateNodes) {
      const instanceName = renderTemplateName(templateNode.name);
      const instancePath = path.join(instanceDirectoryPath, instanceName);
      const nextTemplatePath = path.join(
        templateDirectoryPath,
        templateNode.name,
      );

      if (templateNode.isDirectory()) {
        this.generateFilesRecursively({
          instanceDirectoryPath: instancePath,
          substitutions,
          templateDirectoryPath: nextTemplatePath,
          tree,
        });
      } else {
        const template = fs.readFileSync(nextTemplatePath, "utf8");
        const instance = mustache.render(template, substitutions);
        tree.write(instancePath, instance);
      }
    }
  }

  // 🌎 Public Methods

  /**
   * Builds a compact log message for generator command output.
   */
  buildLogMessage(args: {
    data: unknown;
    emoji: string;
    label: string;
  }): string {
    const { data, emoji, label } = args;

    return `${emoji} ${label}: ${JSON.stringify(data)}`;
  }

  /**
   * Builds standard template substitutions from a kebab-case name.
   */
  buildNameSubstitutions(name: string): NameSubstitutions {
    const substitutions: NameSubstitutions = {
      nameCamelCase:
        this.converterByStringCase[this.stringCase.CAMEL_CASE](name),
      nameKebabCase:
        this.converterByStringCase[this.stringCase.KEBAB_CASE](name),
      namePascalCase:
        this.converterByStringCase[this.stringCase.PASCAL_CASE](name),
      nameSnakeCase:
        this.converterByStringCase[this.stringCase.SNAKE_CASE](name),
    };
    return substitutions;
  }

  /**
   * Renders templates, flushes changes, formats files, and returns output paths.
   */
  async generateFiles<
    Substitutions extends Record<keyof Substitutions, string>,
  >(args: {
    instanceDirectoryPath: string;
    substitutions: Substitutions;
    templateDirectoryPath: string;
    tree: Tree;
  }): Promise<string[]> {
    this.generateFilesRecursively(args);

    const { instanceDirectoryPath, tree } = args;

    const generatedFiles = tree
      .children(instanceDirectoryPath)
      .map((filename) => path.join(instanceDirectoryPath, filename));

    const generatedFilePaths = this.getGeneratedFilePaths({
      instanceDirectoryPath,
      tree,
    });

    flushChanges(tree.root, tree.listChanges());

    if (generatedFiles.length > 0) {
      execSync(
        `pnpm exec nx format:write --files=${generatedFiles.join(",")}`,
        { cwd: workspaceRoot, stdio: "inherit" },
      );
    }

    await Promise.resolve();

    return generatedFilePaths;
  }

  /**
   * Returns the generated file paths currently staged in the tree.
   */
  getGeneratedFilePaths(args: {
    instanceDirectoryPath: string;
    tree: Tree;
  }): string[] {
    const { instanceDirectoryPath, tree } = args;

    return tree
      .listChanges()
      .map((change) => change.path)
      .filter((filePath) => {
        return (
          filePath === instanceDirectoryPath ||
          filePath.startsWith(`${instanceDirectoryPath}${path.sep}`)
        );
      })
      .toSorted();
  }
}
