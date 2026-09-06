import path from "node:path";

import {
  ConfigurationService,
  ProjectConfigurationService,
} from "@callidescope/configuration";
import { FileFilterService, WorkspaceService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import type {
  LimitName,
  LimitOrigin,
  LimitsCommandOptions,
  ProjectLimitRow,
} from "./limits.types";
import type {
  CallidescopeConfiguration,
  LimitProvenance,
  ProjectLimits,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * Says what every project in a workspace is gated by, without tracing it.
 *
 * Reads configuration and never measures anything: no program is built, no
 * call graph is assembled, and no limit is evaluated. That separation is the
 * point, and it is the one `codometer configuration --limits` already makes —
 * a repository whose limits live one per project has no single place left to
 * read them as a set, and this is that place, in milliseconds rather than in
 * however long a trace takes.
 *
 * The numbers come from `ProjectConfigurationService.resolveLimits`, the same
 * resolver a gated run reads. A listing that worked the inheritance out for
 * itself could disagree with the gate about the same limit, and a limit two
 * answers can be given for is worse than no limit.
 */
@Injectable()
export class LimitsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fileFilterService: FileFilterService,
    private readonly projectConfigurationService: ProjectConfigurationService,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LimitsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Finds the projects the workspace holds, the same walk a trace starts from.
   *
   * The walk rather than a traced run's dependency closure: over a whole
   * workspace the two are the same set, since every discovered project is a
   * starting project and every starting project gets a program. Building those
   * programs to arrive at the same answer would cost the listing the very thing
   * that makes it worth having.
   *
   * The run's own filter and no project's. A project's `exclude` says which of
   * its files are traced, and nothing here traces a file — a project that
   * excluded every file it has still declares the limits it declares, and
   * leaving it off this listing would hide the one place they are written
   * down.
   */
  private discoverProjects(args: {
    configuration: ResolvedCallidescopeConfiguration;
    workspaceRoot: string;
  }): string[] {
    const fileFilter = this.fileFilterService.buildFileFilter({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workspaceRoot: args.workspaceRoot,
    });

    return this.workspaceService
      .discoverProjects({
        directories: args.configuration.directories,
        fileFilter,
        workspaceRoot: args.workspaceRoot,
      })
      .map((project) => project.name);
  }

  /** Builds the two rows one project resolves to, depth first. */
  private toProjectRows(args: {
    limits: ProjectLimits;
    project: string;
    workspaceRoot: string;
  }): ProjectLimitRow[] {
    const { maximumBreadth, maximumDepth } = args.limits;

    return [
      this.toRow({
        limit: "maximumDepth",
        origin: maximumDepth.origin,
        project: args.project,
        provenance: maximumDepth,
        workspaceRoot: args.workspaceRoot,
      }),
      this.toRow({
        limit: "maximumBreadth",
        origin: maximumBreadth?.origin,
        project: args.project,
        provenance: maximumBreadth,
        workspaceRoot: args.workspaceRoot,
      }),
    ];
  }

  /** Reads one resolved limit into the row that prints it. */
  private toRow(args: {
    limit: LimitName;
    origin: LimitOrigin | undefined;
    project: string | undefined;
    provenance: LimitProvenance | undefined;
    workspaceRoot: string;
  }): ProjectLimitRow {
    const { provenance } = args;

    return {
      limit: args.limit,
      origin: args.origin,
      path:
        provenance?.path === undefined
          ? undefined
          : path.relative(args.workspaceRoot, provenance.path),
      project: args.project,
      value: provenance?.value,
    };
  }

  /**
   * Builds the one row for a limit the workspace file is the source of.
   *
   * Neither field `resolveLimits` reports is enough on its own here.
   * `buildWorkspaceLimits` stamps every workspace limit `inherited`, which is
   * right for what that object is for — what a project that declared nothing is
   * handed — and wrong on this row, which is the file's own: rendering that
   * origin would say the workspace inherited its own default, from itself. And
   * its `path` is stamped unconditionally while `maximumDepth` is defaulted
   * during resolution, so a path alone would name a file for a number that file
   * never wrote — the same lie in the other direction, on the one row every
   * other row inherits from.
   *
   * So presence is asked of `authored`, the file exactly as written, and the
   * value still comes from the resolved configuration. That is the split
   * `ProjectConfigurationService.declareLimit` already makes for a project; the
   * workspace's own row is the case it does not cover, because `ProjectLimits`
   * has no third origin to say "defaulted" with. An un-authored limit therefore
   * renders exactly like a workspace with no configuration file at all: no
   * origin, no file, and the effective number kept, because that number really
   * is what everything is judged against.
   */
  private toWorkspaceRow(args: {
    authored: CallidescopeConfiguration;
    limit: LimitName;
    provenance: LimitProvenance | undefined;
    workspaceRoot: string;
  }): ProjectLimitRow {
    const { provenance } = args;
    const declaredPath =
      args.authored.limits?.[args.limit] === undefined
        ? undefined
        : provenance?.path;

    return {
      limit: args.limit,
      origin: declaredPath === undefined ? undefined : "declared",
      path:
        declaredPath === undefined
          ? undefined
          : path.relative(args.workspaceRoot, declaredPath),
      project: undefined,
      value: provenance?.value,
    };
  }

  /** Builds the two rows for the default every project falls back to. */
  private toWorkspaceRows(args: {
    authored: CallidescopeConfiguration;
    limits: ProjectLimits;
    workspaceRoot: string;
  }): ProjectLimitRow[] {
    const { maximumBreadth, maximumDepth } = args.limits;

    return [
      this.toWorkspaceRow({
        authored: args.authored,
        limit: "maximumDepth",
        provenance: maximumDepth,
        workspaceRoot: args.workspaceRoot,
      }),
      this.toWorkspaceRow({
        authored: args.authored,
        limit: "maximumBreadth",
        provenance: maximumBreadth,
        workspaceRoot: args.workspaceRoot,
      }),
    ];
  }

  // 🌎 Public Methods

  /**
   * Resolves every project's limits, workspace default first.
   *
   * Nothing is written and nothing is gated: a breached limit is not something
   * this can even notice, since no stack has been measured for it to breach.
   * A project whose own configuration file is refused still ends the run, the
   * way it ends a trace — a listing that quietly skipped the one project whose
   * configuration is wrong would be at its least trustworthy exactly when it is
   * most wanted.
   */
  public async list(options: LimitsCommandOptions): Promise<ProjectLimitRow[]> {
    const workspaceRoot = process.cwd();
    // The file-aware load rather than the plain one, and `authored` alongside
    // the resolved object: the listing names the file each number was written
    // in, so it has to know which file it already read as the workspace's own —
    // so that file is never also read as a project's — and which numbers that
    // file actually wrote, which only the authored object can still say.
    const {
      authored,
      configuration,
      path: configurationPath,
    } = await this.configurationService.loadConfigurationFile({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    const projects = this.discoverProjects({ configuration, workspaceRoot });
    const projectConfigurations =
      await this.projectConfigurationService.loadProjectConfigurations({
        projects,
        workspaceConfigurationPath: configurationPath,
        workspaceRoot,
      });
    const limits = this.projectConfigurationService.resolveLimits({
      projectConfigurations,
      projects,
      workspaceConfiguration: configuration,
      workspaceConfigurationPath: configurationPath,
    });

    this.logger.info("🔭 Listed every project's limits", undefined, {
      declaringProjectCount: projectConfigurations.length,
      projectCount: projects.length,
    });

    return [
      ...this.toWorkspaceRows({
        authored,
        limits: limits.workspace,
        workspaceRoot,
      }),
      ...[...limits.byProject].flatMap(([project, projectLimits]) =>
        this.toProjectRows({ limits: projectLimits, project, workspaceRoot }),
      ),
    ];
  }
}
