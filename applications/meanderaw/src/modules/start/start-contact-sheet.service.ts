import { Injectable } from "@nestjs/common";

import type { PermutedMosaic } from "./start.types";

/**
 * Renders one page per row count to look through. A sweep runs to hundreds of
 * tiles, which is unreadable as loose files but reads fine as a contact
 * sheet: every mosaic inline at its own size, captioned with the identifier
 * that names its tile, so a tile worth keeping can be named back precisely.
 */
@Injectable()
export class StartContactSheetService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Escapes the few characters that would otherwise close a tag or attribute. */
  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // 🌎 Public Methods

  /** Builds the contact sheet for one row count's mosaics, as a complete HTML document. */
  render(rows: number, mosaics: readonly PermutedMosaic[]): string {
    const cells = mosaics
      .map(
        (mosaic) =>
          `<figure><div class="art">${mosaic.svg}</div><figcaption>${this.escape(
            mosaic.identifier,
          )}<br><span>${mosaic.columns} column${
            mosaic.columns === 1 ? "" : "s"
          }</span></figcaption></figure>`,
      )
      .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mosaic permutations — ${rows} rows</title>
<style>
:root { color-scheme: light dark; }
body { font: 13px/1.4 system-ui, sans-serif; margin: 24px; }
h1 { font-size: 16px; margin: 0 0 4px; }
p.count { color: color-mix(in srgb, currentColor 60%, transparent); margin: 0 0 20px; }
.grid { display: grid; gap: 20px 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
figure { margin: 0; }
.art { background: #fff; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); overflow-x: auto; padding: 8px; }
.art svg { display: block; }
figcaption { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 6px; word-break: break-all; }
figcaption span { color: color-mix(in srgb, currentColor 55%, transparent); font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<h1>Mosaic permutations — ${rows} rows</h1>
<p class="count">${mosaics.length} distinct tiles, one per symmetry class.</p>
<div class="grid">
${cells}
</div>
</body>
</html>
`;
  }
}
