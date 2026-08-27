import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";

import { WhirlMotifService } from "./whirl-motif.service";

/**
 * Wires up the `whirl` motif: a single inward spiral arm joined to its
 * own 180° rotation.
 */
@Module({
  controllers: [],
  exports: [WhirlMotifService],
  imports: [GridGeometryModule, MotifTransformsModule],
  providers: [WhirlMotifService],
})
export class WhirlMotifModule {}
