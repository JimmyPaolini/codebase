import { Injectable } from "@nestjs/common";
import lodash from "lodash";
import mustache from "mustache";

import { MUSTACHE_RENDER_OPTIONS } from "./rendering.constants";
import { MissingSubstitutionError } from "./rendering.errors";

import type { Substitutions } from "./rendering.types";
import type { TemplateSpans } from "mustache";

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

  /**
   * Refuses to render a template that asks for a value nobody supplied.
   *
   * Every placeholder is reported, not only the first, because a template
   * missing one input is usually missing the set it belongs to.
   */
  private assertEverySubstitutionSupplied(args: {
    subject: string;
    substitutions: Substitutions;
    template: string;
  }): void {
    const placeholders = this.collectInterpolatedNames(args.template).filter(
      (name) => !Object.hasOwn(args.substitutions, name),
    );

    if (placeholders.length > 0) {
      throw new MissingSubstitutionError({
        placeholders,
        subject: args.subject,
      });
    }
  }

  /**
   * Every placeholder a template interpolates, in source order and deduplicated.
   *
   * Mustache's own parser does the reading rather than a pattern, so an
   * interpolation is told apart from a comment (`{{! … }}`), a partial
   * (`{{> … }}`), and a delimiter change (`{{= … =}}`) exactly the way mustache
   * itself tells them apart.
   *
   * Section names are skipped while their bodies are still walked: `{{#field}}`
   * and `{{^field}}` are conditionals, so absence is an answer there, but an
   * interpolation nested inside one is a hole like any other.
   *
   * The implicit iterator `{{.}}` is skipped because it names no field at all —
   * it renders whichever value the enclosing section pushed onto the context.
   */
  private collectInterpolatedNames(template: string): string[] {
    const names = new Set<string>();
    const walk = (spans: TemplateSpans): void => {
      for (const span of spans) {
        // Indexed rather than destructured: a span is a tuple of
        // [type, value, start, end, children?], and the two positions between
        // the parts read here carry offsets nothing needs.
        const type = span[0];
        const value = span[1];
        const children = span[4];

        if ((type === "name" || type === "&") && value !== ".") {
          names.add(value);
        }

        if (Array.isArray(children)) {
          walk(children);
        }
      }
    };

    walk(mustache.parse(template));

    return [...names];
  }

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
   * An interpolated placeholder nobody supplied raises
   * `MissingSubstitutionError` rather than rendering as the empty string
   * mustache would otherwise write. `subject` is what that error names, so
   * pass the template's path when there is one.
   */
  public renderContent(args: {
    subject?: string;
    substitutions: Substitutions;
    templateContent: string;
  }): string {
    this.assertEverySubstitutionSupplied({
      subject: args.subject ?? "a template file",
      substitutions: args.substitutions,
      template: args.templateContent,
    });

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
    subject?: string;
    substitutions: Substitutions;
    templatePath: string;
  }): string {
    this.assertEverySubstitutionSupplied({
      subject: args.subject ?? args.templatePath,
      substitutions: args.substitutions,
      template: args.templatePath,
    });

    return mustache.render(
      args.templatePath,
      args.substitutions,
      {},
      MUSTACHE_RENDER_OPTIONS,
    );
  }
}
