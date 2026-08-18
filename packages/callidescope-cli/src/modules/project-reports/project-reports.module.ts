import { Module } from "@nestjs/common";

import { GraphModule } from "../graph/graph.module";

import { ProjectReportsService } from "./project-reports.service";

/**
 * Provides the per-project view a project's own README is written from.
 */
@Module({
  controllers: [],
  exports: [ProjectReportsService],
  imports: [GraphModule],
  providers: [ProjectReportsService],
})
export class ProjectReportsModule {}
