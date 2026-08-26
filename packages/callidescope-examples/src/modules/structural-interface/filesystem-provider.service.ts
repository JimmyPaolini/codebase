import { Injectable } from "@nestjs/common";

/**
 * Satisfies `StructuralProvider` without saying so.
 *
 * There is no `implements` keyword and no method — only a readonly property
 * holding an arrow, which is the shape this repository actually writes.
 */
@Injectable()
export class FilesystemProviderService {
  // 🔑 Public Fields

  /** Counts the words one document contributes. */
  public readonly ingest = (document: string): number =>
    document.split(" ").length;
}
