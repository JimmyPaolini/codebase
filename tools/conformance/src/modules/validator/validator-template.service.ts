import { Injectable } from "@nestjs/common";
import mustache from "mustache";

/**
 * Shared template rendering utilities for validator services.
 */
@Injectable()
export class ValidatorTemplateService {
  // 🏗 Dependency Injection

  constructor() {}

  /**
   * Prepares rendered template and instance text for conformance validators.
   */
  prepareConformanceTexts(args: {
    data: Record<string, unknown>;
    instance: string;
    template: string;
  }): {
    instance: string;
    renderedTemplate: string;
  } {
    const { data, instance, template } = args;
    return {
      instance,
      renderedTemplate: this.renderTemplate({ data, template }),
    };
  }

  /**
   * Renders a Mustache template with validator data.
   */
  renderTemplate(args: {
    data: Record<string, unknown>;
    template: string;
  }): string {
    const { data, template } = args;
    return mustache.render(template, data);
  }
}
