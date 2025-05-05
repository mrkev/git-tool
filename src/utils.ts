import chalk from "chalk";
import { execAsync } from "./exec";

export async function isRebasing() {
  try {
    await execAsync(`git rebase --show-current-patch`);
  } catch (e) {
    return false;
  }
  return true;
}

// gh api /repos/mrkev/git-tool

// gg share with `gh api /repos/mrkev/git-tool` to get repo URL?

export const log = {
  dim: (...args: unknown[]) => console.log(chalk.dim(...args)),
  green: (...args: unknown[]) => console.log(chalk.green(...args)),
  keep: (...args: unknown[]) => console.log(...args),
  verbose: (...args: unknown[]) => console.log(`[${chalk.green("verbose")}]`, ...args),
};
