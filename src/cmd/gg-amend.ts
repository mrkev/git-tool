#!/usr/bin/env node

import { Command } from "commander";
import { spawnStep } from "../exec";
import { isRebasing } from "../utils";

const program = new Command();

program.parse(process.argv);

const rebasing = await isRebasing();
if (rebasing) {
  console.log("REBASE IN PROGRESS");
  process.exit(0);
} else {
  await spawnStep(`git commit --amend && git push --force`);
}
