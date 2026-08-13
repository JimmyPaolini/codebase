import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Injectable } from "@nestjs/common";

import { DiscoveryTemplatesService } from "./discovery-templates.service";
import {
  COMPLETE_MATCH_RATIO,
  MINIMUM_MATCH_RATIO,
} from "./discovery.constants";

import type {
  InstanceCandidate,
  MatchedInstance,
  ResolvedInstances,
  ScoredTemplate,
  TemplateDefinition,
} from "./discovery.types";
import type { Substitutions } from "@jimmypaolini/conformetry-generation";

/**
 * Decides which template a candidate directory is an instance of.
 *
 * Nothing declares the answer — an instance is ordinary code with no marker
 * saying where it came from — so the template is inferred from how much of its
 * structure the candidate already has.
 */
@Injectable()
export class DiscoveryMatchingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryTemplatesService: DiscoveryTemplatesService,
    private readonly renderingService: RenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Orders scored templates best-first.
   *
   * Coverage ratio leads, because absolute count alone lets a large template
   * win on a weak partial match — a module directory matching three of a
   * seven-file GraphQL template would beat nothing, and used to. Absolute
   * count breaks ratio ties, so a five-file module template beats a two-file
   * service-file template when both match completely. Name makes it
   * deterministic.
   */
  private compareScored(left: ScoredTemplate, right: ScoredTemplate): number {
    if (left.ratio !== right.ratio) {
      return right.ratio - left.ratio;
    }

    if (left.matchedFileCount !== right.matchedFileCount) {
      return right.matchedFileCount - left.matchedFileCount;
    }

    return left.template.name.localeCompare(right.template.name);
  }

  /** Scores every template that shares at least one file with the candidate. */
  private scoreTemplates(args: {
    candidate: InstanceCandidate;
    substitutions: Substitutions;
    templates: TemplateDefinition[];
  }): ScoredTemplate[] {
    return args.templates
      .map((template) => {
        const matchedFileCount =
          this.discoveryTemplatesService.countMatchingFiles({
            fileScope: args.candidate.fileScope,
            instancePath: args.candidate.instancePath,
            substitutions: args.substitutions,
            template,
          });

        return {
          matchedFileCount,
          ratio: matchedFileCount / template.filePaths.length,
          template,
        };
      })
      .filter((scored) => {
        return (
          scored.matchedFileCount > 0 && scored.ratio > MINIMUM_MATCH_RATIO
        );
      })
      .toSorted((left, right) => this.compareScored(left, right));
  }

  // 🌎 Public Methods

  /**
   * Builds the substitutions a candidate's template is rendered with.
   *
   * Name variants come from the candidate's stem; caller-supplied values are
   * spread last so an explicit `type` or `description` always wins.
   */
  public buildSubstitutions(candidate: InstanceCandidate): Substitutions {
    return {
      ...this.renderingService.buildNameSubstitutions(candidate.nameStem),
      name: candidate.nameStem,
      ...candidate.substitutions,
    };
  }

  /**
   * Resolves every candidate to the template — or templates — that explain it.
   *
   * A candidate matching nothing, or matching two templates equally well but
   * only partially, is returned as unmatched rather than dropped: the caller
   * asserted these are instances, so silence would hide both a drifted
   * instance and a pair of indistinguishable templates.
   *
   * A complete tie is different, and is matched against every tied template. A
   * module holding both a command and a service really is an instance of both
   * `nestjs-command-module` and `nestjs-service-module`; calling that ambiguous
   * would demand the author narrow a glob that is not wrong.
   */
  public resolveInstances(args: {
    candidates: InstanceCandidate[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    const matched: MatchedInstance[] = [];
    const unmatched: ResolvedInstances["unmatched"] = [];

    for (const candidate of args.candidates) {
      const substitutions = this.buildSubstitutions(candidate);
      const scored = this.scoreTemplates({
        candidate,
        substitutions,
        templates: args.templates,
      });
      const best = scored[0];

      if (best === undefined) {
        unmatched.push({
          candidate,
          candidateTemplateNames: [],
          reason: "no-match",
        });
        continue;
      }

      const tied = scored.filter((scoredTemplate) => {
        return (
          scoredTemplate.ratio === best.ratio &&
          scoredTemplate.matchedFileCount === best.matchedFileCount
        );
      });

      if (tied.length > 1 && best.ratio < COMPLETE_MATCH_RATIO) {
        unmatched.push({
          candidate,
          candidateTemplateNames: tied.map((scoredTemplate) => {
            return scoredTemplate.template.name;
          }),
          reason: "ambiguous",
        });
        continue;
      }

      matched.push(
        ...tied.map((scoredTemplate) => {
          return {
            candidate,
            matchedFileCount: scoredTemplate.matchedFileCount,
            substitutions,
            template: scoredTemplate.template,
          };
        }),
      );
    }

    return { matched, unmatched };
  }
}
