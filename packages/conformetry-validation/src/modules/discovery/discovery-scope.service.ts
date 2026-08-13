import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  EXCLUDED_MODULE_NAMES,
  GENERATOR_TAG_PREFIX,
  MODULE_GENERATOR_MARKERS,
  MODULES_DIRECTORY,
} from "./discovery.constants";

import type {
  GeneratorScopeKind,
  ScopedPath,
  WorkspaceProject,
} from "./discovery.types";
import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

/**
 * Decides which directories a generator's templates should be compared
 * against.
 *
 * A scaffolding generator such as `nestjs-service-project` describes a project
 * root. A module generator such as `nestjs-service-module` describes one
 * directory under `src/modules` — and comparing its templates against the
 * project root instead finds nothing, which is why nothing inside
 * `src/modules/*` was ever validated.
 */
@Injectable()
export class DiscoveryScopeService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Returns whether a module directory is governed by a generator, by looking
   * for the files that generator's templates produce.
   *
   * A generator with no declared markers governs no module, so an unrecognized
   * module generator checks nothing rather than demanding its files of every
   * module in the workspace.
   */
  private governsModule(args: {
    generatorName: string;
    moduleDirectoryPath: string;
  }): boolean {
    const markers = MODULE_GENERATOR_MARKERS[args.generatorName];

    if (markers === undefined) {
      return false;
    }

    const moduleName = path.basename(args.moduleDirectoryPath);
    const hasSuffix = (suffix: string): boolean => {
      return fs.existsSync(
        path.join(args.moduleDirectoryPath, `${moduleName}${suffix}`),
      );
    };

    return (
      markers.required.every((suffix) => hasSuffix(suffix)) &&
      !markers.forbidden.some((suffix) => hasSuffix(suffix))
    );
  }

  /** Lists a project's feature module directories. */
  private readModuleDirectories(projectRootPath: string): string[] {
    const modulesRootPath = path.join(projectRootPath, MODULES_DIRECTORY);

    if (!fs.existsSync(modulesRootPath)) {
      return [];
    }

    return fs
      .readdirSync(modulesRootPath, { withFileTypes: true })
      .filter((entry) => {
        return entry.isDirectory() && !EXCLUDED_MODULE_NAMES.has(entry.name);
      })
      .map((entry) => path.join(modulesRootPath, entry.name))
      .toSorted();
  }

  /**
   * Names the project-scoped generator a project declares, if any.
   *
   * A project is only validated against a project template when it says which
   * one produced it, via a `generator:<name>` tag. Guessing from file overlap
   * instead is actively wrong: a React application and a NestJS CLI both have
   * a `package.json`, `tsconfig.json`, and `README.md`, so every untagged
   * project matched some generator and was then told it was missing that
   * generator's entire scaffold.
   *
   * Returning nothing means "no project template applies", not "this project
   * is fine" — module-scoped rules still run, and are matched on marker files
   * rather than on a tag.
   */
  private readProjectCandidates(args: {
    configuration: ConformetryConfiguration;
    project: WorkspaceProject;
  }): string[] {
    const taggedName = args.project.tags
      .find((tag) => tag.startsWith(GENERATOR_TAG_PREFIX))
      ?.slice(GENERATOR_TAG_PREFIX.length)
      .trim();

    if (taggedName === undefined) {
      return [];
    }

    const definition = args.configuration.generators[taggedName];

    return definition !== undefined &&
      this.readScopeKind(taggedName) === "project"
      ? [taggedName]
      : [];
  }

  // 🌎 Public Methods

  /**
   * Infers a generator's scope from its name.
   *
   * Naming is the signal because it is already the convention every generator
   * follows: `*-module` describes a module directory, everything else
   * describes a project.
   */
  public readScopeKind(generatorName: string): GeneratorScopeKind {
    return generatorName.endsWith("-module") ? "module" : "project";
  }

  /**
   * Expands one project into the directories to validate, each paired with the
   * generators that could govern it.
   *
   * The project root appears once with its candidate generators rather than
   * once per generator: offering all of them to one comparison lets template
   * matching choose, instead of every generator's templates being demanded of
   * the same directory at once.
   */
  public resolveScopedPaths(args: {
    configuration: ConformetryConfiguration;
    project: WorkspaceProject;
    workingDirectory: string;
  }): ScopedPath[] {
    const projectRootPath = path.resolve(
      args.workingDirectory,
      args.project.rootPath,
    );
    const moduleGeneratorNames = Object.keys(
      args.configuration.generators,
    ).filter((generatorName) => {
      return this.readScopeKind(generatorName) === "module";
    });

    const projectCandidates = this.readProjectCandidates(args);

    return [
      ...(projectCandidates.length === 0
        ? []
        : [{ generatorNames: projectCandidates, path: projectRootPath }]),
      ...this.readModuleDirectories(projectRootPath).flatMap(
        (moduleDirectoryPath) => {
          const governing = moduleGeneratorNames.filter((generatorName) => {
            return this.governsModule({ generatorName, moduleDirectoryPath });
          });

          return governing.length === 0
            ? []
            : [{ generatorNames: governing, path: moduleDirectoryPath }];
        },
      ),
    ];
  }
}
