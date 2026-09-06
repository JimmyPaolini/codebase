import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES,
  PROJECT_CONFIGURATION_PERMITTED_LIMIT_NAMES,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

import type {
  CallidescopeConfiguration,
  LimitProvenance,
  LoadedProjectConfiguration,
  LoadProjectConfigurationsArguments,
  ProjectLimits,
  ProjectLimitsLookup,
  ResolveProjectLimitsArguments,
} from "./configuration.types";

/**
 * Resolves the configuration file sitting beside each traced project.
 *
 * Its own service rather than more of `ConfigurationService`, because the two
 * answer different questions: one loads the file a run was pointed at, and this
 * one asks which of a run's projects configure themselves. Every refusal a
 * project configuration can earn belongs here, where the project it names is
 * already in hand.
 */
@Injectable()
export class ProjectConfigurationService {
  // 🏗 Dependency Injection

  constructor(private readonly configurationService: ConfigurationService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses a project configuration that sets a field only the workspace
   * configuration may set.
   */
  private assertNoForbiddenFields(
    loadedConfiguration: LoadedProjectConfiguration,
  ): void {
    const field = this.findForbiddenField(loadedConfiguration.authored);

    if (field === undefined) {
      return;
    }

    throw new ProjectConfigurationFieldNotPermittedError({
      field,
      project: loadedConfiguration.project,
    });
  }

  /**
   * Reads one project's own limits, falling back to what it inherits.
   *
   * A project declaring neither is handed the inherited object itself rather
   * than a copy of it, so the two can never come to disagree.
   */
  private buildProjectLimits(args: {
    projectConfiguration: LoadedProjectConfiguration | undefined;
    workspace: ProjectLimits;
  }): ProjectLimits {
    const { projectConfiguration } = args;

    if (projectConfiguration === undefined) {
      return args.workspace;
    }

    const { authored, configuration } = projectConfiguration;
    const configurationPath = projectConfiguration.path;

    return {
      maximumBreadth:
        this.declareLimit({
          authored: authored.limits?.maximumBreadth,
          path: configurationPath,
          resolved: configuration.limits.maximumBreadth,
        }) ?? args.workspace.maximumBreadth,
      maximumDepth:
        this.declareLimit({
          authored: authored.limits?.maximumDepth,
          path: configurationPath,
          resolved: configuration.limits.maximumDepth,
        }) ?? args.workspace.maximumDepth,
    };
  }

  /**
   * Reads the limits every project inherits when it declares none of its own.
   *
   * Stamped `inherited` rather than `declared` because this object is read
   * through a project: the workspace file is where the number is written, and
   * the project is where it was not.
   */
  private buildWorkspaceLimits(
    args: ResolveProjectLimitsArguments,
  ): ProjectLimits {
    const { maximumBreadth, maximumDepth } = args.workspaceConfiguration.limits;
    const configurationPath = args.workspaceConfigurationPath;

    return {
      maximumBreadth:
        maximumBreadth === undefined
          ? undefined
          : {
              origin: "inherited",
              path: configurationPath,
              value: maximumBreadth,
            },
      maximumDepth: {
        origin: "inherited",
        path: configurationPath,
        value: maximumDepth,
      },
    };
  }

  /**
   * Reads one limit a project set for itself, or nothing when it set none.
   *
   * Presence is asked of the file as authored and the value is taken from the
   * resolved configuration, which is the split every other reader here makes:
   * resolution manufactures a default for every project, so only `authored` can
   * say whether this project chose the number, and only the resolved
   * configuration is guaranteed to have been through the schema.
   */
  private declareLimit(args: {
    authored: number | undefined;
    path: string;
    resolved: number | undefined;
  }): LimitProvenance | undefined {
    if (args.authored === undefined || args.resolved === undefined) {
      return undefined;
    }

    return { origin: "declared", path: args.path, value: args.resolved };
  }

  /**
   * Finds the first field a project's own configuration sets that only the
   * workspace configuration may set.
   *
   * Checked against `authored`, the file exactly as written, never against the
   * resolved configuration: resolution manufactures every field for every
   * project, so asking the resolved object whether it "has" a field can never
   * say no.
   *
   * The file's own fields are walked and each is asked whether it is
   * permitted, rather than a list of forbidden ones being looked for. That is
   * what makes the check fail closed: a field nothing classifies — a tenth one
   * added upstream, a name somebody misspelled — is refused by name instead of
   * being accepted and then quietly doing nothing.
   */
  private findForbiddenField(
    authored: CallidescopeConfiguration,
  ): string | undefined {
    // Widened before it is walked, because a field name read off a file is a
    // string and the interface has no index signature to read it through.
    const fields: Readonly<Record<string, unknown>> = { ...authored };
    const limits: Readonly<Record<string, unknown>> = { ...authored.limits };

    for (const [field, value] of Object.entries(fields)) {
      if (
        value !== undefined &&
        field !== "limits" &&
        !PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES.has(field)
      ) {
        return field;
      }
    }

    for (const [limit, value] of Object.entries(limits)) {
      if (
        value !== undefined &&
        !PROJECT_CONFIGURATION_PERMITTED_LIMIT_NAMES.has(limit)
      ) {
        return `limits.${limit}`;
      }
    }

    return undefined;
  }

  /**
   * Reads one project's configuration file.
   *
   * Every failure the read can produce — a file nothing can parse, a shape the
   * schema rejects — is rethrown naming the project, because a run resolves a
   * file per project and a bare parse error says nothing about which one to go
   * and fix.
   */
  private async loadProjectConfiguration(args: {
    configurationPath: string;
    project: string;
  }): Promise<LoadedProjectConfiguration> {
    try {
      const loaded = await this.configurationService.loadConfigurationFile({
        configurationPath: args.configurationPath,
      });

      return {
        authored: loaded.authored,
        configuration: loaded.configuration,
        // The path the loader settled on, never the one it was handed: a named
        // path is resolved before it is read, and the file that was read is the
        // one every later rule has to be talking about.
        path: loaded.path,
        project: args.project,
      };
    } catch (error) {
      throw new ProjectConfigurationError({
        cause: error,
        configurationPath: args.configurationPath,
        project: args.project,
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Resolves the configuration file sitting at each project's own root — the
   * directory holding the `tsconfig.json` that makes it a project.
   *
   * A project with no file of its own is absent from the result rather than
   * present with an empty one: it is configured entirely by the workspace file,
   * which is the behavior every project has today.
   *
   * Nothing is merged at the file level, and a project must **never** spread
   * the workspace configuration into its own: such an object carries fields
   * only the workspace may set, and `findForbiddenField` below refuses the file
   * for the first one it finds. A project writes the overrides it wants and
   * nothing else. Inheritance happens one limit at a time, in `resolveLimits`,
   * so a project that declares `limits.maximumDepth` still takes every other
   * limit from the run.
   *
   * The file a run was pointed at is skipped, because it is already serving as
   * that run's workspace configuration. One file, one role per run — a package
   * whose task names its own configuration and then traces itself would
   * otherwise have that file read a second time and judged as a project's,
   * which is a refusal for the workspace-only fields it legitimately sets.
   */
  public async loadProjectConfigurations(
    args: LoadProjectConfigurationsArguments,
  ): Promise<LoadedProjectConfiguration[]> {
    const workspaceConfigurationPath =
      args.workspaceConfigurationPath === undefined
        ? undefined
        : path.resolve(args.workspaceRoot, args.workspaceConfigurationPath);

    const loaded: LoadedProjectConfiguration[] = [];

    for (const project of args.projects) {
      const configurationPath =
        this.configurationService.findConfigurationFileAt(
          path.resolve(args.workspaceRoot, project),
        );

      if (
        configurationPath === undefined ||
        configurationPath === workspaceConfigurationPath
      ) {
        continue;
      }

      const projectConfiguration = await this.loadProjectConfiguration({
        configurationPath,
        project,
      });
      this.assertNoForbiddenFields(projectConfiguration);
      loaded.push(projectConfiguration);
    }

    return loaded;
  }

  /**
   * Resolves the depth and breadth limits every traced project is judged
   * against, each carrying the file its number was written in.
   *
   * The workspace value is a default rather than a ceiling: a project
   * declaring a higher limit than the workspace keeps its own, because a
   * workspace number pinned by the single worst stack anywhere in it gates
   * nothing for the projects that are nowhere near it.
   *
   * One resolver rather than one per reader. A gate and a listing that each
   * worked the inheritance out for themselves could disagree about the same
   * number, and a limit two answers can be given for is worse than no limit.
   */
  public resolveLimits(
    args: ResolveProjectLimitsArguments,
  ): ProjectLimitsLookup {
    const workspace = this.buildWorkspaceLimits(args);
    const configurationsByProject = new Map(
      args.projectConfigurations.map((projectConfiguration) => [
        projectConfiguration.project,
        projectConfiguration,
      ]),
    );

    return {
      byProject: new Map(
        args.projects.map((project) => [
          project,
          this.buildProjectLimits({
            projectConfiguration: configurationsByProject.get(project),
            workspace,
          }),
        ]),
      ),
      workspace,
    };
  }
}
