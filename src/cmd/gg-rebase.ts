#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { log } from "../utils";
import { getStatusText } from "../status";
import { getRepo } from "../repo";

const program = new Command();

program.argument("<branch>", "branch to rebase to");

program.parse(process.argv);

const [branch] = program.args;
const { dry } = program.opts();

if (dry) {
  console.log("would use rebase to branch", branch);
  process.exit(0);
}

const repo = await getRepo();
const statusText = await getStatusText(repo);

// check if unstaged/uncommited changes
// if (statusText.length) {
//   console.log(log.dim("Can't rebase, unstaged changes:"));
//   console.log(statusText.map((text) => `    ${text}`).join("\n"));
//   process.exit(0);
// } else {
//   console.log("no unstaged changes");
// }

const $ = execa({ all: true, stdout: ["pipe", "inherit"] });
await $`git rebase -i ${branch}`.catch((err) => {
  console.error(err.stderr);
});
console.log("done.");
