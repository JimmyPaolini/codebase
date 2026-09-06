import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PROJECT_CONFIGURATION_FORBIDDEN_FIELDS,
  PROJECT_CONFIGURATION_FORBIDDEN_LIMITS,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

import type {
  CallidescopeConfiguration,
  LoadedProjectConfiguration,
  LoadProjectConfigurationsArguments,
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
   * Finds the first field a project's own configuration sets that only the
   * workspace configuration may set.
   *
   * Checked against `authored`, the file exactly as written, never against the
   * resolved configuration: resolution manufactures every field for every
   * project, so asking the resolved object whether it "has" a field can never
   * say no.
   */
  private findForbiddenField(
    authored: CallidescopeConfiguration,
  ): string | undefined {
    for (const field of PROJECT_CONFIGURATION_FORBIDDEN_FIELDS) {
      if (authored[field] !== undefined) {
        return field;
      }
    }

    for (const field of PROJECT_CONFIGURATION_FORBIDDEN_LIMITS) {
      if (authored.limits?.[field] !== undefined) {
        return `limits.${field}`;
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
   * Nothing is merged. A project inherits by importing the workspace
   * configuration and spreading it, exactly the way every `codometer.config.ts`
   * in this repository already does. That is deliberate rather than unfinished:
   * a deep merge here is what would take away a project's ability to say "no,
   * actually, none of that".
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
}
