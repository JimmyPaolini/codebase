import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PythonValidatorService } from "./python-validator.service";

interface PreparedValidationDocument {
  filename: string;
  instance: string;
  instanceFilePath: string;
  renderedTemplate: string;
  templateFilePath: string;
}

interface PreparedValidationPayload {
  checkedPaths: string[];
  documents: PreparedValidationDocument[];
  violations: string[];
}

type PrepareTemplateValidationPayload = (
  arguments_: PrepareTemplateValidationPayloadArguments,
) => Promise<PreparedValidationPayload>;

interface PrepareTemplateValidationPayloadArguments {
  configurationPath: string;
  fileExtensions: string[];
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
}

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock:
      vi.fn<PrepareTemplateValidationPayload>(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

const createPreparedValidationPayload = (
  payload: Omit<PreparedValidationPayload, "checkedPaths"> & {
    checkedPaths?: string[] | undefined;
  },
): PreparedValidationPayload => {
  return {
    checkedPaths:
      payload.checkedPaths ??
      payload.documents.map((document) => document.instanceFilePath),
    documents: payload.documents,
    violations: payload.violations,
  };
};

describe(PythonValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("reports missing paths when configurationPath is undefined", async () => {
    const pythonValidatorService = new PythonValidatorService();
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "python-validator-paths-"),
    );
    try {
      await writeFile(
        path.join(workingDirectory, "existing.py"),
        "print('ok')\n",
      );

      const result = await pythonValidatorService.validate({
        filePaths: ["existing.py", "missing.py"],
        workingDirectory,
      });

      expect(result).toStrictEqual({
        checkedPaths: ["existing.py", "missing.py"],
        ok: false,
        pluginName: "python",
        violations: [
          `Missing Python path ${path.resolve(workingDirectory, "missing.py")}`,
        ],
      });
      expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    } finally {
      await rm(workingDirectory, { force: true, recursive: true });
    }
  });

  it("returns success when every requested path exists", async () => {
    const pythonValidatorService = new PythonValidatorService();
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "python-validator-paths-ok-"),
    );
    try {
      await writeFile(path.join(workingDirectory, "first.py"), "print('a')\n");
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
      expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    } finally {
      await rm(workingDirectory, { force: true, recursive: true });
    }
  });

  it("forwards templateRuleNames and reports missing python source lines", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "module.py",
            instance: "print('alpha')\n",
            instanceFilePath: "src/module.py",
            renderedTemplate: "print('alpha')\nprint('alpha')\n",
            templateFilePath: "templates/module.py",
          },
        ],
        violations: ["payload-level violation"],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/module.py"],
      templateRuleNames: ["python-template-rule"],
      workingDirectory: process.cwd(),
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".ipynb", ".py"],
      filePaths: ["src/module.py"],
      templateRuleNames: ["python-template-rule"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      "src/module.py: Missing line at template line 2: print('alpha') (template: templates/module.py)",
    );
    expect(result.violations).toContain("payload-level violation");
  });

  it("reports missing nested notebook keys with dot path formatting", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "example.ipynb",
            instance: '{"metadata":{}}',
            instanceFilePath: "src/example.ipynb",
            renderedTemplate: '{"metadata":{"kernelspec":{"name":"python3"}}}',
            templateFilePath: "templates/example.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.ipynb: Missing required key "metadata.kernelspec" (template: templates/example.ipynb)',
    );
  });

  it("reports missing notebook primitive array values", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "array-values.ipynb",
            instance: '{"tags":["lint"]}',
            instanceFilePath: "src/array-values.ipynb",
            renderedTemplate: '{"tags":["core"]}',
            templateFilePath: "templates/array-values.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/array-values.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/array-values.ipynb: Missing required array value "core" at "tags" (template: templates/array-values.ipynb)',
    );
  });

  it("accepts notebook primitive array values when they are present", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "array-values-ok.ipynb",
            instance: '{"tags":["core","lint"]}',
            instanceFilePath: "src/array-values-ok.ipynb",
            renderedTemplate: '{"tags":["core"]}',
            templateFilePath: "templates/array-values-ok.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/array-values-ok.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result).toStrictEqual({
      checkedPaths: ["src/array-values-ok.ipynb"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });

  it("reports missing notebook array structure when object array is empty", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "array-structure.ipynb",
            instance: '{"cells":[]}',
            instanceFilePath: "src/array-structure.ipynb",
            renderedTemplate: '{"cells":[{"cell_type":"code"}]}',
            templateFilePath: "templates/array-structure.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/array-structure.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/array-structure.ipynb: Missing required array structure at "cells" (template: templates/array-structure.ipynb)',
    );
  });

  it("formats indexed notebook paths for primitive mismatches inside arrays", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "array-index.ipynb",
            instance: '{"cells":[{"metadata":{"language":"javascript"}}]}',
            instanceFilePath: "src/array-index.ipynb",
            renderedTemplate: '{"cells":[{"metadata":{"language":"python"}}]}',
            templateFilePath: "templates/array-index.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/array-index.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/array-index.ipynb: Expected "python" at "cells[0].metadata.language" but found "javascript" (template: templates/array-index.ipynb)',
    );
  });

  it("chooses the best notebook array candidate when one candidate fully matches", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "best-candidate.ipynb",
            instance:
              '{"cells":[{"metadata":{"language":"javascript"}},{"metadata":{"language":"python"}}]}',
            instanceFilePath: "src/best-candidate.ipynb",
            renderedTemplate: '{"cells":[{"metadata":{"language":"python"}}]}',
            templateFilePath: "templates/best-candidate.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/best-candidate.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result).toStrictEqual({
      checkedPaths: ["src/best-candidate.ipynb"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });

  it("keeps the first array candidate when notebook candidate violations tie", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "tied-candidates.ipynb",
            instance:
              '{"cells":[{"metadata":{"language":"rust"}},{"metadata":{"language":"go"}}]}',
            instanceFilePath: "src/tied-candidates.ipynb",
            renderedTemplate: '{"cells":[{"metadata":{"language":"python"}}]}',
            templateFilePath: "templates/tied-candidates.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/tied-candidates.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/tied-candidates.ipynb: Expected "python" at "cells[0].metadata.language" but found "rust" (template: templates/tied-candidates.ipynb)',
    );
  });

  it("reports missing python source lines that do not exist at all in the instance", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "line-absence.py",
            instance: "print('alpha')\n",
            instanceFilePath: "src/line-absence.py",
            renderedTemplate: "print('beta')\n",
            templateFilePath: "templates/line-absence.py",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/line-absence.py"],
      workingDirectory: process.cwd(),
    });

    expect(result.violations).toContain(
      "src/line-absence.py: Missing line at template line 1: print('beta') (template: templates/line-absence.py)",
    );
  });

  it("accepts null notebook values when template and instance match", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue(
      createPreparedValidationPayload({
        documents: [
          {
            filename: "null-values.ipynb",
            instance: '{"metadata":{"optional":null}}',
            instanceFilePath: "src/null-values.ipynb",
            renderedTemplate: '{"metadata":{"optional":null}}',
            templateFilePath: "templates/null-values.ipynb",
          },
        ],
        violations: [],
      }),
    );

    const pythonValidatorService = new PythonValidatorService();

    const result = await pythonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/null-values.ipynb"],
      workingDirectory: process.cwd(),
    });

    expect(result).toStrictEqual({
      checkedPaths: ["src/null-values.ipynb"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });
});
