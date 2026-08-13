/**
 * Common arguments for template-to-instance conformance validators.
 */
export interface TemplateConformanceArguments {
  data: Record<string, unknown>;
  filename: string;
  instance: string;
  template: string;
}
