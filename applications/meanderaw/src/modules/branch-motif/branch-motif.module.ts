import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";

import { BranchMotifService } from "./branch-motif.service";

/**
 * Wires up the `branch` motif, the one family whose ink is a tree: a spine
 * and teeth spanning every lattice point of the band, joined by exactly one
 * fewer step than there are points, so the ink forks everywhere and closes
 * a loop nowhere.
 */
@Module({
  controllers: [],
  exports: [BranchMotifService],
  imports: [GridGeometryModule],
  providers: [BranchMotifService],
})
export class BranchMotifModule {}
