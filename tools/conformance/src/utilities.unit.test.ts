import { describe, expect, it } from "vitest";

import {
  buildCommandFactoryRunOptions,
  createWorkspaceTree,
} from "./utilities";

describe("utilities", () => {
  it("creates a workspace tree", () => {
    const tree = createWorkspaceTree();

    expect(tree).toBeDefined();
    expect(typeof tree.listChanges).toBe("function");
    expect(typeof tree.read).toBe("function");
    expect(typeof tree.write).toBe("function");
  });

  it("builds command factory run options with logger", () => {
    const options = buildCommandFactoryRunOptions();

    expect(options.bufferLogs).toBe(true);
    expect(options.logger).toBeDefined();
    expect(typeof options.serviceErrorHandler).toBe("function");
    expect(typeof options.logger).toBe("object");
  });

  it("rethrows service errors and sets a failing exit code", () => {
    const options = buildCommandFactoryRunOptions();
    const originalExitCode = process.exitCode;

    process.exitCode = 0;

    expect(() => {
      options.serviceErrorHandler?.(new Error("Validation failed"));
    }).toThrow("Validation failed");
    expect(process.exitCode).toBe(1);

    process.exitCode = originalExitCode;
  });
});
