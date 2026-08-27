import {
  BoundariesService,
  BoundaryCyclesService,
  BoundaryReportService,
  BoundarySelectorService,
} from "@codependix/boundaries";
import { AnchorsService, DeliveryService } from "@codependix/cli";
import { ConfigurationService } from "@codependix/configuration";
import {
  PythonImportGraphService,
  PythonImportParserService,
  PythonProjectService,
  PythonService,
  TypescriptImportGraphService,
  TypescriptProjectService,
  TypescriptService,
} from "@codependix/imports";
import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";

import { LoggerService } from "@codebase/logger";

// ♟️ Constants

/**
 * The codependix builders every example renders through.
 *
 * These are the same classes `@codependix/cli` wires into its own container.
 * This package runs a script rather than an application, so there is no
 * container here to resolve them from — and nothing else for one to hold.
 */
const logger = new LoggerService();

/** Reads the Nx project graph and renders a one-hop Neighborhood. */
export const neighborhoodService = new NeighborhoodService();

/** Renders the whole-workspace Nx graph. */
export const workspaceGraphService = new WorkspaceGraphService(
  neighborhoodService,
);

/** Explores a NestJS project's container in preview mode. */
export const nestjsProjectService = new NestjsProjectService(logger);

/** Reduces an explored container to a module graph and renders it. */
export const moduleGraphService = new ModuleGraphService();

/** Discovers TypeScript projects and builds each one's `ts.Program`. */
export const typescriptProjectService = new TypescriptProjectService();

/** Builds and renders a project's TypeScript file-level import graph. */
export const typescriptService = new TypescriptService(
  new TypescriptImportGraphService(typescriptProjectService),
  typescriptProjectService,
);

/** Discovers Python projects and lists each one's source files. */
export const pythonProjectService = new PythonProjectService();

/** Builds and renders a project's Python file-level import graph. */
export const pythonService = new PythonService(
  new PythonImportGraphService(
    new PythonImportParserService(),
    pythonProjectService,
  ),
  pythonProjectService,
);

/** Resolves what a configuration file says about where an export goes. */
export const configurationService = new ConfigurationService();

/** Reads and rewrites codependix's own named anchor blocks. */
export const anchorsService = new AnchorsService();

/** Turns a resolved export configuration into file I/O. */
export const deliveryService = new DeliveryService(anchorsService);

/** Judges a built graph against declared boundary rules. */
export const boundariesService = new BoundariesService(
  new BoundaryCyclesService(),
  new BoundarySelectorService(),
);

/** Renders boundary violations into the lines a run prints. */
export const boundaryReportService = new BoundaryReportService();
