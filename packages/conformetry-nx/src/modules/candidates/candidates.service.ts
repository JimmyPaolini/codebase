import path from "node:path";

import {
  ConfigurationService,
  DiscoveryService,
} from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { ScopeService } from "../scope/scope.service";

import type { ResolveProjectCandidatesArguments } from "./candidates.types";
import type { InstanceCandidate } from "@conformetry/configuration";

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
    private readonly scopeService: ScopeService,
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
      .flatMap((group) => {
        // A tagged group is read inside the project; an untagged one is the
        // workspace glob any host resolves. Both come back as globs.
        return this.scopeService.resolveGroup({ group, project: args.project });
      })
      .flatMap((group) => {
        return this.discoveryService.resolveCandidates({
          patterns: group.patterns ?? [],
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
