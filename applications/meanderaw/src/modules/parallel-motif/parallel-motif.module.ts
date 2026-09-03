import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";

import { ParallelMotifService } from "./parallel-motif.service";

/**
 * Wires up the `parallel` motif, the one family whose ink runs in bundles:
 * `N` strands alongside one another, turning together one channel apart,
 * nested so that the strands and the channels between them tile the band at
 * a single thickness.
 */
@Module({
  controllers: [],
  exports: [ParallelMotifService],
  imports: [GridGeometryModule],
  providers: [ParallelMotifService],
})
export class ParallelMotifModule {}
