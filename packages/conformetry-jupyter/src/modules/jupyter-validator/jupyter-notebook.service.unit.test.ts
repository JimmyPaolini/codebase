import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { JupyterNotebookService } from "./jupyter-notebook.service";

/** Serializes a notebook with the given cells. */
function notebook(cells: { cell_type: string; source: string[] }[]): string {
  return JSON.stringify({ cells });
}

const MARKDOWN_CELL = { cell_type: "markdown", source: ["# Title\n"] };
const CODE_CELL = { cell_type: "code", source: ["print(1)\n"] };

describe(JupyterNotebookService, () => {
  let service: JupyterNotebookService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [JupyterNotebookService],
    }).compile();

    service = await module.resolve(JupyterNotebookService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseNotebook", () => {
    it("reads a notebook's cells", () => {
      expect(
        service.parseNotebook(notebook([MARKDOWN_CELL, CODE_CELL])).cells,
      ).toHaveLength(2);
    });

    it("reports no cells for a malformed notebook rather than throwing", () => {
      expect(service.parseNotebook("not json at all").cells).toStrictEqual([]);
    });
  });

  describe("pairCells", () => {
    it("pairs cells of the same kind in order", () => {
      const { missingCells, pairedCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
        templateNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
      });

      expect(missingCells).toStrictEqual([]);
      expect(pairedCells.map((cell) => cell.kind)).toStrictEqual([
        "markdown",
        "code",
      ]);
    });

    it("reports a template cell the instance dropped", () => {
      const { missingCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(notebook([MARKDOWN_CELL])),
        templateNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL]),
        ),
      });

      expect(missingCells).toHaveLength(1);
      expect(missingCells[0]?.kind).toBe("code");
    });

    it("allows an instance to add cells the template does not declare", () => {
      const { missingCells } = service.pairCells({
        instanceNotebook: service.parseNotebook(
          notebook([MARKDOWN_CELL, CODE_CELL, CODE_CELL]),
        ),
        templateNotebook: service.parseNotebook(notebook([MARKDOWN_CELL])),
      });

      expect(missingCells).toStrictEqual([]);
    });
  });
});
