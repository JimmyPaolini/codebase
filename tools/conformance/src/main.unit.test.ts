import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as MainModule from "./main";

interface GeneratorInvocation {
  name: string;
  options: Record<string, unknown>;
  symbol: keyof Pick<
    typeof MainModule,
    | "generateJupyterNotebookApplication"
    | "generateNestjsCommandApplication"
    | "generateNestjsCommandModule"
    | "generateNestjsDataloaderModule"
    | "generateNestjsGraphqlApplication"
    | "generateNestjsGraphqlModule"
    | "generateNestjsServiceFile"
    | "generateNestjsServiceModule"
    | "generateReactComponent"
  >;
}

const {
  closeMock,
  createWithoutRunningMock,
  getMock,
  runCommandMock,
  runFactoryMock,
  setContextMock,
} = vi.hoisted(() => {
  return {
    closeMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createWithoutRunningMock: vi.fn<
      () => Promise<{
        close: () => Promise<void>;
        get: () => { run: () => Promise<void> };
      }>
    >(),
    getMock: vi.fn<() => { run: () => Promise<void> }>(),
    runCommandMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    runFactoryMock: vi
      .fn<
        (
          module: unknown,
          options?: { bufferLogs?: boolean; logger?: unknown },
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined),
    setContextMock: vi.fn<(context: string) => void>(),
  };
});

vi.mock("nest-commander", async (importOriginal) => {
  const importedModule = await importOriginal();
  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...actual,
    CommandFactory: {
      createWithoutRunning: createWithoutRunningMock,
      run: runFactoryMock,
    },
  };
});

vi.mock("./modules/logger/logger.service", () => ({
  LoggerService: class {
    setContext = setContextMock;
  },
}));

describe("main bootstrap", () => {
  beforeEach(() => {
    closeMock.mockClear();
    createWithoutRunningMock.mockClear();
    getMock.mockClear();
    runCommandMock.mockClear();
    runFactoryMock.mockClear();
    setContextMock.mockClear();

    runFactoryMock.mockResolvedValue(undefined);
    runCommandMock.mockResolvedValue(undefined);
    getMock.mockReturnValue({ run: runCommandMock });
    createWithoutRunningMock.mockResolvedValue({
      close: closeMock,
      get: getMock,
    });

    vi.resetModules();
  });

  it("does not run command factory when imported", async () => {
    await import("./main");

    expect(setContextMock).not.toHaveBeenCalled();
    expect(runFactoryMock).not.toHaveBeenCalled();
  }, 15_000);

  const invocations: GeneratorInvocation[] = [
    {
      name: "generateJupyterNotebookApplication",
      options: { name: "unit-test-notebook" },
      symbol: "generateJupyterNotebookApplication",
    },
    {
      name: "generateNestjsCommandApplication",
      options: { name: "unit-test-command-app" },
      symbol: "generateNestjsCommandApplication",
    },
    {
      name: "generateNestjsCommandModule",
      options: { name: "unit-test-command-module", project: "my-app" },
      symbol: "generateNestjsCommandModule",
    },
    {
      name: "generateNestjsDataloaderModule",
      options: { name: "unit-test-dataloader-module", project: "my-app" },
      symbol: "generateNestjsDataloaderModule",
    },
    {
      name: "generateNestjsGraphqlApplication",
      options: { name: "unit-test-graphql-app" },
      symbol: "generateNestjsGraphqlApplication",
    },
    {
      name: "generateNestjsGraphqlModule",
      options: { name: "unit-test-graphql-module", project: "my-app" },
      symbol: "generateNestjsGraphqlModule",
    },
    {
      name: "generateNestjsServiceFile",
      options: {
        module: "users",
        name: "unit-test-service-file",
        project: "my-app",
      },
      symbol: "generateNestjsServiceFile",
    },
    {
      name: "generateNestjsServiceModule",
      options: { name: "unit-test-service-module", project: "my-app" },
      symbol: "generateNestjsServiceModule",
    },
    {
      name: "generateReactComponent",
      options: { name: "unit-test-component", project: "lexico-components" },
      symbol: "generateReactComponent",
    },
  ];

  it.each(invocations)(
    "$name forwards options to command.run and closes the application",
    async ({ options, symbol }) => {
      const tree = createTreeWithEmptyWorkspace();
      const module = await import("./main");
      const generate = module[symbol];

      const callback = await generate(tree, options);

      expect(runCommandMock).toHaveBeenCalledWith([], options);
      expect(closeMock).toHaveBeenCalledTimes(1);
      await expect(Promise.resolve(callback())).resolves.toBeUndefined();
    },
  );

  it.each(invocations)(
    "$name closes the application when command.run throws",
    async ({ options, symbol }) => {
      const tree = createTreeWithEmptyWorkspace();
      const module = await import("./main");
      const generate = module[symbol];
      runCommandMock.mockRejectedValueOnce(new Error("run failure"));

      await expect(generate(tree, options)).rejects.toThrow("run failure");
      expect(closeMock).toHaveBeenCalledTimes(1);
    },
  );
});
