#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
import { execAsync } from "../exec";
import { currentBranch, defaultBranch } from "../lib/branch";
import { log } from "../utils";

const program = new Command();

program
  .option("-d, --dry", "dry run (for testing)")
  .option("-v, --verbose", "extra logging")
  .option("-b", "branch from here (as opposed to branching from main)")
  .argument("<branch_name>", "name of the branch to create")
  .argument("<commit_message>", "message to commit with");

program.parse(process.argv);

const [branchname, message] = program.args;
const { dry, b, verbose } = program.opts();

const fromMain = !b;
const $ = execa({ all: true, stdout: ["pipe", "inherit"] });

if (dry) {
  console.log("would commit to branch", branchname);
  console.log("would use commit message", message);
  process.exit(0);
}

if (fromMain) {
  const main = await defaultBranch();
  log.keep(`checking out ${chalk.green(main)}...`);
  await $`git checkout ${main}`;
}

const currBranch = await currentBranch();
if (currBranch === branchname) {
  // TODO
  console.log("TODO: currBranch === branchname", currBranch, branchname);
  process.exit(0);
}

log.keep(`\nnew branch ${chalk.green(branchname)} -> ${chalk.green(currBranch)}`);
await $`git checkout -b ${branchname}`;
await $`git commit -m "${message}"`;
log.keep(`created diff ${chalk.green(branchname)} ${chalk.yellow(`"${message}"`)}`);

const [msg, err] = await execAsync(`git push --set-upstream origin ${branchname}`);

// remote messages get printed to stderr for some reason
const lines = err.split("\n");
if (verbose) {
  log.verbose("logging push lines...");
  log.keep(lines.join("\n"));
  log.verbose("end of push lines.");
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf("Create a pull request for") === -1) {
    console.log("out", lines[i], lines[i].indexOf("Create a pull request for"));

    continue;
  }
  const match = /(https?.*)\/pull\/new/gm.exec(lines[i + 1]);
  if (!match) {
    throw new Error("this isn't expected!");
  }
  log.keep(`\nCreate a pull request to ${chalk.green(currBranch)} <- ${chalk.green(branchname)}:`);
  log.keep("    " + chalk.underline(match[1] + `/compare/${currBranch}...${branchname}?expand=1\n`));
  break;
}
