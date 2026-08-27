import { Module } from "@nestjs/common";

import { MotifTransformsService } from "./motif-transforms.service";

/**
 * Wires up the grid-level point transforms every motif module composes its
 * own shape from — rotation, mirroring, run splitting, and the
 * points-to-path serialization they all render through. Depends on no motif,
 * which is what keeps it importable from all of them.
 */
@Module({
  controllers: [],
  exports: [MotifTransformsService],
  imports: [],
  providers: [MotifTransformsService],
})
export class MotifTransformsModule {}
