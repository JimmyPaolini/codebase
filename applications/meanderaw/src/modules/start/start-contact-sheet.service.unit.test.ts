import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { StartContactSheetService } from "./start-contact-sheet.service";

import type { PermutedMosaic } from "./start.types";

describe(StartContactSheetService, () => {
  let service: StartContactSheetService;

  const dotsMosaic: PermutedMosaic = {
    columns: 1,
    fileName: "mosaic-6-rows-1-columns-ddddd.svg",
    identifier: "ddddd",
    rows: 6,
    svg: '<svg><path d="M2.5 12.5H2.5"/></svg>',
  };

  const mosaics: PermutedMosaic[] = [
    dotsMosaic,
    {
      columns: 2,
      fileName: "mosaic-6-rows-2-columns-dd.svg",
      identifier: "dd",
      rows: 6,
      svg: '<svg><path d="M2.5 22.5H2.5"/></svg>',
    },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [StartContactSheetService],
    }).compile();

    service = await module.resolve(StartContactSheetService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("embeds every mosaic and captions it with its identifier", () => {
      const sheet = service.render(6, mosaics);

      expect(sheet).toContain('<path d="M2.5 12.5H2.5"/>');
      expect(sheet).toContain("ddddd");
      expect(sheet).toContain("2 distinct tiles");
    });

    it("counts a single column in the singular and more in the plural", () => {
      const sheet = service.render(6, mosaics);

      expect(sheet).toContain("1 column<");
      expect(sheet).toContain("2 columns<");
    });

    it("escapes anything in an identifier that would otherwise close a tag", () => {
      const sheet = service.render(6, [
        { ...dotsMosaic, identifier: '<script>&"' },
      ]);

      expect(sheet).toContain("&lt;script&gt;&amp;&quot;");
      expect(sheet).not.toContain("<script>");
    });
  });
});
