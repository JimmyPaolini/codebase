import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";
import { SnakeMotifModule } from "../snake-motif/snake-motif.module";

import { ChainMotifService } from "./chain-motif.service";

/**
 * Wires up the `chain` motif, which renders `snake`'s own sequence with
 * its center-connecting segment omitted — hence the dependency on
 * `SnakeMotifModule` for the sequence, pitch, and border it shares.
 */
@Module({
  controllers: [],
  exports: [ChainMotifService],
  imports: [GridGeometryModule, MotifTransformsModule, SnakeMotifModule],
  providers: [ChainMotifService],
})
export class ChainMotifModule {}
