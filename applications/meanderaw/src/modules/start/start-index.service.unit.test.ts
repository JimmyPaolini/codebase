import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { StartIndexService } from "./start-index.service";

import type { OutputDocument } from "./start.types";

describe(StartIndexService, () => {
  let service: StartIndexService;

  const documents: OutputDocument[] = [
    { directory: "boxes/3-rows", fileName: "spin-8-repeats.svg" },
    { directory: "boxes/3-rows", fileName: "plain-6-repeats.svg" },
    { directory: "boxes/10-rows", fileName: "plain-6-repeats.svg" },
    {
      directory: "mosaic/6-rows/permutations/1-columns",
      fileName: "ddddd-dots.svg",
    },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [StartIndexService],
    }).compile();

    service = await module.resolve(StartIndexService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("links every drawing relative to the page rather than inlining it", () => {
      const page = service.render("output", documents);

      expect(page).toContain(
        'src="output/mosaic/6-rows/permutations/1-columns/ddddd-dots.svg"',
      );
      expect(page).toContain('src="output/boxes/3-rows/spin-8-repeats.svg"');
      expect(page).not.toContain("<path");
    });

    it("captions every drawing with its own filename", () => {
      const page = service.render("output", documents);

      expect(page).toContain("<figcaption>spin-8-repeats.svg</figcaption>");
    });

    it("groups the drawings into the directories they landed in, and counts them", () => {
      const page = service.render("output", documents);

      expect(page).toContain('<section id="boxes-3-rows">');
      expect(page).toContain("<h2>boxes/3-rows</h2>");
      expect(page).toContain("2 drawings");
      expect(page).toContain("1 drawing<");
      expect(page).toContain("4 drawings across 3 directories.");
    });

    it("orders directories and filenames the way a reader reads them", () => {
      const page = service.render("output", documents);

      expect(page.indexOf("<h2>boxes/3-rows</h2>")).toBeLessThan(
        page.indexOf("<h2>boxes/10-rows</h2>"),
      );
      expect(page.indexOf("plain-6-repeats.svg</figcaption>")).toBeLessThan(
        page.indexOf("spin-8-repeats.svg</figcaption>"),
      );
    });

    it("links each directory from a jump list, so a section far down the page is one click away", () => {
      const page = service.render("output", documents);

      expect(page).toContain('<a href="#boxes-3-rows">boxes/3-rows</a>');
    });

    it("escapes anything in a path that would otherwise close a tag", () => {
      const page = service.render("output", [
        { directory: '<script>&"', fileName: "plain-6-repeats.svg" },
      ]);

      expect(page).toContain("&lt;script&gt;&amp;&quot;");
      expect(page).not.toContain("<script>");
    });
  });
});
