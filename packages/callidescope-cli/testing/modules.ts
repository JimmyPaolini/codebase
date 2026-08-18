import { CallablesModule } from "../src/modules/callables/callables.module";
import { ClassHierarchyModule } from "../src/modules/class-hierarchy/class-hierarchy.module";
import { CohesionModule } from "../src/modules/cohesion/cohesion.module";
import { DocumentationModule } from "../src/modules/documentation/documentation.module";
import { EdgesModule } from "../src/modules/edges/edges.module";
import { EntryPointsModule } from "../src/modules/entry-points/entry-points.module";
import { GraphModule } from "../src/modules/graph/graph.module";
import { OutputJsonModule } from "../src/modules/output-json/output-json.module";
import { OutputMarkdownModule } from "../src/modules/output-markdown/output-markdown.module";
import { ProgramModule } from "../src/modules/program/program.module";
import { ProjectReportsModule } from "../src/modules/project-reports/project-reports.module";
import { ReportModule } from "../src/modules/report/report.module";
import { SignaturesModule } from "../src/modules/signatures/signatures.module";
import { WorkspaceModule } from "../src/modules/workspace/workspace.module";

/**
 * Every analysis module, for a testing module to import.
 *
 * Imported wholesale rather than picked per service: each module exports what
 * it provides, so importing all of them makes any service's dependencies
 * resolvable without each test having to restate that service's dependency
 * list — and then drift from it.
 */
export const ANALYSIS_MODULES = [
  CallablesModule,
  CohesionModule,
  DocumentationModule,
  EdgesModule,
  EntryPointsModule,
  GraphModule,
  ClassHierarchyModule,
  OutputJsonModule,
  OutputMarkdownModule,
  ProgramModule,
  ProjectReportsModule,
  ReportModule,
  SignaturesModule,
  WorkspaceModule,
];
