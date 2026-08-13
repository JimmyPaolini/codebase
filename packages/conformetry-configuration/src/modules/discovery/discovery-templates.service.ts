import fs from "node:fs";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Injectable } from "@nestjs/common";

import type { PreparedValidationDocument } from "@jimmypaolini/conformetry-core";

/**
 * Reads template trees and pairs each template file with its instance file.
 *
 * Rendering goes through `RenderingService` so a template is substituted here
 * exactly as it was when the generator wrote the file — otherwise validation
 * would report differences the generator itself introduced.
 */
@Injectable()
export class DiscoveryTemplatesService {
  // 🏗 Dependency Injection

  constructor(private readonly renderingService: RenderingService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Lists every file under a template directory, recursively and sorted.
   *
   * A directory that does not exist yields no files rather than throwing: a
   * generator can be declared before its templates are written, and that
   * should not abort validation of every other project.
   */
  public collectTemplateFilePaths(templateDirectoryPath: string): string[] {
    if (!fs.existsSync(templateDirectoryPath)) {
      return [];
    }

    const templateFilePaths: string[] = [];
    const pendingDirectoryPaths = [templateDirectoryPath];

    while (pendingDirectoryPaths.length > 0) {
      const currentDirectoryPath = pendingDirectoryPaths.pop();

      if (currentDirectoryPath === undefined) {
        continue;
      }

      for (const entry of fs.readdirSync(currentDirectoryPath, {
        withFileTypes: true,
      })) {
        const entryPath = path.join(currentDirectoryPath, entry.name);

        if (entry.isDirectory()) {
          pendingDirectoryPaths.push(entryPath);
        } else if (entry.isFile()) {
          templateFilePaths.push(entryPath);
        }
      }
    }

    return templateFilePaths.toSorted();
  }

  /**
   * Counts how many of a template's files already exist in a project.
   *
   * This is the primary evidence the matcher ranks candidates by: the template
   * with the most files already present is almost certainly the one that
   * generated the project.
   */
  public countExistingFiles(args: {
    projectPath: string;
    substitutions: Record<string, string>;
    templateDirectoryPath: string;
    templateFilePaths: string[];
  }): number {
    return args.templateFilePaths.filter((templateFilePath) => {
      return fs.existsSync(
        this.resolveInstancePath({
          projectPath: args.projectPath,
          substitutions: args.substitutions,
          templateDirectoryPath: args.templateDirectoryPath,
          templateFilePath,
        }),
      );
    }).length;
  }

  /**
   * Pairs one template file with its instance, rendering the template.
   *
   * Returns `undefined` when the instance does not exist — that is a missing
   * file, which `conformetry-files` reports; a language validator has nothing
   * to compare and should not see the pair at all.
   */
  public prepareDocument(args: {
    projectPath: string;
    substitutions: Record<string, string>;
    templateDirectoryPath: string;
    templateFilePath: string;
  }): PreparedValidationDocument | undefined {
    const instanceFilePath = this.resolveInstancePath(args);

    if (!fs.existsSync(instanceFilePath)) {
      return undefined;
    }

    return {
      filename: path.basename(instanceFilePath),
      instance: fs.readFileSync(instanceFilePath, "utf8"),
      instanceFilePath,
      renderedTemplate: this.renderingService.renderContent({
        substitutions: args.substitutions,
        templateContent: fs.readFileSync(args.templateFilePath, "utf8"),
      }),
      templateFilePath: args.templateFilePath,
    };
  }

  /** Maps a template file path to the instance path it governs. */
  public resolveInstancePath(args: {
    projectPath: string;
    substitutions: Record<string, string>;
    templateDirectoryPath: string;
    templateFilePath: string;
  }): string {
    return path.join(
      args.projectPath,
      this.renderingService.renderPath({
        substitutions: args.substitutions,
        templatePath: path.relative(
          args.templateDirectoryPath,
          args.templateFilePath,
        ),
      }),
    );
  }
}
