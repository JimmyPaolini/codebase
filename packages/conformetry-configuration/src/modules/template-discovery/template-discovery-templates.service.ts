import fs from "node:fs";
import path from "node:path";

import { RenderingService } from "@conformetry/generation";
import { Injectable } from "@nestjs/common";

import type { TemplateDefinition } from "./template-discovery.types";
import type { PreparedValidationDocument } from "@conformetry/core";
import type { Substitutions } from "@conformetry/generation";

/**
 * Reads template folders and maps their files onto instance files.
 *
 * A template's tree is laid over the instance path verbatim, so a template
 * that should produce a folder contains that folder — `{{nameKebabCase}}/…` —
 * rather than the runtime inventing one. That keeps the shape of the output
 * visible in the template itself, and lets one template produce a folder while
 * another produces loose files, with nothing but their contents to say so.
 *
 * Rendering goes through `RenderingService` so a template is substituted here
 * exactly as it was when the generator wrote the file — otherwise validation
 * would report differences the generator itself introduced.
 */
@Injectable()
export class TemplateDiscoveryTemplatesService {
  // 🏗 Dependency Injection

  constructor(private readonly renderingService: RenderingService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Lists every file under a directory, recursively and sorted. */
  private collectFilePaths(directoryPath: string): string[] {
    if (!fs.existsSync(directoryPath)) {
      return [];
    }

    const filePaths: string[] = [];
    const pendingDirectoryPaths = [directoryPath];

    while (pendingDirectoryPaths.length > 0) {
      const currentDirectoryPath = pendingDirectoryPaths.pop();

      /* v8 ignore next 3 -- the loop condition already proves the stack is not empty */
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
          filePaths.push(entryPath);
        }
      }
    }

    return filePaths.toSorted();
  }

  // 🌎 Public Methods

  /**
   * Reads one template folder.
   *
   * The folder is the whole definition — nothing but the files it contains is
   * needed to validate against it.
   */
  public collectTemplate(args: {
    name: string;
    templatePath: string;
    threshold?: number | undefined;
  }): TemplateDefinition {
    return {
      directoryPath: args.templatePath,
      filePaths: this.collectFilePaths(args.templatePath),
      name: args.name,
      ...(args.threshold === undefined ? {} : { threshold: args.threshold }),
    };
  }

  /**
   * Counts how many of a template's files the instance path already has.
   *
   * When a file scope is given, only files inside it count — that is what lets
   * a file glob select a template describing exactly those files rather than
   * the larger template describing the whole directory.
   */
  public countMatchingFiles(args: {
    fileScope?: string[] | undefined;
    instancePath: string;
    substitutions: Substitutions;
    template: TemplateDefinition;
  }): number {
    const scope =
      args.fileScope === undefined ? undefined : new Set(args.fileScope);

    return args.template.filePaths.filter((templateFilePath) => {
      const instanceFilePath = this.resolveInstanceFilePath({
        instancePath: args.instancePath,
        substitutions: args.substitutions,
        templateDirectoryPath: args.template.directoryPath,
        templateFilePath,
      });

      if (scope !== undefined && !scope.has(instanceFilePath)) {
        return false;
      }

      return fs.existsSync(instanceFilePath);
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
    instancePath: string;
    substitutions: Substitutions;
    templateDirectoryPath: string;
    templateFilePath: string;
  }): PreparedValidationDocument | undefined {
    const instanceFilePath = this.resolveInstanceFilePath(args);

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

  /** Maps a template file path to the instance file path it governs. */
  public resolveInstanceFilePath(args: {
    instancePath: string;
    substitutions: Substitutions;
    templateDirectoryPath: string;
    templateFilePath: string;
  }): string {
    return path.join(
      args.instancePath,
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
