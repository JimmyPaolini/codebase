import { Injectable } from "@nestjs/common";
import lodash from "lodash";
import mustache from "mustache";

import { MUSTACHE_RENDER_OPTIONS } from "./rendering.constants";

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
   * Renders template contents with mustache.
   *
   * Full mustache is available — sections, inverted sections, partials — with
   * HTML escaping disabled so substituted values cannot corrupt source code.
   *
   * Note that mustache renders an unknown placeholder as an empty string
   * rather than leaving the token visible. A template referencing a field
   * nobody supplies therefore produces a silent hole, so every placeholder a
   * template uses must be supplied by the caller.
   */
  public renderContent(args: {
    substitutions: Substitutions;
    templateContent: string;
  }): string {
    return mustache.render(
      args.templateContent,
      args.substitutions,
      {},
      MUSTACHE_RENDER_OPTIONS,
    );
  }

  /**
   * Renders a template path with mustache, the same way contents are rendered.
   *
   * Paths once used a `__field__` syntax of their own, on the assumption that
   * braces were not portable across filesystems. They are — and the separate
   * syntax could not tell a placeholder from a Python dunder, so a template
   * shipping `__init__.py` depended on `init` never being a substitution.
   */
  public renderPath(args: {
    substitutions: Substitutions;
    templatePath: string;
  }): string {
    return mustache.render(
      args.templatePath,
      args.substitutions,
      {},
      MUSTACHE_RENDER_OPTIONS,
    );
  }
}
