import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";

import { SwirlMotifService } from "./swirl-motif.service";

/**
 * Wires up the `swirl` motif: two nested inward spiral arms joined by
 * 180° rotational symmetry.
 */
@Module({
  controllers: [],
  exports: [SwirlMotifService],
  imports: [GridGeometryModule, MotifTransformsModule],
  providers: [SwirlMotifService],
})
export class SwirlMotifModule {}
