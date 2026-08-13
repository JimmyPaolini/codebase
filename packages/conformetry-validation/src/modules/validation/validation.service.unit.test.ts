import path from "node:path";

import {
  ConfigurationModule,
  DiscoveryModule as TemplateDiscoveryModule,
} from "@jimmypaolini/conformetry-configuration";
import { LanguageModule } from "@jimmypaolini/conformetry-core";
import { FilesModule } from "@jimmypaolini/conformetry-files";
import { JsonValidatorModule } from "@jimmypaolini/conformetry-json";
import { JupyterValidatorModule } from "@jimmypaolini/conformetry-jupyter";
import { MarkdownValidatorModule } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorModule } from "@jimmypaolini/conformetry-python";
import { TextValidatorModule } from "@jimmypaolini/conformetry-text";
import { TypescriptValidatorModule } from "@jimmypaolini/conformetry-typescript";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryModule } from "../discovery/discovery.module";

import { ValidationLanguagesService } from "./validation-languages.service";
import { ValidationSelectionService } from "./validation-selection.service";
import { ValidationService } from "./validation.service";

/** Tests run from the package directory; the workspace is two levels up. */
const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..");

describe(ValidationService, () => {
  let service: ValidationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigurationModule,
        DiscoveryModule,
        FilesModule,
        JsonValidatorModule,
        JupyterValidatorModule,
        LanguageModule,
        MarkdownValidatorModule,
        PythonValidatorModule,
        TemplateDiscoveryModule,
        TextValidatorModule,
        TypescriptValidatorModule,
      ],
      providers: [
        ValidationLanguagesService,
        ValidationSelectionService,
        ValidationService,
      ],
    }).compile();

    service = await module.resolve(ValidationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports a conforming package as ok", async () => {
    const result = await service.validate({
      projectPaths: ["packages/conformetry-core"],
      workingDirectory: WORKSPACE_ROOT,
    });

    expect(result.ok).toBe(true);
    expect(result.fileResults).toStrictEqual([]);
  });

  it("descends into src/modules, not just the project root", async () => {
    const result = await service.validate({
      projectPaths: ["packages/conformetry-core"],
      workingDirectory: WORKSPACE_ROOT,
    });

    expect(
      result.checkedPaths.some((checkedPath) => {
        return checkedPath.includes(path.join("src", "modules"));
      }),
    ).toBe(true);
  });

  it("narrows to one language when asked", async () => {
    const result = await service.validate({
      projectPaths: ["packages/conformetry-core"],
      ruleNames: ["typescript"],
      workingDirectory: WORKSPACE_ROOT,
    });

    expect(result.ok).toBe(true);
  });

  it("checks nothing when no project matches the selector", async () => {
    const result = await service.validate({
      projectPaths: ["packages/does-not-exist"],
      workingDirectory: WORKSPACE_ROOT,
    });

    expect(result.checkedPaths).toStrictEqual([]);
    expect(result.ok).toBe(true);
  });
});
