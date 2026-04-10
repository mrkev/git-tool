import chalk from "chalk";
import { existsSync } from "fs";
import path from "path";
import { execAsync } from "./exec";

// Checks for rebase state directories that git creates during a rebase.
// rebase-merge/ exists during interactive rebase, rebase-apply/ during non-interactive.
// This is faster than the previous approach of running `git rebase --show-current-patch`,
// which spawned a subprocess and read the full patch content just to check rebase state.
export async function isRebasing() {
  const [stdout] = await execAsync("git rev-parse --git-dir");
  const gitDir = stdout.trim();
  return existsSync(path.join(gitDir, "rebase-merge")) || existsSync(path.join(gitDir, "rebase-apply"));
}

// gh api /repos/mrkev/git-tool

// gg share with `gh api /repos/mrkev/git-tool` to get repo URL?

export const log = {
  dim: (...args: unknown[]) => console.log(chalk.dim(...args)),
  green: (...args: unknown[]) => console.log(chalk.green(...args)),
  keep: (...args: unknown[]) => console.log(...args),
  verbose: (...args: unknown[]) => console.log(`[${chalk.green("verbose")}]`, ...args),
};
