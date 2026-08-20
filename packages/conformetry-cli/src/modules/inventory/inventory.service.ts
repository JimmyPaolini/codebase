import path from "node:path";

import {
  ConfigurationService,
  TemplateDiscoveryMatchingService,
  TemplateDiscoveryService,
} from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { PERCENT_SCALE } from "./inventory.constants";

import type {
  InventoriedInstance,
  InventoriedMatch,
  InventoriedTemplate,
  ResolveInventoryArguments,
} from "./inventory.types.js";
import type {
  ConformetryConfiguration,
  Instance,
  TemplateDefinition,
} from "@conformetry/configuration";

/**
 * Pairs every template with the instances it explains, and every instance with
 * the templates that explain it.
 *
 * Both directions come from one pass because they are the same data read two
 * ways, and because nothing records which template an instance came from —
 * attribution is inferred from how much of a template's structure an instance
 * already has, so a file can legitimately belong to several templates at once.
 */
@Injectable()
export class InventoryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly templateDiscoveryMatchingService: TemplateDiscoveryMatchingService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Expands the instance globs to consider, configured or caller-supplied. */
  private findInstances(args: {
    configuration: ConformetryConfiguration;
    instancePatterns?: string[] | undefined;
    workingDirectory: string;
  }): Instance[] {
    const patterns =
      args.instancePatterns ??
      args.configuration.flatMap((generator) =>
        generator.instances.flatMap((group) => group.patterns ?? []),
      );

    return this.templateDiscoveryService.findInstances({
      patterns,
      workingDirectory: args.workingDirectory,
    });
  }

  /** Weighs one instance against every template, best fit first. */
  private weighInstance(args: {
    instance: Instance;
    templates: TemplateDefinition[];
  }): { instance: Instance; matches: InventoriedMatch[] } {
    const matches = this.templateDiscoveryMatchingService
      .matchTemplates({
        instance: args.instance,
        substitutions: this.templateDiscoveryMatchingService.buildSubstitutions(
          args.instance,
        ),
        templates: args.templates,
      })
      .map((match): InventoriedMatch => {
        return {
          matchedFileCount: match.matchedFileCount,
          matchRatio: match.matchRatio,
          name: match.template.name,
          templateFileCount: match.template.filePaths.length,
        };
      });

    return { instance: args.instance, matches };
  }

  // 🌎 Public Methods

  /** Turns a ratio into a whole-number percentage. */
  public formatPercentage(matchRatio: number): string {
    return `${String(Math.round(matchRatio * PERCENT_SCALE))}%`;
  }

  /**
   * Lists every instance found, paired with the templates that explain it.
   *
   * `templateNames` narrows the pairing rather than the search, so an instance
   * that no named template explains drops out entirely.
   */
  public async resolveInstances(
    args: ResolveInventoryArguments,
  ): Promise<InventoriedInstance[]> {
    const { templates, weighed } = await this.takeInventory(args);
    const wanted = new Set(args.templateNames ?? templates.map((t) => t.name));

    return weighed
      .map(({ instance, matches }) => {
        return {
          path: path.relative(
            args.workingDirectory,
            path.join(instance.path, instance.nameStem),
          ),
          templates: matches.filter((match) => wanted.has(match.name)),
        };
      })
      .filter((instance) => instance.templates.length > 0);
  }

  /**
   * Lists every template declared, paired with the instances it explains.
   *
   * `instancePatterns` narrows which instances are considered, which is what
   * turns this into "which templates explain this path".
   */
  public async resolveTemplates(
    args: ResolveInventoryArguments,
  ): Promise<InventoriedTemplate[]> {
    const { configuration, weighed } = await this.takeInventory(args);
    const filtering = args.instancePatterns !== undefined;

    return configuration
      .filter(
        (generator) =>
          args.templateNames === undefined ||
          args.templateNames.includes(generator.name),
      )
      .map((generator) => {
        const instances = weighed.flatMap(({ instance, matches }) => {
          const match = matches.find((entry) => entry.name === generator.name);

          return match === undefined
            ? []
            : [
                {
                  ...match,
                  name: path.relative(
                    args.workingDirectory,
                    path.join(instance.path, instance.nameStem),
                  ),
                },
              ];
        });

        return {
          aliases: generator.aliases ?? [],
          description: generator.description ?? "",
          instances,
          name: generator.name,
          templatePath: generator.templatePath,
        };
      })
      .filter((template) => !filtering || template.instances.length > 0);
  }

  /** Loads the configuration and weighs every instance against every template. */
  public async takeInventory(args: ResolveInventoryArguments): Promise<{
    configuration: ConformetryConfiguration;
    templates: TemplateDefinition[];
    weighed: { instance: Instance; matches: InventoriedMatch[] }[];
  }> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const templates = this.templateDiscoveryService.collectTemplates({
      configuration,
      workingDirectory: args.workingDirectory,
    });
    const instances = this.findInstances({
      configuration,
      instancePatterns: args.instancePatterns,
      workingDirectory: args.workingDirectory,
    });

    return {
      configuration,
      templates,
      weighed: instances.map((instance) =>
        this.weighInstance({ instance, templates }),
      ),
    };
  }
}
