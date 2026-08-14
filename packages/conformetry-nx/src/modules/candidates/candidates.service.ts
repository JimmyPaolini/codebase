import path from "node:path";

import {
  ConfigurationService,
  DiscoveryService,
} from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import type {
  ProjectScope,
  ResolveProjectCandidatesArguments,
} from "./candidates.types";
import type {
  ConformetryInstanceGroup,
  InstanceCandidate,
} from "@conformetry/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Turns Nx project knowledge into the candidates conformetry validates.
 *
 * This is the whole reason the plugin exists: the generic packages take a list
 * of paths, and deciding which paths belong to which project — and which
 * projects a configured instance group applies to — is Nx-shaped knowledge
 * that would otherwise have to live inside them.
 */
@Injectable()
/* v8 ignore stop */
export class CandidatesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Returns whether a candidate belongs to a project.
   *
   * Tested against the instance itself — the instance path joined with the
   * name — not the instance path alone. A project-level candidate's instance
   * path is the directory *holding* projects, so testing that would place
   * every project's own candidate outside it.
   */
  private isInsideProject(args: {
    candidate: InstanceCandidate;
    projectRootPath: string;
  }): boolean {
    const relativePath = path.relative(
      args.projectRootPath,
      path.join(args.candidate.instancePath, args.candidate.nameStem),
    );

    return (
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath)
    );
  }

  // 🌎 Public Methods

  /**
   * Returns whether an instance group applies to a project.
   *
   * A group with no tags applies everywhere — tags narrow a group, they do not
   * opt it in, so a configuration that never mentions tags still validates the
   * whole workspace.
   */
  public appliesToProject(args: {
    group: ConformetryInstanceGroup;
    project: ProjectScope;
  }): boolean {
    if (args.group.tags === undefined || args.group.tags.length === 0) {
      return true;
    }

    return args.group.tags.some((tag) => args.project.tags.includes(tag));
  }

  /**
   * Expands every instance group that applies to a project, keeping only the
   * candidates that live inside it.
   *
   * The globs stay workspace-relative rather than being rewritten per project:
   * a pattern such as `packages/*` is the author describing the workspace, and
   * rewriting it into a project-relative form would change what it means.
   */
  public async resolveProjectCandidates(
    args: ResolveProjectCandidatesArguments,
  ): Promise<InstanceCandidate[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const projectRootPath = path.resolve(args.workspaceRoot, args.project.root);

    return configuration
      .flatMap((generator) => generator.instances)
      .filter((group) => {
        return this.appliesToProject({ group, project: args.project });
      })
      .flatMap((group) => {
        return this.discoveryService.resolveCandidates({
          patterns: group.patterns,
          ...(group.substitutions === undefined
            ? {}
            : { substitutions: group.substitutions }),
          workingDirectory: args.workspaceRoot,
        });
      })
      .filter((candidate) => {
        return this.isInsideProject({ candidate, projectRootPath });
      });
  }
}
