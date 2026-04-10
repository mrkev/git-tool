import chalk from "chalk";

export class Profiler {
  constructor(
    readonly enabled = false,
    private t = performance.now(),
  ) {}
  log(tag: string, ...args: unknown[]) {
    if (!this.enabled) {
      return;
    }
    const prev = this.t;
    const delta = (performance.now() - prev).toFixed(1);
    console.log(chalk.green("[profile]"), `${tag}:`, chalk.yellow(`${delta}ms`), ...args);
  }
}
