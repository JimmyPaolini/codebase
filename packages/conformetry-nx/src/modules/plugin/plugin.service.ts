import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  ConfigurationService,
  DiscoveryService,
} from "@conformetry/configuration";
import { ReportingService } from "@conformetry/core";
import { GenerationService } from "@conformetry/generation";
import { ValidationService } from "@conformetry/validation";
import { Injectable } from "@nestjs/common";

import { AdapterService } from "../adapter/adapter.service";
import { CandidatesService } from "../candidates/candidates.service";
import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
} from "../generator/generator.constants";
import { GeneratorService } from "../generator/generator.service";
import {
  CONFORMETRY_NX_PLUGIN_NAME,
  NX_CONFIGURATION_FILENAME,
  NX_IGNORE_FILENAME,
} from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { PathsService } from "../paths/paths.service";

import {
  LANGUAGE_MODULE_LOADER,
  PROJECT_CONFIGURATION_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "./plugin.constants";

import type { ProjectScope } from "../candidates/candidates.types";
import type { ConformetryPluginOptions } from "../options/options.types";
import type {
  InferredTargets,
  InferTargetsArguments,
  RunGeneratorArguments,
  RunValidationArguments,
  RunValidationResult,
} from "./plugin.types";
import type { TemplateDefinition } from "@conformetry/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * The plugin's whole surface: infer targets, generate, validate.
 *
 * Every entry point resolves the plugin's options and the conformetry
 * configuration itself rather than taking them apart, so the Nx-facing
 * functions in `index.ts` stay thin wrappers with no logic of their own.
 */
@Injectable()
/* v8 ignore stop */
export class PluginService {
  // 🏗 Dependency Injection

  constructor(
    private readonly adapterService: AdapterService,
    private readonly candidatesService: CandidatesService,
    private readonly configurationService: ConfigurationService,
    private readonly discoveryService: DiscoveryService,
    private readonly generatorService: GeneratorService,
    private readonly generationService: GenerationService,
    private readonly optionsService: OptionsService,
    private readonly pathsService: PathsService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Fails when the emitted Nx plugin no longer matches the configuration.
   *
   * `generators.json` and its schemas are derived from `conformetry.config.ts`,
   * so an edit to the configuration that is not followed by `nx sync` leaves Nx
   * offering generators that no longer exist, or hiding ones that do. Comparing
   * here rather than trusting `nx sync:check` means the plugin's own commands
   * cannot run against a stale plugin.
   */
  private async assertEmittedPluginCurrent(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    const emittedFiles = await this.generatorService.emitPlugin({
      configurationPath: args.configurationPath,
      outputPath: DEFAULT_OUTPUT_PATH,
      packageName: DEFAULT_PACKAGE_NAME,
      projects: this.listWorkspaceProjects(args.workspaceRoot),
    });

    for (const emittedFile of emittedFiles) {
      const absolutePath = path.resolve(
        args.workspaceRoot,
        emittedFile.filePath,
      );
      const onDisk = existsSync(absolutePath)
        ? readFileSync(absolutePath, "utf8")
        : undefined;

      if (onDisk !== emittedFile.content) {
        throw new Error(
          `${emittedFile.filePath} is out of date with ${args.configurationPath}. Run \`nx sync\` to regenerate the conformetry generator plugin.`,
        );
      }
    }
  }

  /** Fails fast when the plugin would run against a stale or broken setup. */
  private async assertPluginInSync(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    await this.assertTemplatesExist(args);
    await this.assertEmittedPluginCurrent(args);
  }

  /**
   * Fails when a configured generator points at a template that is not there.
   *
   * Template contents never reach `generators.json`, so a missing template
   * directory is invisible to the drift check above: the emitted plugin still
   * matches the configuration, and the failure only surfaces later as an empty
   * generation or an instance matching nothing.
   */
  private async assertTemplatesExist(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );

    for (const generator of configuration) {
      const templateDirectoryPath = path.resolve(
        args.workspaceRoot,
        generator.templatePath,
      );

      if (!existsSync(templateDirectoryPath)) {
        throw new Error(
          `Generator ${generator.name} names a template at ${generator.templatePath}, which does not exist.`,
        );
      }
    }
  }

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * Walks the workspace for `project.json` files.
   *
   * A walk rather than a glob because this runs from the install-time
   * bootstrap too, where there is no Nx to ask and no project graph to read.
   * Hidden directories and `node_modules` are skipped: the emitted plugin
   * lives in one of them, and walking dependencies would take far longer than
   * the whole emit.
   */
  private listProjectConfigurationFiles(args: {
    directoryPath: string;
    ignoredPaths: string[];
    workspaceRoot: string;
  }): string[] {
    const entries = readdirSync(args.directoryPath, { withFileTypes: true });
    const filePaths: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(args.directoryPath, entry.name);
      const relativePath = path
        .relative(args.workspaceRoot, entryPath)
        .split(path.sep)
        .join("/");

      if (entry.isFile() && entry.name === PROJECT_CONFIGURATION_FILENAME) {
        filePaths.push(relativePath);
        continue;
      }

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        !args.ignoredPaths.includes(relativePath)
      ) {
        filePaths.push(
          ...this.listProjectConfigurationFiles({
            directoryPath: entryPath,
            ignoredPaths: args.ignoredPaths,
            workspaceRoot: args.workspaceRoot,
          }),
        );
      }
    }

    return filePaths;
  }

  /**
   * Reads the paths `.nxignore` excludes from project discovery.
   *
   * Honored because a `project.json` inside a generator template is not a
   * project — it is a file the template will one day render — and `.nxignore`
   * is where a workspace already says so. Reading it here keeps this walk
   * agreeing with the graph Nx itself builds.
   */
  private readIgnoredPaths(workspaceRoot: string): string[] {
    const ignoreFilePath = path.resolve(workspaceRoot, NX_IGNORE_FILENAME);

    if (!existsSync(ignoreFilePath)) {
      return [];
    }

    return readFileSync(ignoreFilePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
  }

  /** Reads the workspace's `nx.json`, or nothing when there is none. */
  private readNxConfiguration(workspaceRoot: string): unknown {
    const nxConfigurationPath = path.resolve(
      workspaceRoot,
      NX_CONFIGURATION_FILENAME,
    );

    if (!existsSync(nxConfigurationPath)) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(
      readFileSync(nxConfigurationPath, "utf8"),
    );

    return parsed;
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
    // `parsed === null` rather than `!== null` was the original test, which
    // could never hold; spreading null happened to yield `{}` anyway, so the
    // bug was invisible.
    const configuration: { name?: unknown; tags?: unknown } =
      typeof parsed === "object" && parsed !== null ? { ...parsed } : {};
    const tags = this.isUnknownArray(configuration.tags)
      ? configuration.tags
      : [];

    return {
      name: typeof configuration.name === "string" ? configuration.name : root,
      root,
      tags: tags.filter((tag) => typeof tag === "string"),
    };
  }

  /**
   * Resolves this plugin's options against the workspace's registration.
   *
   * Nx passes plugin options to `createNodes` but not to a generator or to an
   * inferred target's executor, which see only what the caller typed. Reading
   * `nx.json` here rather than trusting a default is what lets a workspace keep
   * its configuration somewhere other than the conventional path: the
   * registration is the base, and anything Nx did pass wins over it.
   */
  private resolveOptions(args: {
    options: unknown;
    workspaceRoot: string;
  }): ConformetryPluginOptions {
    const registered = this.optionsService.resolveConfigurationPath({
      exists: (candidatePath) => {
        return existsSync(path.resolve(args.workspaceRoot, candidatePath));
      },
      nxConfiguration: this.readNxConfiguration(args.workspaceRoot),
    });
    const passed: Record<string, unknown> =
      typeof args.options === "object" && args.options !== null
        ? { ...args.options }
        : {};

    return this.optionsService.resolvePluginOptions({
      configurationPath: registered,
      ...passed,
    });
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
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
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
          // The executor refuses to run against a drifted plugin, so the
          // configuration and the emitted plugin are inputs: without them a
          // cache hit would skip that check entirely.
          inputs: [
            "default",
            `{workspaceRoot}/${pluginOptions.configurationPath}`,
            `{workspaceRoot}/${DEFAULT_OUTPUT_PATH}/**/*`,
          ],
          options: {},
        },
      });
    }

    return targetsByProjectRoot;
  }

  /**
   * Every project in the workspace, as a scope a generator can be matched to.
   *
   * The single answer all three emit paths use — the graph, `nx sync`, and the
   * bootstrap — so the bytes they emit agree and the drift check stays honest.
   */
  public listWorkspaceProjects(workspaceRoot: string): ProjectScope[] {
    return this.listProjectConfigurationFiles({
      directoryPath: workspaceRoot,
      ignoredPaths: this.readIgnoredPaths(workspaceRoot),
      workspaceRoot,
    })
      .map((projectConfigurationFile) => {
        return this.readProjectScope({
          projectConfigurationFile,
          workspaceRoot,
        });
      })
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }

  /**
   * Runs one configured generator against an Nx tree.
   *
   * Nothing is written to disk here — the tree records the writes and Nx
   * decides whether to flush them, which is what makes `--dry-run` honest.
   */
  public async runGenerator(args: RunGeneratorArguments): Promise<string[]> {
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
    await this.assertPluginInSync({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });

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
        generatorName: args.generatorName,
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
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
    await this.assertPluginInSync({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });

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
