import { Injectable } from "@nestjs/common";

import type { ReportMarkers } from "./reporting.types";

/**
 * Replaces a marked block inside a document, leaving the rest untouched.
 *
 * Every report claims its own marker pair, so several can share one document
 * without treading on each other or on what a person wrote around them.
 */
@Injectable()
export class ReportingMarkersService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Splices a section into a document, or appends it when the markers are
   * absent, and leaves the author's prose either side of it alone.
   */
  splice(document: string, section: string, markers: ReportMarkers): string {
    const start = document.indexOf(markers.start);
    const before = (
      start === -1 ? document : document.slice(0, start)
    ).trimEnd();
    const end = document.indexOf(markers.end);
    const after =
      end === -1 ? "" : document.slice(end + markers.end.length).trimStart();

    return [before, section, after]
      .filter((part) => part.length > 0)
      .join("\n\n");
  }

  /** Wraps a rendered body in its markers. */
  wrap(body: string, markers: ReportMarkers): string {
    return [markers.start, body, markers.end].join("\n");
  }
}
