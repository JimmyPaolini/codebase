// ♟️ Constants

import type {
  CallableAddressCandidate,
  UnresolvedEntryPointAddress,
} from "@callidescope/graph";

/**
 * Whether a `new` expression pushes a frame.
 *
 * It does. Constructors in this repository do real work — reading files,
 * building indexes — so treating construction as free would understate every
 * stack that runs through one.
 */
export const INCLUDE_CONSTRUCTOR_EDGES = true;

/** File a project's embedded section is spliced into. */
export const PROJECT_README_NAME = "README.md";

// 🚨 Errors

/**
 * Raised when a declared `entryPoints.addresses` entry named no callable, or
 * more than one.
 *
 * Fatal to the whole run rather than logged and stepped over. A rename that
 * silently drops a declared root would otherwise lower the project's measured
 * depth with nothing in the output to say so — the same failure codometer
 * already refuses when a limit binds to no metric, and the spec this feature
 * shipped from names it the single highest-value refusal in it. One error
 * covers every unresolved address a run found, so a run with several
 * problems is fixed from one message rather than one refusal at a time.
 */
export class UnresolvedEntryPointAddressError extends Error {
  constructor(unresolvedAddresses: readonly UnresolvedEntryPointAddress[]) {
    super(
      unresolvedAddresses
        .map((unresolvedAddress) =>
          UnresolvedEntryPointAddressError.describeUnresolvedAddress(
            unresolvedAddress,
          ),
        )
        .join(" "),
    );
    this.name = "UnresolvedEntryPointAddressError";
  }

  /**
   * Writes one ambiguous candidate as the address that would have picked it,
   * so the fix is a copy away rather than a location to go translate back
   * into one.
   *
   * Built from the declared address rather than the candidate's own display
   * name: every candidate matched the same file and the same qualified name —
   * that agreement is what "ambiguous" means — so only the line varies, and a
   * `:<line>` already on the declared address (from a disambiguator that
   * still matched more than one line) is replaced rather than doubled up.
   */
  private static describeCandidate(args: {
    address: string;
    candidate: CallableAddressCandidate;
  }): string {
    const baseAddress = args.address.replace(/:\d+$/, "");

    return `${baseAddress}:${String(args.candidate.location.line)}`;
  }

  /** States why one declared address failed to resolve, naming its project. */
  private static describeUnresolvedAddress(
    unresolvedAddress: UnresolvedEntryPointAddress,
  ): string {
    const label =
      unresolvedAddress.projectName ?? "the workspace configuration";
    const { address, resolution } = unresolvedAddress;

    if (resolution.kind === "not-found") {
      return `${label} declares an entry point that resolves to nothing: "${address}". Check the file path and the qualified name callidescope prints for it in a stack.`;
    }

    if (resolution.kind === "invalid") {
      return `${label} declares an invalid entry point. ${resolution.reason}`;
    }

    const candidates = resolution.candidates
      .map((candidate) =>
        UnresolvedEntryPointAddressError.describeCandidate({
          address,
          candidate,
        }),
      )
      .join(", ");

    return `${label} declares an entry point that matches more than one declaration: "${address}". Candidates: ${candidates}. Add ":<line>" to the address to pick one.`;
  }
}
