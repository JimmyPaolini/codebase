import { describe, expect, it } from "vitest";

import { ValidationService } from "./validation.service";
import { ValidationModule } from "./validation.module";

describe(ValidationModule, () => {
  it("is defined", () => {
    expect(ValidationModule).toBeDefined();
  });

  it("creates the validation service through the module provider factory", () => {
    const providers = Reflect.getMetadata("providers", ValidationModule) as
      | Array<
          | { provide: unknown; useFactory?: (...args: unknown[]) => unknown }
          | unknown
        >
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
    ).useFactory(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(service).toBeInstanceOf(ValidationService);
  });
});
