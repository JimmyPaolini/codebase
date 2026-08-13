import path from "node:path";

import { Injectable } from "@nestjs/common";

import type {
  TemplateDefinition,
  UnmatchedInstance,
  UnmatchedReason,
} from "@jimmypaolini/conformetry-configuration";
import type { ValidationFileResult } from "@jimmypaolini/conformetry-core";

/**
 * Turns candidates that matched no template into ordinary findings.
 *
 * Silence would be the wrong answer here. A glob is the author asserting that
 * a path holds generated code, so a path matching nothing means either the
 * instance drifted past recognition or the glob is wrong — both worth saying
 * out loud, and both invisible if unmatched candidates were merely skipped.
 */
@Injectable()
export class ValidationFindingsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes why a candidate could not be attributed to one template. */
  private describeReason(args: {
    candidateTemplateNames: string[];
    reason: UnmatchedReason;
  }): { fix: string; message: string } {
    if (args.reason === "ambiguous") {
      const names = args.candidateTemplateNames.join(", ");

      return {
        fix: `Give the templates ${names} distinguishing files, or narrow the instance glob so only one applies.`,
        message: `Ambiguous instance: matches ${names} equally well`,
      };
    }

    return {
      fix: "Regenerate the instance from its template, or remove it from the instance globs if it is not generated code.",
      message: "Unmatched instance: no template explains this path",
    };
  }

  /**
   * The directory the templates share, used as the "template" line of an
   * unmatched finding — there is no single template to point at, and the set
   * they were drawn from is the most useful thing to name.
   */
  private resolveTemplatesRootPath(templates: TemplateDefinition[]): string {
    const parentPaths = templates.map((template) => {
      return path.dirname(template.directoryPath);
    });

    return parentPaths.toSorted()[0] ?? "";
  }

  // 🌎 Public Methods

  /** Builds one finding per unmatched candidate, in candidate order. */
  public buildUnmatchedResults(args: {
    templates: TemplateDefinition[];
    unmatched: UnmatchedInstance[];
  }): ValidationFileResult[] {
    const templatesRootPath = this.resolveTemplatesRootPath(args.templates);

    return args.unmatched.map((instance) => {
      const instancePath = path.join(
        instance.candidate.instancePath,
        instance.candidate.nameStem,
      );

      return {
        errors: [
          {
            errorType: "instance" as const,
            ...this.describeReason({
              candidateTemplateNames: instance.candidateTemplateNames,
              reason: instance.reason,
            }),
          },
        ],
        filename: instance.candidate.nameStem,
        instanceFilePath: instancePath,
        templateFilePath: templatesRootPath,
      };
    });
  }
}
