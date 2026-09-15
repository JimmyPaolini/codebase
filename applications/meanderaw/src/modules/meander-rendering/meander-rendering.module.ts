import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";

import { MeanderRenderingService } from "./meander-rendering.service";

/** Registers the generic renderer every family's Code is now drawn through. */
@Module({
  controllers: [],
  exports: [MeanderRenderingService],
  imports: [CodeModule, GridGeometryModule, SvgRenderingModule],
  providers: [MeanderRenderingService],
})
export class MeanderRenderingModule {}
