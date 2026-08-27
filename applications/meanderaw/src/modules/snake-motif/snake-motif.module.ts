import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";

import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

/**
 * Wires up the zigzag sequence `snake` and `chain` both trace, and the
 * motif that renders it. `chain` imports this module rather than
 * duplicating it: it draws the identical sequence with one segment
 * omitted, and shares this motif's pitch, border, and right edge.
 */
@Module({
  controllers: [],
  exports: [SnakeMotifService, SnakeSequenceService],
  imports: [GridGeometryModule, MotifTransformsModule],
  providers: [SnakeMotifService, SnakeSequenceService],
})
export class SnakeMotifModule {}
