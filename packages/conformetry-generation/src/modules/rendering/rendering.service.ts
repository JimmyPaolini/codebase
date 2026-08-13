import { Injectable } from "@nestjs/common";
import lodash from "lodash";

import {
  CONTENT_PLACEHOLDER_PATTERN,
  PATH_PLACEHOLDER_PATTERN,
} from "./rendering.constants";

import type { Substitutions } from "./rendering.types";

/**
 * Renders conformetry template placeholders.
 *
 * This is the single owner of template rendering across the workspace.
 * Generation renders templates to create files; validation renders the same
 * templates to compare them against existing files. Both must substitute
 * identically or validation would flag files the generator itself produced,
 * so neither reimplements this.
 */
@Injectable()
export class RenderingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Derives the case variants every template can reference from one name.
   *
   * Callers merge their own inputs over this result, so an explicit input of
   * the same key always wins over the derived variant.
   */
  public buildNameSubstitutions(name: string): Substitutions {
    const camelCaseName = lodash.camelCase(name);

    return {
      nameCamelCase: camelCaseName,
      nameKebabCase: lodash.kebabCase(name),
      namePascalCase: lodash.upperFirst(camelCaseName),
      nameSnakeCase: lodash.snakeCase(name),
    };
  }

  /**
   * Substitutes `{{field}}` placeholders in template contents.
   *
   * An unknown placeholder is left verbatim rather than replaced with an empty
   * string: a template referencing a field nobody supplied is a template bug,
   * and leaving the token visible makes that obvious in the generated file
   * instead of silently producing a hole.
   */
  public renderContent(args: {
    substitutions: Substitutions;
    templateContent: string;
  }): string {
    return args.templateContent.replaceAll(
      CONTENT_PLACEHOLDER_PATTERN,
      (token: string, field: string) => {
        return args.substitutions[field.trim()] ?? token;
      },
    );
  }

  /**
   * Substitutes `__field__` placeholders in template paths.
   *
   * Paths use a distinct syntax from contents because braces are not portable
   * across filesystems. Unknown placeholders are left verbatim, for the same
   * reason as `renderContent`.
   */
  public renderPath(args: {
    substitutions: Substitutions;
    templatePath: string;
  }): string {
    return args.templatePath.replaceAll(
      PATH_PLACEHOLDER_PATTERN,
      (token: string, field: string) => {
        return args.substitutions[field] ?? token;
      },
    );
  }
}
