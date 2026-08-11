import { describe, expect, it } from "vitest";

import { ValidationModule } from "./validation.module";
import { ValidationService } from "./validation.service";

describe(ValidationModule, () => {
  it("is defined", () => {
    expect(ValidationModule).toBeDefined();
  });

  it("creates the validation service through the module provider factory", () => {
    const providers = Reflect.getMetadata("providers", ValidationModule) as
      | (
          | unknown
          | { provide: unknown; useFactory?: (...args: unknown[]) => unknown }
        )[]
      | undefined;
    const validationProvider = providers?.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === ValidationService,
    );

    expect(validationProvider).toBeDefined();
    expect(
      typeof validationProvider === "object" &&
        validationProvider !== null &&
        "useFactory" in validationProvider &&
        validationProvider.useFactory,
    ).toBeTypeOf("function");

    const service = (
      validationProvider as {
        useFactory: (...args: unknown[]) => ValidationService;
      }
    ).useFactory({}, {}, {}, {}, {}, {});

    expect(service).toBeInstanceOf(ValidationService);
  });
});
