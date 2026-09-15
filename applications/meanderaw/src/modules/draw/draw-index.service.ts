// `nav` is the HTML sectioning element the jump list is wrapped in, not an
// abbreviation of "navigation" this file chose to write.
// cspell:ignore nav

import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { SUPPORTED_TYPES } from "../meander-classification/meander-classification.constants";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";

import {
  BAND_REPEAT_COUNT,
  MalformedMeanderSvgError,
  PAGE_STYLES,
  TILE_ID_PREFIX,
  UNCLASSIFIED_FAMILY_LABEL,
} from "./draw-index.constants";

import type { MeanderType } from "../meander-classification/meander-classification.types";
import type { Meander } from "../meander-database/entities/Meander.entity";
import type { MeanderIndexGroup } from "./draw-index.types";

/**
 * Renders the one page the whole committed corpus is looked through: every
 * meander the database holds, grouped by family and captioned.
 *
 * It embeds each meander's own SVG directly rather than linking to a file —
 * there is no file left to link to, since a meander is a database row now
 * rather than a path on disk. Embedding it is spec #813's own design rather
 * than a regression from the retired `DrawIndexService`, which linked
 * precisely because every drawing it indexed was a separate committed file
 * this one no longer has.
 *
 * Each row's SVG is one repeat of the meander, and one repeat read alone says
 * very little about the pattern it repeats into, so the page lays that tile
 * out `BAND_REPEAT_COUNT` times along a band rather than showing it once.
 * The stored tile is embedded verbatim in each position — the page states
 * where the repeats sit, and `MeanderRenderingService` stays the only thing
 * that decides what one of them draws.
 *
 * The page is written at the root of the output directory, beside the
 * database it was built from — see `DrawCommand.sweep`, the only caller.
 */
@Injectable()
export class DrawIndexService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(MeanderDatabaseService)
    private readonly meanderDatabaseService: MeanderDatabaseService,
  ) {}

  // 🔐 Private Fields

  /** Orders rows within a family the way a reader reads them: shallower repeats before deeper ones, narrower before wider, and numeric-aware within `code` itself. */
  private readonly collator = new Intl.Collator("en", { numeric: true });

  /**
   * Where each family sits on the page, read off the order `SUPPORTED_TYPES`
   * declares them in. A null family — the unclassified section — ranks one
   * past the last of them, so it sorts after every named family rather than
   * by the alphabetical accident of its own label.
   */
  private readonly familyRanks = new Map<string, number>(
    SUPPORTED_TYPES.map((type, index) => [type, index]),
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws unless `svg` looks like a complete, well-formed inline SVG document. */
  private assertWellFormedSvg(meander: Meander): void {
    const svg = meander.svg.trim();

    if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) {
      throw new MalformedMeanderSvgError(meander.code);
    }
  }

  /** One meander's own caption: its lattice address, and its subFamily where it earned one. */
  private caption(meander: Meander): string {
    const { code, columns, rows, subFamily } = meander;
    const address = `${rows}×${columns} · ${code}`;

    return this.escape(
      subFamily === null ? address : `${address} (${subFamily})`,
    );
  }

  /** Escapes the few characters that would otherwise close a tag or an attribute. */
  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** Ranks a family by its declared order, so `null` — the unclassified section — sorts after every named one. */
  private familyRank(family: MeanderType | null): number {
    return family === null
      ? SUPPORTED_TYPES.length
      : (this.familyRanks.get(family) ?? SUPPORTED_TYPES.length);
  }

  /** Rounds and trims one band coordinate the same way every drawn coordinate is. */
  private format(value: number): string {
    return this.gridGeometryService.formatCoordinate(value);
  }

  /** Collects the rows into their family groups, the groups in family order and the rows within each in reading order. */
  private groupByFamily(meanders: readonly Meander[]): MeanderIndexGroup[] {
    const groups = new Map<MeanderType | null, Meander[]>();

    for (const meander of meanders) {
      const members = groups.get(meander.family) ?? [];

      members.push(meander);
      groups.set(meander.family, members);
    }

    return [...groups.entries()]
      .map(([family, members]): MeanderIndexGroup => ({
        family,
        meanders: members.toSorted(
          (left, right) =>
            left.rows - right.rows ||
            left.columns - right.columns ||
            this.collator.compare(left.code, right.code),
        ),
      }))
      .toSorted(
        (left, right) =>
          this.familyRank(left.family) - this.familyRank(right.family),
      );
  }

  /** The heading and slug a family group is shown and linked under. */
  private label(family: MeanderType | null): string {
    return family ?? UNCLASSIFIED_FAMILY_LABEL;
  }

  /**
   * Lays one row's tile out along a band of `BAND_REPEAT_COUNT` repeats.
   *
   * The tile is defined once and placed `BAND_REPEAT_COUNT` times rather than
   * copied: the page carries every row in the corpus, so six copies of every
   * row's markup would multiply an already large document by six for a
   * drawing each copy is identical in.
   *
   * Each placement steps one pitch further along, which is the distance that
   * makes consecutive tiles meet: a tile's own drawing runs from `offset` to
   * `offset + columns * unit`, so a step of `pitch * unit` lands the next
   * tile's first lattice column exactly on the last one's right edge. The
   * half-stroke gutters either side of that edge overlap, and both tiles ink
   * the same square cap there, so the seam paints over itself.
   */
  private renderBand(meander: Meander): string {
    const geometry = this.gridGeometryService.compute(meander.rows);
    const pitch = meander.pitch * geometry.unit;
    const height = this.format(geometry.height + geometry.strokeWidth);
    const width = this.format(
      (BAND_REPEAT_COUNT - 1) * pitch +
        meander.columns * geometry.unit +
        geometry.strokeWidth,
    );
    const tile = `${TILE_ID_PREFIX}${meander.id}`;

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><g id="${tile}">${meander.svg.trim()}</g></defs>${this.renderRepeats(tile, pitch)}</svg>`;
  }

  /** Renders the jump list, so a family thousands of rows down the page is one click away. */
  private renderContents(groups: readonly MeanderIndexGroup[]): string {
    return groups
      .map(({ family, meanders }) => {
        const label = this.escape(this.label(family));

        return `<li><a href="#${label}">${label}</a> <span>${meanders.length}</span></li>`;
      })
      .join("\n");
  }

  /** Renders one meander's own figure: the band its tile repeats into, and its caption. */
  private renderFigure(meander: Meander): string {
    this.assertWellFormedSvg(meander);

    return `<figure><div class="art">${this.renderBand(meander)}</div><figcaption>${this.caption(meander)}</figcaption></figure>`;
  }

  /** The placements themselves: the one defined tile, referenced once per repeat, each a further pitch along. */
  private renderRepeats(tile: string, pitch: number): string {
    return Array.from(
      { length: BAND_REPEAT_COUNT },
      (_repeat, index) =>
        `<use href="#${tile}" x="${this.format(index * pitch)}"/>`,
    ).join("");
  }

  /** Renders one family's own section: its heading, and every meander in it at its own size. */
  private renderSection({ family, meanders }: MeanderIndexGroup): string {
    const label = this.escape(this.label(family));
    const figures = meanders
      .map((meander) => this.renderFigure(meander))
      .join("\n");

    return `<section id="${label}">
<h2>${label}</h2>
<p class="count">${meanders.length} meander${meanders.length === 1 ? "" : "s"}</p>
<div class="grid">
${figures}
</div>
</section>`;
  }

  // 🌎 Public Methods

  /** Reads every committed meander and renders the page they make, together. */
  async build(): Promise<string> {
    return this.render(await this.meanderDatabaseService.findAll());
  }

  /**
   * Builds the whole page as a complete HTML document from an already-loaded
   * set of rows.
   *
   * Pure and synchronous on purpose: it is what a test seeds a small,
   * hand-built set of rows against, without paying for a database round
   * trip to exercise the grouping, ordering, and escaping it is responsible
   * for.
   */
  render(meanders: readonly Meander[]): string {
    const groups = this.groupByFamily(meanders);
    const sections = groups
      .map((group) => this.renderSection(group))
      .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meanderaw</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<h1>Meanderaw</h1>
<p class="count">${meanders.length} meanders across ${groups.length} families.</p>
<nav><ul>
${this.renderContents(groups)}
</ul></nav>
${sections}
</body>
</html>
`;
  }
}
