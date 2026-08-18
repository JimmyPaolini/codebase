import path from "node:path";

import { Injectable } from "@nestjs/common";

import { TemplateDiscoveryInstancesService } from "./template-discovery-instances.service";
import { TemplateDiscoveryMatchingService } from "./template-discovery-matching.service";
import { TemplateDiscoveryTemplatesService } from "./template-discovery-templates.service";

import type {
  FindInstancesArguments,
  Instance,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolvedInstances,
  TemplateDefinition,
} from "./template-discovery.types";

/**
 * Turns instance directories into matched instances and comparison documents.
 *
 * This is the entry point for the discovery module. It knows nothing about
 * workspaces, projects, or globs — the caller supplies instances, and the
 * templates root supplies templates. That is what keeps this package usable
 * from any host, not just Nx.
 */
@Injectable()
export class TemplateDiscoveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly templateDiscoveryInstancesService: TemplateDiscoveryInstancesService,
    private readonly templateDiscoveryMatchingService: TemplateDiscoveryMatchingService,
    private readonly templateDiscoveryTemplatesService: TemplateDiscoveryTemplatesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reads one template folder. */
  public collectTemplate(args: {
    name: string;
    templatePath: string;
    threshold?: number | undefined;
  }): TemplateDefinition {
    return this.templateDiscoveryTemplatesService.collectTemplate(args);
  }

  /** Expands instance glob patterns into instances. */
  public findInstances(args: FindInstancesArguments): Instance[] {
    return this.templateDiscoveryInstancesService.findInstances(args);
  }

  /** Matches instance directories to the templates that best explain them. */
  public matchInstances(args: {
    instances: Instance[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    return this.templateDiscoveryMatchingService.matchInstances(args);
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
            return this.templateDiscoveryTemplatesService.prepareDocument({
              instancePath: instance.instance.path,
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
            this.templateDiscoveryTemplatesService.resolveInstanceFilePath({
              instancePath: instance.instance.path,
              substitutions: instance.substitutions,
              templateDirectoryPath: instance.template.directoryPath,
              templateFilePath,
            }),
          templateFilePath,
        };
      });
    });
  }
}
