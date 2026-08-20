import { Injectable } from "@nestjs/common";

import { DuplicateTargetError } from "./duplicate-target.errors";
import { EmptyTargetError } from "./empty-target.errors";
import {
  CUSTOM_METRIC_PREFIX,
  FILES_METRIC_PATH,
  METRIC_PATH_SEPARATOR,
  SIZE_METRIC_PATH,
} from "./limits.constants";
import { UnboundMetricError } from "./limits.errors";

import type {
  BindMetricArguments,
  EvaluatedLimit,
  EvaluateLimitsArguments,
  MeasuredTarget,
  MetricBinding,
  ResolveMetricArguments,
  TargetMetricIndex,
} from "./limits.types";
import type { CodeStatisticsResult } from "@codometer/configuration";

/**
 * Holds measured metrics to the limits declared against them.
 *
 * Every metric is addressable, whichever analysis produced it, by a dotted
 * path of target name and metric path. Nothing here decides what a breach
 * costs: it reports which limits were exceeded and how badly, and what that is
 * worth is the caller's to say.
 */
@Injectable()
export class LimitsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Records one metric, or marks its path as answered by more than one.
   *
   * Two counters sharing a path is a configuration mistake rather than a
   * measurement one — two statistics with the same label — and it is caught
   * here so that a limit addressing that path is refused instead of being
   * given whichever counter was indexed first.
   */
  private addMetric(
    index: TargetMetricIndex,
    metricPath: string,
    value: number,
  ): void {
    if (index.metrics.has(metricPath)) {
      index.ambiguous.add(metricPath);
      return;
    }

    index.metrics.set(metricPath, value);
  }

  /** Binds one metric path within one target, if that target measured it. */
  private bind(args: BindMetricArguments): MetricBinding | undefined {
    if (args.index.ambiguous.has(args.metricPath)) {
      throw new UnboundMetricError(
        args.path,
        `the "${args.target}" target measured more than one metric called "${args.metricPath}". Two configured statistics sharing a label is how that happens — rename one of them.`,
      );
    }

    const measured = args.index.metrics.get(args.metricPath);

    return measured === undefined
      ? undefined
      : {
          files: args.index.files,
          measured,
          metric: args.metricPath,
          target: args.target,
        };
  }

  /** Indexes every measured target, by name. */
  private buildIndexes(
    targets: readonly MeasuredTarget[],
  ): Map<string, TargetMetricIndex> {
    const indexes = new Map<string, TargetMetricIndex>();

    for (const target of targets) {
      if (indexes.has(target.name)) {
        throw new DuplicateTargetError(target.name);
      }

      indexes.set(target.name, this.buildTargetIndex(target));
    }

    return indexes;
  }

  /**
   * Indexes every metric one target measured, by its path within that target.
   *
   * An analysis the target never ran contributes nothing, so a limit written
   * against it is refused rather than being compared against a zero the target
   * never reported.
   */
  private buildTargetIndex(target: MeasuredTarget): TargetMetricIndex {
    const index: TargetMetricIndex = {
      ambiguous: new Set(),
      files: target.files,
      metrics: new Map(),
    };

    this.addMetric(index, FILES_METRIC_PATH, target.files);

    if (target.size !== undefined) {
      this.addMetric(index, SIZE_METRIC_PATH, target.size.bytes);
    }

    if (target.language !== undefined) {
      this.indexLanguage(index, target.language);
    }

    return index;
  }

  /** Names one binding the way an error message reads it out. */
  private describeBinding(binding: MetricBinding): string {
    return `the "${binding.target}" target's "${binding.metric}" metric`;
  }

  /** Names every measured target, for an error that has to list them. */
  private describeTargets(
    indexes: ReadonlyMap<string, TargetMetricIndex>,
  ): string {
    return [...indexes.keys()].map((target) => `"${target}"`).join(", ");
  }

  /**
   * Every metric a written path could mean.
   *
   * Each target is asked whether the path starts with its name, rather than
   * the path being split at its first dot: a target's name may hold a dot of
   * its own, and so may the metric path that follows it. Whatever the shapes
   * involved, every reading is collected and none of them is preferred.
   */
  private findCandidates(args: ResolveMetricArguments): MetricBinding[] {
    const candidates: MetricBinding[] = [];

    for (const [target, index] of args.indexes) {
      const prefix = `${target}${METRIC_PATH_SEPARATOR}`;

      if (!args.path.startsWith(prefix)) {
        continue;
      }

      const candidate = this.bind({
        index,
        metricPath: args.path.slice(prefix.length),
        path: args.path,
        target,
      });

      if (candidate !== undefined) {
        candidates.push(candidate);
      }
    }

    const unqualified = this.findDefaultCandidate(args);

    if (unqualified !== undefined) {
      candidates.push(unqualified);
    }

    return candidates;
  }

  /**
   * What the path would mean read as the default target's, if one is set.
   *
   * A default target that was never measured is refused rather than ignored:
   * ignoring it would turn every unqualified path in the configuration into an
   * unresolvable one, and report the paths instead of the reason.
   */
  private findDefaultCandidate(
    args: ResolveMetricArguments,
  ): MetricBinding | undefined {
    if (args.defaultTarget === undefined) {
      return undefined;
    }

    const index = args.indexes.get(args.defaultTarget);

    if (index === undefined) {
      throw new UnboundMetricError(
        args.path,
        `the configured default target "${args.defaultTarget}" was never measured. Measured targets: ${this.describeTargets(args.indexes)}.`,
      );
    }

    return this.bind({
      index,
      metricPath: args.path,
      path: args.path,
      target: args.defaultTarget,
    });
  }

  /** Indexes a group of counters, descending into the nested ones. */
  private indexCounters(
    index: TargetMetricIndex,
    counters: Record<string, unknown>,
    prefix: string,
  ): void {
    for (const [name, value] of Object.entries(counters)) {
      const metricPath =
        prefix === "" ? name : `${prefix}${METRIC_PATH_SEPARATOR}${name}`;

      if (typeof value === "number") {
        this.addMetric(index, metricPath, value);
      } else if (this.isCounterGroup(value)) {
        this.indexCounters(index, value, metricPath);
      }
    }
  }

  /**
   * Indexes everything language analysis counted.
   *
   * Configured counters are indexed under a prefix rather than beside the
   * built-in ones, so a counter labelled `files` cannot take the path the file
   * count already answers to.
   */
  private indexLanguage(
    index: TargetMetricIndex,
    language: CodeStatisticsResult,
  ): void {
    const { custom, ...groups } = language;

    this.indexCounters(index, groups, "");

    for (const statistic of custom) {
      this.addMetric(
        index,
        `${CUSTOM_METRIC_PREFIX}${METRIC_PATH_SEPARATOR}${statistic.label}`,
        statistic.count,
      );
    }
  }

  /** Whether a statistics entry holds counters of its own. */
  private isCounterGroup(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Points one written path at exactly one measured metric.
   *
   * Ambiguity is refused rather than settled by a rule about which reading
   * wins. Any such rule would be invisible in the configuration file, and a
   * limit holding a metric nobody meant to limit reads exactly like one that
   * works.
   */
  private resolve(args: ResolveMetricArguments): MetricBinding {
    const candidates = this.findCandidates(args);
    const [binding] = candidates;

    if (binding === undefined) {
      throw new UnboundMetricError(
        args.path,
        `nothing measured answers to it. Measured targets: ${this.describeTargets(args.indexes)}. Write the target's name in front of the metric path, or configure a default target.`,
      );
    }

    if (candidates.length > 1) {
      const readings = candidates
        .map((candidate) => this.describeBinding(candidate))
        .join(", or ");

      throw new UnboundMetricError(
        args.path,
        `it could be ${readings}. Write the target's name in front of the one it means.`,
      );
    }

    // Checked here rather than per target, because an empty match is only a
    // failure where a limit asserted the files exist.
    if (binding.files === 0) {
      throw new EmptyTargetError(binding.target, binding.metric);
    }

    return binding;
  }

  // 🌎 Public Methods

  /**
   * Holds every declared limit against the metric it addresses.
   *
   * Returns what each limit found rather than a verdict. Severity is carried
   * through untouched: whether a breach stops the run is a decision about the
   * run, not about the measurement.
   */
  evaluate(args: EvaluateLimitsArguments): EvaluatedLimit[] {
    const indexes = this.buildIndexes(args.targets);

    return args.configuration.limits.map((limit) => {
      const binding = this.resolve({
        defaultTarget: args.configuration.defaultTarget,
        indexes,
        path: limit.metric,
      });

      return {
        breached: binding.measured > limit.value,
        label: limit.label,
        limit: limit.value,
        measured: binding.measured,
        metric: binding.metric,
        severity: limit.severity,
        target: binding.target,
      };
    });
  }
}
