import { Module } from "@nestjs/common";

import { SqlService } from "./sql.service";

/**
 * NestJS module that provides Sql source analysis.
 */
@Module({
  controllers: [],
  exports: [SqlService],
  imports: [],
  providers: [SqlService],
})
export class SqlModule {}
