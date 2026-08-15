import { Module } from "@nestjs/common";

import { MeasureJsonService } from "./measure-json.service";

/**
 * TODO: Document the measureJson module.
 */
@Module({
  controllers: [],
  exports: [MeasureJsonService],
  imports: [],
  providers: [MeasureJsonService],
})
export class MeasureJsonModule {}
