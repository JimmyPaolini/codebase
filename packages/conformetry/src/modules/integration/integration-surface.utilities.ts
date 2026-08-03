import type { IntegrationModuleSurface } from "./integration.types";

/**
 * Lazily loads the Nest integration module/service tokens for external callers.
 */
export async function loadIntegrationModuleSurface(): Promise<IntegrationModuleSurface> {
  const [integrationModuleExports, integrationServiceExports] =
    await Promise.all([
      import("./integration.module.js"),
      import("./integration.service.js"),
    ]);

  return {
    IntegrationModule: integrationModuleExports.IntegrationModule,
    IntegrationService: integrationServiceExports.IntegrationService,
  };
}
