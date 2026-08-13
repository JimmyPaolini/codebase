import { Injectable } from "@nestjs/common";

import { VALIDATION_SERVICE_NAME } from "./validation.constants";

/**
 * Placeholder validation service for the conformetry Nx package.
 */
@Injectable()
export class ValidationService {
  /**
   * Returns a simple marker for validation service usage.
   */
  public getValidationName(): string {
    return VALIDATION_SERVICE_NAME;
  }
}
