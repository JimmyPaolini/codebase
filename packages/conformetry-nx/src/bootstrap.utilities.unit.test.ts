import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { lstat, readlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapPlugin, runBootstrapCli } from "./bootstrap.utilities";
import { DEFAULT_OUTPUT_PATH } from "./modules/generator/generator.constants";
import {
  resolveGeneratorService,
  resolveOptionsService,
} from "./plugin-context.utilities";

// What the emitted files contain is the generator service's business and is
// tested there; what these functions own is putting them where Nx looks.
vi.mock("./plugin-context.utilities", () => ({
  resolveGeneratorService: vi.fn(),
  resolveOptionsService: vi.fn(),
}));

const emitPlugin = vi.fn();
const resolveConfigurationPath = vi.fn();

describe("bootstrap utilities", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), "conformetry-bootstrap-"));
    emitPlugin.mockResolvedValue([
      {
        content: '{ "generators": {} }\n',
        filePath: path.join(DEFAULT_OUTPUT_PATH, "generators.json"),
      },
      {
        content: "{}\n",
        filePath: path.join(DEFAULT_OUTPUT_PATH, "src/schemas/kept.json"),
      },
    ]);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveGeneratorService).mockResolvedValue({
      emitPlugin,
    } as unknown as Awaited<ReturnType<typeof resolveGeneratorService>>);
    resolveConfigurationPath.mockReturnValue("conformetry.config.ts");
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveOptionsService).mockResolvedValue({
      resolveConfigurationPath,
    } as unknown as Awaited<ReturnType<typeof resolveOptionsService>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(bootstrapPlugin, () => {
    it("writes every emitted file to disk", async () => {
      await bootstrapPlugin(workspaceRoot);

      expect(
        readFileSync(
          path.join(workspaceRoot, DEFAULT_OUTPUT_PATH, "generators.json"),
          "utf8",
        ),
      ).toBe('{ "generators": {} }\n');
    });

    it("drops a schema the configuration no longer declares", async () => {
      const schemasPath = path.join(
        workspaceRoot,
        DEFAULT_OUTPUT_PATH,
        "src/schemas",
      );

      mkdirSync(schemasPath, { recursive: true });
      writeFileSync(path.join(schemasPath, "removed.json"), "{}\n", "utf8");

      await bootstrapPlugin(workspaceRoot);

      expect(existsSync(path.join(schemasPath, "removed.json"))).toBe(false);
      expect(existsSync(path.join(schemasPath, "kept.json"))).toBe(true);
    });

    it("links the emitted plugin into the root node_modules", async () => {
      await bootstrapPlugin(workspaceRoot);

      const linkPath = path.join(workspaceRoot, "node_modules/conformetry");
      const linkStatistics = await lstat(linkPath);

      expect(linkStatistics.isSymbolicLink()).toBe(true);
      // Relative, so the link keeps working if the workspace is moved.
      expect(path.isAbsolute(await readlink(linkPath))).toBe(false);
      expect(readFileSync(path.join(linkPath, "generators.json"), "utf8")).toBe(
        '{ "generators": {} }\n',
      );
    });

    it("replaces the link rather than failing when bootstrapped twice", async () => {
      await bootstrapPlugin(workspaceRoot);

      await expect(bootstrapPlugin(workspaceRoot)).resolves.toHaveLength(2);
    });

    it("refuses to overwrite an installed package of the same name", async () => {
      // The plugin's name is unscoped, so an unrelated dependency could hold
      // this path; deleting it would be worse than failing to link.
      mkdirSync(path.join(workspaceRoot, "node_modules/conformetry"), {
        recursive: true,
      });

      await expect(bootstrapPlugin(workspaceRoot)).rejects.toThrow(
        "is an installed package",
      );
    });

    it("returns the files it emitted", async () => {
      await expect(bootstrapPlugin(workspaceRoot)).resolves.toHaveLength(2);
    });

    it("emits from the path the workspace registered the plugin with", async () => {
      const nxConfiguration = {
        plugins: [
          {
            options: { configurationPath: "elsewhere/conformetry.config.ts" },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      };

      writeFileSync(
        path.join(workspaceRoot, "nx.json"),
        JSON.stringify(nxConfiguration),
        "utf8",
      );
      resolveConfigurationPath.mockReturnValue(
        "elsewhere/conformetry.config.ts",
      );

      await bootstrapPlugin(workspaceRoot);

      // A postinstall gets no options from Nx, so the registration is read.
      expect(resolveConfigurationPath).toHaveBeenCalledWith(nxConfiguration);
      expect(emitPlugin).toHaveBeenCalledWith({
        configurationPath: "elsewhere/conformetry.config.ts",
        outputPath: DEFAULT_OUTPUT_PATH,
        packageName: "conformetry",
      });
    });

    it("emits from the default when the workspace has no nx.json", async () => {
      await bootstrapPlugin(workspaceRoot);

      expect(resolveConfigurationPath).toHaveBeenCalledWith(undefined);
    });
  });

  describe(runBootstrapCli, () => {
    it("reports what it emitted", async () => {
      const info = vi.spyOn(console, "info").mockReturnValue(undefined);

      await runBootstrapCli(workspaceRoot);

      expect(info).toHaveBeenCalledWith(expect.stringContaining("Emitted 2"));
    });

    it("warns rather than failing the install when the emit throws", async () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

      emitPlugin.mockRejectedValue(new Error("the configuration is broken"));

      await expect(runBootstrapCli(workspaceRoot)).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith("the configuration is broken");
    });

    it("warns with whatever was thrown when it is not an error", async () => {
      const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);

      emitPlugin.mockRejectedValue("thrown as a string");

      await runBootstrapCli(workspaceRoot);

      expect(warn).toHaveBeenCalledWith("thrown as a string");
    });
  });
});
