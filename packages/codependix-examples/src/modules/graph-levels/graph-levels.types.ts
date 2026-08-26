// 🏷️ Types

/**
 * One of the four levels codependix builds, rendered for the shared fixture.
 *
 * Carried together so example 1 can put them side by side: the value of that
 * example is entirely in the comparison, and a reader seeing what each level
 * does and does not say about the same project.
 */
export interface GraphLevel {
  /** The rendered mermaid diagram, or the level's unconnected message. */
  readonly diagram: string;
  /** What this level answers that the others do not. */
  readonly note: string;
  /** The level's name, as the guides refer to it. */
  readonly title: string;
}
