import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import * as conformetryConfigurationModule from "@jimmypaolini/conformetry-configuration";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PythonValidatorService } from "./python-validator.service";

type PreparedValidationDocument =
  conformetryConfigurationModule.PreparedValidationDocument;

vi.mock("@jimmypaolini/conformetry-configuration", async () => {
  const actualModule = await vi.importActual<
    typeof conformetryConfigurationModule
  >("@jimmypaolini/conformetry-configuration");

  return {
    ...actualModule,
    prepareTemplateValidationPayload: vi.fn(),
  };
});

const createPreparedValidationDocument = (
  document: PreparedValidationDocument,
): PreparedValidationDocument => document;

describe("pythonValidatorService", () => {
  const createdDirectories: string[] = [];
  let pythonValidatorService: PythonValidatorService;

  beforeEach(() => {
    pythonValidatorService = new PythonValidatorService();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      createdDirectories.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("validates path existence when configuration path is not provided", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-python-validator-"),
    );
    createdDirectories.push(workingDirectory);
    await writeFile(path.join(workingDirectory, "present.py"), "print('ok')\n");

    const result = await pythonValidatorService.validate({
      filePaths: ["present.py", "missing.py"],
      workingDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["present.py", "missing.py"],
      ok: false,
      pluginName: "python",
      violations: [
        `Missing Python path ${path.resolve(workingDirectory, "missing.py")}`,
      ],
    });
  });

  it("returns no path violations when all files are present", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-python-validator-"),
    );
    createdDirectories.push(workingDirectory);
    await writeFile(
      path.join(workingDirectory, "first.py"),
      "print('first')\n",
    );
    await writeFile(path.join(workingDirectory, "second.ipynb"), "{}\n");

    const result = await pythonValidatorService.validate({
      filePaths: ["first.py", "second.ipynb"],
      workingDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["first.py", "second.ipynb"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });

  it("validates python and notebook payload documents and appends payload violations", async () => {
    const workingDirectory = "/workspace/codebase";
    const prepareTemplateValidationPayloadMock = vi.mocked(
      conformetryConfigurationModule.prepareTemplateValidationPayload,
    );

    prepareTemplateValidationPayloadMock.mockResolvedValue({
      checkedPaths: ["demo"],
      documents: [
        createPreparedValidationDocument({
          filename: "source.py",
          instance:
            "import os\nimport sys\n\ndef hello() -> None:\n    print('ok')\n",
          instanceFilePath: "/workspace/codebase/demo/source.py",
          renderedTemplate:
            "import os\nimport json\n\ndef hello() -> None:\n    print('ok')\n",
          templateFilePath: "/workspace/codebase/templates/source.py",
        }),
        createPreparedValidationDocument({
          filename: "notebook.ipynb",
          instance: JSON.stringify({
            items: [{ choice: "B" }, { kind: "value", nested: [{}] }, 1],
            meta: {},
          }),
          instanceFilePath: "/workspace/codebase/demo/notebook.ipynb",
          renderedTemplate: JSON.stringify({
            items: [1, 2, { kind: "value", nested: [{ required: true }] }],
            meta: { version: 1 },
          }),
          templateFilePath: "/workspace/codebase/templates/notebook.ipynb",
        }),
        createPreparedValidationDocument({
          filename: "nullable.ipynb",
          instance: JSON.stringify({ nullable: null }),
          instanceFilePath: "/workspace/codebase/demo/nullable.ipynb",
          renderedTemplate: JSON.stringify({ nullable: null }),
          templateFilePath: "/workspace/codebase/templates/nullable.ipynb",
        }),
        createPreparedValidationDocument({
          filename: "empty-array.ipynb",
          instance: JSON.stringify({ items: [] }),
          instanceFilePath: "/workspace/codebase/demo/empty-array.ipynb",
          renderedTemplate: JSON.stringify({
            items: [{ required: "value" }],
          }),
          templateFilePath: "/workspace/codebase/templates/empty-array.ipynb",
        }),
      ],
      violations: ["payload level violation"],
    });

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.json",
      filePaths: ["demo"],
      templateRuleNames: ["python-template"],
      workingDirectory,
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.json",
      fileExtensions: [".ipynb", ".py"],
      filePaths: ["demo"],
      templateRuleNames: ["python-template"],
      workingDirectory,
    });
    expect(result.ok).toBe(false);
    expect(result.pluginName).toBe("python");
    expect(result.violations).toContain(
      "/workspace/codebase/demo/source.py: Missing line at template line 2: import json (template: /workspace/codebase/templates/source.py)",
    );
    expect(result.violations).toContain(
      '/workspace/codebase/demo/notebook.ipynb: Missing required array value 2 at "items" (template: /workspace/codebase/templates/notebook.ipynb)',
    );
    expect(result.violations).toContain(
      '/workspace/codebase/demo/notebook.ipynb: Missing required key "meta.version" (template: /workspace/codebase/templates/notebook.ipynb)',
    );
    expect(result.violations).toContain(
      '/workspace/codebase/demo/empty-array.ipynb: Missing required array structure at "items" (template: /workspace/codebase/templates/empty-array.ipynb)',
    );
    expect(result.violations).toContain("payload level violation");
  });

  it("omits templateRuleNames when no rules are provided", async () => {
    const workingDirectory = "/workspace/codebase";
    const prepareTemplateValidationPayloadMock = vi.mocked(
      conformetryConfigurationModule.prepareTemplateValidationPayload,
    );
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      checkedPaths: ["demo"],
      documents: [],
      violations: [],
    });

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.json",
      filePaths: ["demo"],
      workingDirectory,
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.json",
      fileExtensions: [".ipynb", ".py"],
      filePaths: ["demo"],
      workingDirectory,
    });
    expect(result).toStrictEqual({
      checkedPaths: ["demo"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });
});
