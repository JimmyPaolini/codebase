import { describe, expect, it } from "vitest";

import { ValidationModule } from "./validation.module";
import { ValidationService } from "./validation.service";

describe(ValidationModule, () => {
  it("is defined", () => {
    expect(ValidationModule).toBeDefined();
  });

  it("creates the validation service through the module provider factory", () => {
    interface ValidationModuleProvider {
      provide: unknown;
      useFactory?: (...args: unknown[]) => unknown;
    }

    const providers = Reflect.getMetadata("providers", ValidationModule) as
      | undefined
      | unknown[];
    const validationProvider = providers?.find(
      (provider): provider is ValidationModuleProvider =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === ValidationService,
    );

    expect(validationProvider).toBeDefined();
    expect(validationProvider?.useFactory).toBeTypeOf("function");

    if (typeof validationProvider?.useFactory !== "function") {
      throw new TypeError("ValidationModule provider is missing useFactory");
    }
    const service = validationProvider.useFactory({}, {}, {}, {}, {}, {});

    expect(service).toBeInstanceOf(ValidationService);
  });
});
