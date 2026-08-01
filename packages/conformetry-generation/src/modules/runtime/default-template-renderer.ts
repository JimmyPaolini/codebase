import type { TemplateRenderer } from "./runtime.types.js";

/**
 * Replaces template placeholders with generated substitutions.
 */
export class DefaultTemplateRenderer implements TemplateRenderer {
  /**
   * Renders a template string using double-curly placeholders.
   */
  public render(
    templateContent: string,
    substitutions: Record<string, string>,
  ): string {
    return templateContent.replaceAll(
      /\{\{([^{}]+)\}\}/gu,
      (_token, field: string) => {
        return substitutions[field.trim()] ?? _token;
      },
    );
  }
}
