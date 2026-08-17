import { Module } from "@nestjs/common";

import { ClassHierarchyService } from "./class-hierarchy.service";
import { ExternalService } from "./external.service";

/**
 * Provides the lookups edge resolution consults for every call site.
 */
@Module({
  controllers: [],
  exports: [ClassHierarchyService, ExternalService],
  imports: [],
  providers: [ClassHierarchyService, ExternalService],
})
export class ClassHierarchyModule {}
