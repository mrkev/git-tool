import chalk from "chalk";

export function exhaustive(x: never, msg?: string): never {
  throw new Error(msg ?? `Exhaustion Error: unexpected value ${x}`);
}

// gh api /repos/mrkev/git-tool

// gg share with `gh api /repos/mrkev/git-tool` to get repo URL?

export const log = {
  dim: (...args: unknown[]) => console.log(chalk.dim(...args)),
  green: (...args: unknown[]) => console.log(chalk.green(...args)),
  keep: (...args: unknown[]) => console.log(...args),
  verbose: (...args: unknown[]) => console.log(`[${chalk.green("verbose")}]`, ...args),
};
