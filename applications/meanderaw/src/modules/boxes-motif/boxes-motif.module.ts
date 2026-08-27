import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";

import { BoxesMotifService } from "./boxes-motif.service";

/**
 * Wires up the `boxes` motif, the one type that draws a single shared
 * border across the whole pattern rather than a segment per unit.
 */
@Module({
  controllers: [],
  exports: [BoxesMotifService],
  imports: [GridGeometryModule, MotifTransformsModule],
  providers: [BoxesMotifService],
})
export class BoxesMotifModule {}
