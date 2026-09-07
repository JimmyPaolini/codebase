import { Module } from "@nestjs/common";

import { CommentsModule } from "../comments/comments.module";

import { DocumentationMeasurementService } from "./documentation-measurement.service";
import { TypescriptService } from "./typescript.service";

/**
 * NestJS module that provides TypeScript and JavaScript code analysis.
 */
@Module({
  controllers: [],
  exports: [TypescriptService],
  imports: [CommentsModule],
  providers: [DocumentationMeasurementService, TypescriptService],
})
export class TypescriptModule {}
