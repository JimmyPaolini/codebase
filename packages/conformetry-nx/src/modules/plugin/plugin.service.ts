import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ConfigurationService,
  DiscoveryService,
} from "@jimmypaolini/conformetry-configuration";
import { ReportingService } from "@jimmypaolini/conformetry-core";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { Injectable } from "@nestjs/common";

import { AdapterService } from "../adapter/adapter.service";
import { CandidatesService } from "../candidates/candidates.service";
import { CONFORMETRY_NX_PLUGIN_NAME } from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { PathsService } from "../paths/paths.service";

import {
  LANGUAGE_MODULE_LOADER,
  PROJECT_CONFIGURATION_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "./plugin.constants";

import type { ProjectScope } from "../candidates/candidates.types";
import type {
  InferredTargets,
  InferTargetsArguments,
  RunGeneratorArguments,
  RunValidationArguments,
  RunValidationResult,
} from "./plugin.types";
import type { TemplateDefinition } from "@jimmypaolini/conformetry-configuration";

/**
 * The plugin's whole surface: infer targets, generate, validate.
 *
 * Every entry point resolves the plugin's options and the conformetry
 * configuration itself rather than taking them apart, so the Nx-facing
 * functions in `index.ts` stay thin wrappers with no logic of their own.
 */
@Injectable()
export class PluginService {
  // 🏗 Dependency Injection

  constructor(
    private readonly adapterService: AdapterService,
    private readonly candidatesService: CandidatesService,
    private readonly configurationService: ConfigurationService,
    private readonly discoveryService: DiscoveryService,
    private readonly generationService: GenerationService,
    private readonly optionsService: OptionsService,
    private readonly pathsService: PathsService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * Reads one project's name, root, and tags from its `project.json`.
   *
   * Read directly rather than taken from the project graph, because inferring
   * targets is part of *building* that graph — it does not exist yet.
   */
  private readProjectScope(args: {
    projectConfigurationFile: string;
    workspaceRoot: string;
  }): ProjectScope {
    const root = path.dirname(args.projectConfigurationFile);
    const parsed: unknown = JSON.parse(
      readFileSync(
        path.resolve(args.workspaceRoot, args.projectConfigurationFile),
        "utf8",
      ),
    );
    const configuration: { name?: unknown; tags?: unknown } =
      typeof parsed === "object" && parsed === null ? {} : { ...parsed };
    const tags = this.isUnknownArray(configuration.tags)
      ? configuration.tags
      : [];

    return {
      name: typeof configuration.name === "string" ? configuration.name : root,
      root,
      tags: tags.filter((tag) => typeof tag === "string"),
    };
  }

  /** Reads every configured generator's template folder. */
  private async resolveTemplates(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<TemplateDefinition[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );

    return configuration.map((generator) => {
      return this.discoveryService.collectTemplate({
        name: generator.name,
        templatePath: path.resolve(args.workspaceRoot, generator.templatePath),
      });
    });
  }

  // 🌎 Public Methods

  /**
   * Infers a validation target onto every project that holds at least one
   * instance.
   *
   * Projects with nothing to validate get no target at all, rather than a
   * target that trivially passes — an empty target still costs a task in every
   * `run-many`, and it makes `nx show project` claim a capability the project
   * does not have.
   */
  public async inferTargets(
    args: InferTargetsArguments,
  ): Promise<Map<string, InferredTargets>> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const targetsByProjectRoot = new Map<string, InferredTargets>();

    for (const projectConfigurationFile of args.projectConfigurationFiles.filter(
      (filePath) => {
        return path.basename(filePath) === PROJECT_CONFIGURATION_FILENAME;
      },
    )) {
      const project = this.readProjectScope({
        projectConfigurationFile,
        workspaceRoot: args.workspaceRoot,
      });

      if (project.root === WORKSPACE_PROJECT_ROOT) {
        continue;
      }

      const candidates = await this.candidatesService.resolveProjectCandidates({
        configurationPath: pluginOptions.configurationPath,
        project,
        workspaceRoot: args.workspaceRoot,
      });

      if (candidates.length === 0) {
        continue;
      }

      targetsByProjectRoot.set(project.root, {
        [pluginOptions.validateTargetName]: {
          cache: true,
          executor: `${CONFORMETRY_NX_PLUGIN_NAME}:validate`,
          options: {},
        },
      });
    }

    return targetsByProjectRoot;
  }

  /**
   * Runs one configured generator against an Nx tree.
   *
   * Nothing is written to disk here — the tree records the writes and Nx
   * decides whether to flush them, which is what makes `--dry-run` honest.
   */
  public async runGenerator(args: RunGeneratorArguments): Promise<string[]> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        pluginOptions.configurationPath,
      );
    const definition = configuration.find((generator) => {
      return generator.name === args.generatorName;
    });

    if (definition === undefined) {
      throw new Error(
        `Unknown conformetry generator: ${args.generatorName}. Configured generators: ${configuration.map((generator) => generator.name).join(", ")}.`,
      );
    }

    const adapters = this.adapterService.createAdapters({
      tree: args.tree,
      workspaceRoot: args.workspaceRoot,
    });
    const inputs = this.optionsService.resolveGeneratorInputs(args.options);
    const { generatedFilePaths } = await this.generationService.runGenerator({
      definition: {
        name: definition.name,
        templateDirectoryPath: path.resolve(
          args.workspaceRoot,
          definition.templatePath,
        ),
      },
      filesystem: adapters.filesystem,
      formatter: adapters.formatter,
      inputs,
      instancePath: await this.pathsService.resolveGenerationPath({
        configurationPath: pluginOptions.configurationPath,
        inputs,
        tree: args.tree,
        workspaceRoot: args.workspaceRoot,
      }),
    });

    return generatedFilePaths;
  }

  /** Validates one project's instances and renders the report. */
  public async runValidation(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const result = await this.validationService.validate({
      candidates: await this.candidatesService.resolveProjectCandidates({
        configurationPath: pluginOptions.configurationPath,
        project: args.project,
        workspaceRoot: args.workspaceRoot,
      }),
      ...(args.languageNames === undefined
        ? {}
        : { languageNames: args.languageNames }),
      loadLanguageModule: LANGUAGE_MODULE_LOADER,
      templates: await this.resolveTemplates({
        configurationPath: pluginOptions.configurationPath,
        workspaceRoot: args.workspaceRoot,
      }),
    });

    return {
      ok: result.ok,
      report: this.reportingService.formatReport({
        fileResults: result.fileResults,
        workingDirectory: args.workspaceRoot,
      }),
    };
  }
}
