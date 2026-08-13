import { Injectable } from "@nestjs/common";

import type { TemplateRenderer } from "./nx-adapter.types";

/**
 * Replaces template placeholders with generated substitutions.
 */
@Injectable()
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
