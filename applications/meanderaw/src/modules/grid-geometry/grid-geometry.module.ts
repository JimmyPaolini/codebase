import { Module } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";

/**
 * Wires up the shared scaling rule every motif module resolves its pixel
 * coordinates through. Depends on nothing else in the project, which is what
 * lets every motif module import it without pulling in a motif.
 */
@Module({
  controllers: [],
  exports: [GridGeometryService],
  imports: [],
  providers: [GridGeometryService],
})
export class GridGeometryModule {}
