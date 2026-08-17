import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildCallGraphResult } from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { MissingMarkdownPathError } from "./output-markdown.errors";
import { OutputMarkdownService } from "./output-markdown.service";

import type { ResolvedCallidescopeMarkdownOutputConfiguration } from "@callidescope/configuration";

/** Builds a markdown destination pointing at the given path. */
function buildDestination(
  filePath: string,
  overrides: Partial<ResolvedCallidescopeMarkdownOutputConfiguration> = {},
): ResolvedCallidescopeMarkdownOutputConfiguration {
  return {
    description: undefined,
    endMarker: "<!-- CALL_STACKS_END -->",
    path: filePath,
    render: undefined,
    startMarker: "<!-- CALL_STACKS_START -->",
    write: undefined,
    ...overrides,
  };
}

describe(OutputMarkdownService, () => {
  let service: OutputMarkdownService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [OutputMarkdownService],
    }).compile();

    service = await module.resolve(OutputMarkdownService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subject = new OutputMarkdownService();
  const result = buildCallGraphResult();

  /** Returns a path inside a fresh temporary directory. */
  async function temporaryPath(): Promise<string> {
    const directory = await mkdtemp(
      path.join(tmpdir(), "callidescope-markdown-"),
    );

    return path.join(directory, "REPORT.md");
  }

  // 📝 Rendering

  it("renders the built-in tables by default", () => {
    const content = subject.render({
      destination: buildDestination(""),
      result,
    });

    expect(content).toContain("Deep call stacks");
    expect(content).toContain("Module spread");
  });

  it("uses a configured renderer instead of the built-in tables", () => {
    const content = subject.render({
      destination: buildDestination("", { render: () => "custom" }),
      result,
    });

    expect(content).toBe("custom");
  });

  it("hands a configured renderer the built-in tables to build on", () => {
    const content = subject.render({
      destination: buildDestination("", {
        render: (args) => `prefix\n${args.renderTables()}`,
      }),
      result,
    });

    expect(content).toContain("prefix");
    expect(content).toContain("Deep call stacks");
  });

  it("wraps content in the configured anchors", () => {
    expect(
      subject.wrapInAnchors({
        content: "body",
        destination: buildDestination(""),
      }),
    ).toBe("<!-- CALL_STACKS_START -->\n\nbody\n<!-- CALL_STACKS_END -->");
  });

  // 📄 Splicing

  it("replaces the block between existing anchors", async () => {
    const filePath = await temporaryPath();

    await writeFile(
      filePath,
      "# Title\n\n<!-- CALL_STACKS_START -->\n\nold\n<!-- CALL_STACKS_END -->\n\nAfter.\n",
      "utf8",
    );
    subject.syncAnchoredBlock({
      check: false,
      content: "new",
      destination: buildDestination(filePath),
      path: undefined,
    });

    const written = await readFile(filePath, "utf8");

    expect(written).toContain("new");
    expect(written).not.toContain("old");
    expect(written).toContain("After.");
  });

  it("appends the block when the file has no anchors", async () => {
    const filePath = await temporaryPath();

    await writeFile(filePath, "# Title\n", "utf8");
    subject.syncAnchoredBlock({
      check: false,
      content: "body",
      destination: buildDestination(filePath),
      path: undefined,
    });

    await expect(readFile(filePath, "utf8")).resolves.toContain(
      "<!-- CALL_STACKS_START -->",
    );
  });

  it("creates the file when it does not exist", async () => {
    const filePath = await temporaryPath();

    subject.syncAnchoredBlock({
      check: false,
      content: "body",
      destination: buildDestination(filePath),
      path: undefined,
    });

    await expect(readFile(filePath, "utf8")).resolves.toContain("body");
  });

  it("does not treat a dollar sign in the content as a pattern reference", async () => {
    const filePath = await temporaryPath();

    await writeFile(
      filePath,
      "<!-- CALL_STACKS_START -->\n\nold\n<!-- CALL_STACKS_END -->\n",
      "utf8",
    );
    subject.syncAnchoredBlock({
      check: false,
      content: "cost: $& and $1",
      destination: buildDestination(filePath),
      path: undefined,
    });

    await expect(readFile(filePath, "utf8")).resolves.toContain(
      "cost: $& and $1",
    );
  });

  it("writes to an overriding path when one is given", async () => {
    const configured = await temporaryPath();
    const override = await temporaryPath();

    subject.syncAnchoredBlock({
      check: false,
      content: "body",
      destination: buildDestination(configured),
      path: override,
    });

    await expect(readFile(override, "utf8")).resolves.toContain("body");
  });

  it("throws when nothing names a file to write", () => {
    expect(() =>
      subject.syncAnchoredBlock({
        check: false,
        content: "body",
        destination: buildDestination(""),
        path: undefined,
      }),
    ).toThrow(MissingMarkdownPathError);
  });

  // ✅ Check mode

  it("reports a current block as current", async () => {
    const filePath = await temporaryPath();
    const destination = buildDestination(filePath);

    subject.sync({ check: false, destination, result });

    expect(subject.sync({ check: true, destination, result })).toBe(true);
  });

  it("reports a drifted block as stale", async () => {
    const filePath = await temporaryPath();

    await writeFile(
      filePath,
      "<!-- CALL_STACKS_START -->\n\nstale\n<!-- CALL_STACKS_END -->\n",
      "utf8",
    );

    expect(
      subject.sync({
        check: true,
        destination: buildDestination(filePath),
        result,
      }),
    ).toBe(false);
  });

  it("reports a file with no anchors as stale", async () => {
    const filePath = await temporaryPath();

    await writeFile(filePath, "# Title\n", "utf8");

    expect(
      subject.sync({
        check: true,
        destination: buildDestination(filePath),
        result,
      }),
    ).toBe(false);
  });

  it("reports a missing file as stale rather than failing", async () => {
    expect(
      subject.sync({
        check: true,
        destination: buildDestination(await temporaryPath()),
        result,
      }),
    ).toBe(false);
  });

  it("writes nothing in check mode", async () => {
    const filePath = await temporaryPath();

    await writeFile(filePath, "untouched", "utf8");
    subject.sync({
      check: true,
      destination: buildDestination(filePath),
      result,
    });

    await expect(readFile(filePath, "utf8")).resolves.toBe("untouched");
  });

  // 🔌 Custom writers

  it("defers to a configured writer", async () => {
    const write = vi.fn(() => true);

    subject.sync({
      check: false,
      destination: buildDestination(await temporaryPath(), { write }),
      result,
    });

    expect(write).toHaveBeenCalledTimes(1);
  });

  it("passes a configured writer's verdict straight through", async () => {
    expect(
      subject.sync({
        check: true,
        destination: buildDestination(await temporaryPath(), {
          write: () => false,
        }),
        result,
      }),
    ).toBe(false);
  });

  it("lets a configured writer splice the block itself", async () => {
    const filePath = await temporaryPath();

    subject.sync({
      check: false,
      destination: buildDestination(filePath, {
        write: (args) => args.helpers.syncAnchoredBlock(),
      }),
      result,
    });

    await expect(readFile(filePath, "utf8")).resolves.toContain(
      "<!-- CALL_STACKS_START -->",
    );
  });

  it("lets a configured writer wrap its own content", async () => {
    let wrapped = "";

    subject.sync({
      check: false,
      destination: buildDestination(await temporaryPath(), {
        write: (args) => {
          wrapped = args.helpers.wrapInAnchors("mine");

          return true;
        },
      }),
      result,
    });

    expect(wrapped).toContain("mine");
  });

  it("wraps the rendered content when a writer passes nothing", async () => {
    let wrapped = "";

    subject.sync({
      check: false,
      destination: buildDestination(await temporaryPath(), {
        write: (args) => {
          wrapped = args.helpers.wrapInAnchors();

          return true;
        },
      }),
      result,
    });

    expect(wrapped).toContain("Deep call stacks");
  });

  it("splices a writer's own content when it passes some", async () => {
    const filePath = await temporaryPath();

    subject.sync({
      check: false,
      destination: buildDestination(filePath, {
        write: (args) => args.helpers.syncAnchoredBlock({ content: "mine" }),
      }),
      result,
    });

    await expect(readFile(filePath, "utf8")).resolves.toContain("mine");
  });

  it("exposes the configured markers to a writer", async () => {
    let markers = "";

    subject.sync({
      check: false,
      destination: buildDestination(await temporaryPath(), {
        write: (args) => {
          markers = `${args.helpers.startMarker}|${args.helpers.endMarker}`;

          return true;
        },
      }),
      result,
    });

    expect(markers).toBe("<!-- CALL_STACKS_START -->|<!-- CALL_STACKS_END -->");
  });

  it("lets a configured writer redirect to another path", async () => {
    const override = await temporaryPath();

    subject.sync({
      check: false,
      destination: buildDestination(await temporaryPath(), {
        write: (args) => args.helpers.syncAnchoredBlock({ path: override }),
      }),
      result,
    });

    await expect(readFile(override, "utf8")).resolves.toContain(
      "<!-- CALL_STACKS_START -->",
    );
  });
});
