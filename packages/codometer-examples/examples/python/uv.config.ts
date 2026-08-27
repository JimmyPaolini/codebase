import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * Python reached through a virtual environment.
 *
 * One field, and it is what makes this workspace's Python measurable at all.
 * Directly reusable: any repository whose Python lives behind `uv`, `poetry`,
 * or a `.venv` names its interpreter the same way.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/python/uv.config.ts --json \
 *   | jq '.targets[0].metrics[] | select(.path | startswith("python."))'
 * ```
 *
 * It reports 3 classes, 4 functions, 1 protocol, and 8 docstrings from
 * `examples/corpus/python/inventory.py`. So does
 * [default-interpreter.config.ts](./default-interpreter.config.ts) on a machine
 * whose `python3` is adequate — naming the interpreter is what stops that being
 * a question about the machine. The same corpus measures as empty under
 * [unreachable-interpreter.config.ts](./unreachable-interpreter.config.ts).
 *
 * The interpreter reaches Jupyter too: a notebook's code cells go to the same
 * Python analyzer, so `jupyter.classes` and `jupyter.functions` depend on this
 * field exactly as `python.classes` does.
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
};

export default codometerConfiguration;
