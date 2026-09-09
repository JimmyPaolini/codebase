import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";

import { BranchMotifService } from "./branch-motif.service";

/**
 * Wires up the `branch` motif, the one family whose ink forks by
 * construction: a spine and teeth spanning every lattice point of the band,
 * run between rules along both of its borders, so the ink forks everywhere
 * and closes a loop in every column pair.
 */
@Module({
  controllers: [],
  exports: [BranchMotifService],
  imports: [GridGeometryModule],
  providers: [BranchMotifService],
})
export class BranchMotifModule {}
