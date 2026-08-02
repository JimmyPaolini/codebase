import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { mockSpawnSync } = vi.hoisted(() => ({
  mockSpawnSync: vi.fn<
    (
      command: string,
      arguments_: string[],
      options: {
        cwd: string;
        encoding: string;
        env: NodeJS.ProcessEnv;
        input: string;
      },
    ) => {
      status: number;
      stderr: Buffer | string;
      stdout: Buffer | string;
    }
  >(),
}));

vi.mock("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

import { ValidatorPythonService } from "./validator-python.service";

describe(ValidatorPythonService, () => {
  let service: ValidatorPythonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorPythonService],
    }).compile();

    service = await module.resolve(ValidatorPythonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("maps successful python errors and forwards environment settings", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        errors: [
          {
            actual: "actual",
            error_type: "file",
            expected: "expected",
            fix: "fix",
            instance_column: 2,
            instance_line: 3,
            instance_path: "instance.path",
            language: "python",
            message: "message",
            template_column: 4,
            template_line: 5,
            template_path: "template.path",
          },
          {
            error_type: "not-valid",
            language: "not-valid",
          },
        ],
      }),
    });

    const result = service.validatePythonConformance({
      data: {},
      extension: ".py",
      filename: "example.py",
      instance: "instance",
      template: "template",
    });

    const spawnArguments = mockSpawnSync.mock.calls[0];
    const pythonPath = spawnArguments?.[2].env["PYTHONPATH"];

    expect(spawnArguments?.[0]).toBe("python3");
    expect(spawnArguments?.[1]).toStrictEqual(["-m", "python.bridge"]);
    expect(spawnArguments?.[2].encoding).toBe("utf8");
    expect(spawnArguments?.[2].cwd).toBeTypeOf("string");
    expect(spawnArguments?.[2].input).toBeTypeOf("string");

    expect(pythonPath).toBeDefined();
    expect(pythonPath).toContain("tools/conformance/src/modules/validator");
    expect(result.errors).toStrictEqual([
      {
        actual: "actual",
        errorType: "file",
        expected: "expected",
        fix: "fix",
        instanceColumn: 2,
        instanceLine: 3,
        instancePath: "instance.path",
        language: "python",
        message: "message",
        templateColumn: 4,
        templateLine: 5,
        templatePath: "template.path",
      },
      {
        errorType: "code",
        fix: "Fix the conformance issue.",
        message: "Python conformance issue found.",
      },
    ]);
  });

  it("supports notebook validation path for .ipynb", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        errors: [
          {
            error_type: "code",
            fix: "fix",
            language: "python",
            message: "message",
          },
        ],
      }),
    });

    const result = service.validatePythonConformance({
      data: {},
      extension: ".ipynb",
      filename: "example.ipynb",
      instance: "instance",
      template: "template",
    });

    expect(result.errors).toStrictEqual([
      {
        errorType: "code",
        fix: "fix",
        language: "python",
        message: "message",
      },
    ]);
  });

  it("throws before spawning python for unsupported extensions", () => {
    expect(() =>
      service.validatePythonConformance({
        data: {},
        extension: ".md",
        filename: "example.md",
        instance: "instance",
        template: "template",
      }),
    ).toThrow(
      "Python validator bridge only supports .py and .ipynb files. Received: .md",
    );
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("throws when the python process exits unsuccessfully", () => {
    mockSpawnSync.mockReturnValue({
      status: 1,
      stderr: "python failed",
      stdout: "",
    });

    expect(() =>
      service.validatePythonConformance({
        data: {},
        extension: ".py",
        filename: "example.py",
        instance: "instance",
        template: "template",
      }),
    ).toThrow("Python validator failed: python failed");
  });

  it("falls back to stdout when stderr is empty on python failure", () => {
    mockSpawnSync.mockReturnValue({
      status: 2,
      stderr: "",
      stdout: "python failed stdout",
    });

    expect(() =>
      service.validatePythonConformance({
        data: {},
        extension: ".py",
        filename: "example.py",
        instance: "instance",
        template: "template",
      }),
    ).toThrow("Python validator failed: python failed stdout");
  });

  it("omits language when python payload language is unknown", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        errors: [
          {
            error_type: "code",
            fix: "fix",
            language: "unknown-language",
            message: "message",
          },
        ],
      }),
    });

    const result = service.validatePythonConformance({
      data: {},
      extension: ".py",
      filename: "example.py",
      instance: "instance",
      template: "template",
    });

    expect(result.errors[0]).toMatchObject({
      errorType: "code",
      fix: "fix",
      message: "message",
    });
    expect(result.errors[0]?.language).toBeUndefined();
  });

  it("parses successful python payloads when stdout is a buffer", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stderr: "",
      stdout: Buffer.from(
        JSON.stringify({
          errors: [
            {
              error_type: "code",
              fix: "fix",
              message: "message",
            },
          ],
        }),
      ),
    });

    const result = service.validatePythonConformance({
      data: {},
      extension: ".py",
      filename: "example.py",
      instance: "instance",
      template: "template",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      errorType: "code",
      fix: "fix",
      message: "message",
    });
  });
});
