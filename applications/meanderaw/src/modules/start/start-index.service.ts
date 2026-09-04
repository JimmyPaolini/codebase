// `nav` is the HTML sectioning element the jump list is wrapped in, not an
// abbreviation of "navigation" this file chose to write.
// cspell:ignore nav

import { Injectable } from "@nestjs/common";

import type { OutputDocument } from "./start.types";

/**
 * Renders the one page the whole corpus is looked through: every drawing the
 * sweep wrote, grouped into the directory it landed in and captioned with
 * its filename.
 *
 * It links each drawing rather than inlining it. That is the difference
 * between one page and the per-row-count contact sheets it replaces: an
 * inlined sheet is a second copy of every document it shows, so it could
 * never cover the whole corpus and could never be committed, while a page of
 * hyperlinks carries three thousand drawings in a few hundred kilobytes and
 * leaves each one the single file on disk it already was.
 */
@Injectable()
export class StartIndexService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** Orders directories and filenames the way a reader reads them, so `10-rows` follows `9-rows` rather than `1-columns`. */
  private readonly collator = new Intl.Collator("en", { numeric: true });

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Escapes the few characters that would otherwise close a tag or an attribute. */
  private escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  /** Collects the documents into their directories, both the directories and the filenames within each in reading order. */
  private groupByDirectory(
    documents: readonly OutputDocument[],
  ): [string, string[]][] {
    const groups = new Map<string, string[]>();

    for (const document of documents) {
      const fileNames = groups.get(document.directory) ?? [];

      fileNames.push(document.fileName);
      groups.set(document.directory, fileNames);
    }

    return [...groups.entries()]
      .map(([directory, fileNames]): [string, string[]] => [
        directory,
        fileNames.toSorted((left, right) => this.collator.compare(left, right)),
      ])
      .toSorted(([left], [right]) => this.collator.compare(left, right));
  }

  /** Renders the jump list, so a directory two thousand drawings down the page is one click away. */
  private renderContents(groups: readonly [string, string[]][]): string {
    return groups
      .map(
        ([directory, fileNames]) =>
          `<li><a href="#${this.escape(this.slug(directory))}">${this.escape(
            directory,
          )}</a> <span>${fileNames.length}</span></li>`,
      )
      .join("\n");
  }

  /** Renders one directory's own section: its heading, and every drawing in it at its own size. */
  private renderSection(
    prefix: string,
    directory: string,
    fileNames: readonly string[],
  ): string {
    const figures = fileNames
      .map((fileName) => {
        const href = this.escape(`${prefix}/${directory}/${fileName}`);
        const label = this.escape(fileName);

        return `<figure><a class="art" href="${href}"><img alt="${label}" loading="lazy" src="${href}"></a><figcaption>${label}</figcaption></figure>`;
      })
      .join("\n");

    return `<section id="${this.escape(this.slug(directory))}">
<h2>${this.escape(directory)}</h2>
<p class="count">${fileNames.length} drawing${fileNames.length === 1 ? "" : "s"}</p>
<div class="grid">
${figures}
</div>
</section>`;
  }

  /** The fragment identifier a directory is linked by, since a path separator has no place in one. */
  private slug(directory: string): string {
    return directory.replaceAll("/", "-");
  }

  // 🌎 Public Methods

  /**
   * Builds the whole page as a complete HTML document. `prefix` is the
   * output directory as seen from the page's own location, so every
   * hyperlink it writes is relative to the page rather than to a working
   * directory.
   */
  render(prefix: string, documents: readonly OutputDocument[]): string {
    const groups = this.groupByDirectory(documents);
    const sections = groups
      .map(([directory, fileNames]) =>
        this.renderSection(prefix, directory, fileNames),
      )
      .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meanderaw</title>
<style>
:root { color-scheme: light dark; }
body { font: 13px/1.4 system-ui, sans-serif; margin: 24px; }
h1 { font-size: 18px; margin: 0 0 4px; }
h2 { font-family: ui-monospace, monospace; font-size: 14px; margin: 0 0 2px; }
p.count { color: color-mix(in srgb, currentColor 60%, transparent); margin: 0 0 16px; }
nav ul { columns: 4 280px; list-style: none; margin: 0 0 32px; padding: 0; }
nav li { break-inside: avoid; font-family: ui-monospace, monospace; }
nav span { color: color-mix(in srgb, currentColor 55%, transparent); }
section { margin: 0 0 40px; }
.grid { display: grid; gap: 20px 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
figure { margin: 0; }
.art { background: #fff; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); display: block; overflow-x: auto; padding: 8px; }
.art img { display: block; }
figcaption { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 6px; word-break: break-all; }
</style>
</head>
<body>
<h1>Meanderaw</h1>
<p class="count">${documents.length} drawings across ${groups.length} directories.</p>
<nav><ul>
${this.renderContents(groups)}
</ul></nav>
${sections}
</body>
</html>
`;
  }
}
