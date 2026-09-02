import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";

import { CrossMotifService } from "./cross-motif.service";

/**
 * Wires up the `cross` motif, the one family whose ink crosses itself: two
 * strips of fillet meeting at four-armed `+` junctions, drawn solid or
 * broken either side of each junction to read as an interlace.
 */
@Module({
  controllers: [],
  exports: [CrossMotifService],
  imports: [GridGeometryModule],
  providers: [CrossMotifService],
})
export class CrossMotifModule {}
