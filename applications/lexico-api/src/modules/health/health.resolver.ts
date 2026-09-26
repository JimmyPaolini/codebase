import { Inject } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";

import { HealthService } from "./health.service";

/**
 * Health check query resolver.
 */
@Resolver()
export class HealthResolver {
  public constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  /**
   * Health check query.
   */
  @Query(() => Boolean, {
    description:
      "Returns true if the GraphQL API service is running and healthy.",
    name: "health",
  })
  public health(): boolean {
    return this.healthService.isHealthy();
  }
}
