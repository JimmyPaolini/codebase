import { createMock } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import { Line, Text } from "@codebase/lexico-entities";

import { TextsResolver } from "./texts.resolver";

import type { LiteratureService } from "./literature.service";

/** Builds a line with the given index under a text. */
function createLine(index: number): Line {
  return Object.assign(new Line(), { id: `line-${String(index)}`, index });
}

describe("texts resolver suite", () => {
  it("resolves a text's lines in index order even when the relation was joined out of order", async () => {
    expect.hasAssertions();

    const text = Object.assign(new Text(), {
      id: "text-1",
      lines: [createLine(34), createLine(49), createLine(10), createLine(0)],
    });
    const orderedLines = [0, 10, 34, 49].map((index) => createLine(index));
    const listLines = vi
      .fn<LiteratureService["listLines"]>()
      .mockResolvedValue(orderedLines);
    const textsResolver = new TextsResolver(
      createMock<LiteratureService>({ listLines }),
    );

    const lines = await textsResolver.linesForText(text);

    expect(lines.map((line) => line.index)).toStrictEqual([0, 10, 34, 49]);
    expect(listLines).toHaveBeenCalledWith("text-1");
  });

  it("resolves lines and child texts for a text loaded without those relations", async () => {
    expect.hasAssertions();

    const text = Object.assign(new Text(), { id: "text-1" });
    const child = Object.assign(new Text(), { id: "text-2", title: "Liber I" });
    const listLines = vi
      .fn<LiteratureService["listLines"]>()
      .mockResolvedValue([createLine(0)]);
    const listTexts = vi
      .fn<LiteratureService["listTexts"]>()
      .mockResolvedValue([child]);
    const textsResolver = new TextsResolver(
      createMock<LiteratureService>({ listLines, listTexts }),
    );

    await expect(textsResolver.linesForText(text)).resolves.toStrictEqual([
      createLine(0),
    ]);
    await expect(textsResolver.childTexts(text)).resolves.toStrictEqual([
      child,
    ]);
    expect(listTexts).toHaveBeenCalledWith(undefined, "text-1");
  });
});
