import { describe, expect, it } from "vitest";

import { DEFAULT_VALIDATION_TARGET_NAME } from "../plugin-options/plugin-options.constants";

import { ValidationTargetService } from "./validation-target.service";

describe(ValidationTargetService, () => {
  it("returns undefined when no generator tags are provided", () => {
    const service = new ValidationTargetService();

    expect(
      service.buildInferredValidationTarget({
        projectRoot: "packages/conformetry-nx",
        projectTags: ["framework:react", "language:typescript"],
      }),
    ).toBeUndefined();
  });

  it("builds a validation target with the default target name and sorted unique rules", () => {
    const service = new ValidationTargetService();

    expect(
      service.buildInferredValidationTarget({
        projectRoot: "packages/conformetry-nx",
        projectTags: [
          "generator:nestjs-service-module",
          "generator:nestjs-command-module",
          "generator:nestjs-service-module",
        ],
      }),
    ).toStrictEqual({
      [DEFAULT_VALIDATION_TARGET_NAME]: {
        command:
          "pnpm nx run codebase:conformetry-validate -- --projects=packages/conformetry-nx --rules=nestjs-command-module,nestjs-service-module",
      },
    });
  });

  it("uses a custom target name and normalizes project root paths", () => {
    const service = new ValidationTargetService();

    expect(
      service.buildInferredValidationTarget({
        pluginOptions: {
          validationTargetName: "validate-custom",
        },
        projectRoot: String.raw`./packages\conformetry-nx`,
        projectTags: ["generator:react-component"],
      }),
    ).toStrictEqual({
      "validate-custom": {
        command:
          "pnpm nx run codebase:conformetry-validate -- --projects=packages/conformetry-nx --rules=react-component",
      },
    });
  });

  it("extracts only non-empty generator rule names", () => {
    const service = new ValidationTargetService();

    expect(
      service.extractGeneratorRuleNames([
        "framework:react",
        "generator:",
        "generator:react-component",
        "generator:nestjs-service-module",
      ]),
    ).toStrictEqual(["nestjs-service-module", "react-component"]);
  });
});
