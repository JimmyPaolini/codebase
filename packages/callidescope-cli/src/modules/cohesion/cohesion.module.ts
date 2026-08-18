import { Module } from "@nestjs/common";

import { CohesionService } from "./cohesion.service";

/**
 * Provides the findings that compare call stacks across the workspace.
 */
@Module({
  controllers: [],
  exports: [CohesionService],
  imports: [],
  providers: [CohesionService],
})
export class CohesionModule {}
