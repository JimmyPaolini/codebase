import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Injectable } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SpelunkerModule } from "nestjs-spelunker";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";
import { SyntheticRootModule } from "./nestjs-module-graphs-synthetic.module";
import {
  NESTJS_MODULE_GRAPH_IGNORED_MODULES,
  NESTJS_MODULE_GRAPH_MODULE_FILE_SUFFIX,
  NESTJS_MODULE_GRAPH_PROJECT_DIRECTORIES,
  NESTJS_MODULE_GRAPH_PROJECT_TAG,
  NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT,
  NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE,
  NESTJS_MODULE_GRAPH_SYNTHETIC_IGNORED_MODULES,
} from "./nestjs-module-graphs.constants";

import type {
  NestjsModuleGraph,
  NestjsProject,
} from "./nestjs-module-graphs.types";
import type { DynamicModule, Type } from "@nestjs/common";

/**
 * Discovers the workspace's NestJS projects and explores each one's modules.
 *
 * Exploration runs the container in NestJS preview mode, which registers every
 * module and provider without instantiating any of them. That is what makes a
 * project safe to graph from a workstation or from CI: `lexico-ingestion`
 * builds its `TypeOrmModule.forRootAsync` options without a database ever
 * being contacted.
 */
@Injectable()
export class NestjsModuleGraphsService {
  // 🏗 Dependency Injection

  constructor(private readonly graphService: NestjsModuleGraphsGraphService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Roots a package that bootstraps nothing in every module it defines. */
  private async buildSyntheticRootModule(
    project: NestjsProject,
  ): Promise<DynamicModule> {
    const moduleFiles = this.findModuleFiles(
      path.join(project.absoluteRoot, "src"),
    );
    const loadedClasses = await Promise.all(
      moduleFiles.map(async (file) => this.loadModuleClasses(file)),
    );

    return SyntheticRootModule.forModules(loadedClasses.flat());
  }

  /** Finds every module definition file beneath a directory. */
  private findModuleFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];

    const moduleFiles: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        moduleFiles.push(...this.findModuleFiles(target));
      } else if (entry.name.endsWith(NESTJS_MODULE_GRAPH_MODULE_FILE_SUFFIX)) {
        moduleFiles.push(target);
      }
    }

    return moduleFiles.toSorted((first, second) => first.localeCompare(second));
  }

  /** Imports a module file and returns every module class it exports. */
  private async loadModuleClasses(file: string): Promise<Type<unknown>[]> {
    const loaded = (await import(pathToFileURL(file).href)) as Record<
      string,
      Type<unknown> | undefined
    >;

    return Object.entries(loaded)
      .filter(
        (entry): entry is [string, Type<unknown>] =>
          entry[0].endsWith("Module") && typeof entry[1] === "function",
      )
      .map(([, moduleClass]) => moduleClass);
  }

  /** Imports a root module file and returns the module class it exports. */
  private async loadRootModule(rootModuleFile: string): Promise<Type<unknown>> {
    const loaded = (await import(pathToFileURL(rootModuleFile).href)) as Record<
      string,
      Type<unknown> | undefined
    >;
    const rootModule = loaded[NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT];

    if (typeof rootModule !== "function") {
      throw new TypeError(
        `Expected ${rootModuleFile} to export a ${NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT} class`,
      );
    }

    return rootModule;
  }

  /** Reads a project's Nx tags, or an empty list when it declares none. */
  private readProjectTags(projectFile: string): string[] {
    const configuration = JSON.parse(readFileSync(projectFile, "utf8")) as {
      tags?: string[];
    };

    return configuration.tags ?? [];
  }

  // 🌎 Public Methods

  /** Describes a project, noting whether it bootstraps a root module. */
  describeProject(absoluteRoot: string, name: string): NestjsProject {
    const rootModuleFile = path.join(
      absoluteRoot,
      NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE,
    );

    return {
      absoluteRoot,
      name,
      rootModuleFile: existsSync(rootModuleFile) ? rootModuleFile : undefined,
    };
  }

  /**
   * Finds every project tagged as a NestJS project.
   *
   * Projects are returned in a stable order so a run reports them the same way
   * every time regardless of how the filesystem enumerates directories.
   */
  discoverProjects(workspaceRoot: string): NestjsProject[] {
    const projects: NestjsProject[] = [];

    for (const directory of NESTJS_MODULE_GRAPH_PROJECT_DIRECTORIES) {
      const absoluteDirectory = path.join(workspaceRoot, directory);
      if (!existsSync(absoluteDirectory)) continue;

      for (const entry of readdirSync(absoluteDirectory, {
        withFileTypes: true,
      })) {
        const absoluteRoot = path.join(absoluteDirectory, entry.name);

        if (this.isNestjsProject(entry.isDirectory(), absoluteRoot)) {
          projects.push(this.describeProject(absoluteRoot, entry.name));
        }
      }
    }

    return projects.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /** Explores a project's container in preview mode and reduces it to a graph. */
  async exploreProject(project: NestjsProject): Promise<NestjsModuleGraph> {
    const { rootModuleFile } = project;
    const rootModule =
      rootModuleFile === undefined
        ? await this.buildSyntheticRootModule(project)
        : await this.loadRootModule(rootModuleFile);

    const application = await NestFactory.createApplicationContext(rootModule, {
      abortOnError: false,
      logger: false,
      preview: true,
    });

    try {
      return this.graphService.buildGraph(
        SpelunkerModule.explore(application, {
          ignoreImports: [
            ...NESTJS_MODULE_GRAPH_IGNORED_MODULES,
            ...(rootModuleFile === undefined
              ? NESTJS_MODULE_GRAPH_SYNTHETIC_IGNORED_MODULES
              : []),
          ],
        }),
      );
    } finally {
      await application.close();
    }
  }

  /** Reports whether a directory entry is a project this command graphs. */
  isNestjsProject(isDirectory: boolean, absoluteRoot: string): boolean {
    const projectFile = path.join(absoluteRoot, "project.json");

    if (!isDirectory || !existsSync(projectFile)) return false;

    return this.readProjectTags(projectFile).includes(
      NESTJS_MODULE_GRAPH_PROJECT_TAG,
    );
  }
}
