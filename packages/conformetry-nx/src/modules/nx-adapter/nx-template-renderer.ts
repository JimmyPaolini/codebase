/**
 * Renders template placeholders into generated output files.
 */
export interface TemplateRenderer {
  render(
    templateContent: string,
    substitutions: Record<string, string>,
  ): string;
}

/**
 * Replaces template placeholders with generated substitutions.
 */
export class NxTemplateRenderer implements TemplateRenderer {
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
