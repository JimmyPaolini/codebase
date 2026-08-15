import path from "node:path";

import { Injectable } from "@nestjs/common";

import { DiscoveryCandidatesService } from "./discovery-candidates.service";
import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";

import type {
  InstanceCandidate,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolveCandidatesArguments,
  ResolvedInstances,
  TemplateDefinition,
} from "./discovery.types";

/**
 * Turns candidate directories into matched instances and comparison documents.
 *
 * This is the entry point for the discovery module. It knows nothing about
 * workspaces, projects, or globs — the caller supplies candidates, and the
 * templates root supplies templates. That is what keeps this package usable
 * from any host, not just Nx.
 */
@Injectable()
export class DiscoveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryCandidatesService: DiscoveryCandidatesService,
    private readonly discoveryMatchingService: DiscoveryMatchingService,
    private readonly discoveryTemplatesService: DiscoveryTemplatesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reads one template folder. */
  public collectTemplate(args: {
    name: string;
    templatePath: string;
  }): TemplateDefinition {
    return this.discoveryTemplatesService.collectTemplate(args);
  }

  /**
   * Prepares the rendered template/instance document pairs for each matched
   * instance, restricted to the extensions the caller's validators claim.
   */
  public prepareDocuments(
    args: PrepareDocumentsArguments,
  ): PreparedInstanceDocuments[] {
    const extensions = new Set(args.fileExtensions);

    return args.instances.map((instance) => {
      return {
        documents: instance.template.filePaths
          .filter((templateFilePath) => {
            return extensions.has(path.extname(templateFilePath));
          })
          .map((templateFilePath) => {
            return this.discoveryTemplatesService.prepareDocument({
              instancePath: instance.candidate.instancePath,
              substitutions: instance.substitutions,
              templateDirectoryPath: instance.template.directoryPath,
              templateFilePath,
            });
          })
          .filter((document) => document !== undefined),
        instance,
      };
    });
  }

  /** Expands instance glob patterns into candidates. */
  public resolveCandidates(
    args: ResolveCandidatesArguments,
  ): InstanceCandidate[] {
    return this.discoveryCandidatesService.resolveCandidates(args);
  }

  /**
   * Lists every file a matched instance's template requires it to have.
   *
   * Unlike `prepareDocuments`, this does not filter by extension and does not
   * read contents — it answers "which files should exist", which is what
   * `conformetry-files` checks. Extension-less files such as `.gitignore` are
   * therefore covered here and nowhere else.
   */
  public resolveInstanceFiles(instances: MatchedInstance[]): InstanceFile[] {
    return instances.flatMap((instance) => {
      return instance.template.filePaths.map((templateFilePath) => {
        return {
          instance,
          instanceFilePath:
            this.discoveryTemplatesService.resolveInstanceFilePath({
              instancePath: instance.candidate.instancePath,
              substitutions: instance.substitutions,
              templateDirectoryPath: instance.template.directoryPath,
              templateFilePath,
            }),
          templateFilePath,
        };
      });
    });
  }

  /** Matches candidate directories to the templates that best explain them. */
  public resolveInstances(args: {
    candidates: InstanceCandidate[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    return this.discoveryMatchingService.resolveInstances(args);
  }
}
