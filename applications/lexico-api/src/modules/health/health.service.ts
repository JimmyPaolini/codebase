import { Injectable } from "@nestjs/common";

/**
 * Health check service returning service health status.
 */
@Injectable()
export class HealthService {
  /**
   * Returns true if the service is operational.
   */
  public isHealthy(): boolean {
    return true;
  }
}
