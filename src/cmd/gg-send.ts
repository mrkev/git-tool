#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { execAsync, spawnStep } from "../exec";
import { currentBranch } from "../lib/branch";

const program = new Command();

program
  .option("-d, --dry", "dry run (for testing)")
  .option("-b", "branch from here (as opposed to branching from main)")
  .argument("<branch_name>", "name of the branch to create")
  .argument("<commit_message>", "message to commit with");

program.parse(process.argv);

const [branchname, message] = program.args;
const { dry, b } = program.opts();

if (dry) {
  console.log("would commit to branch", branchname);
  console.log("would use commit message", message);
  process.exit(0);
}

// TODO: -b option
// TODO: check if current === branchname
const currBranch = currentBranch();

await spawnStep(`git checkout -b ${branchname}`);
await spawnStep(`git commit -m "${message}"`);
const [msg, err] = await execAsync(`git push --set-upstream origin ${branchname}`);

// remote messages get printed to stderr for some reason
const lines = err.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf("Create a pull request for") === -1) {
    console.log("out", lines[i], lines[i].indexOf("Create a pull request for"));

    continue;
  }
  const match = /(https?.*)\/pull\/new/gm.exec(lines[i + 1]);
  if (!match) {
    throw new Error("this isn't expected!");
  }
  console.log(`Create a pull request to ${chalk.green(currBranch)} <- ${chalk.green(branchname)}:`);
  console.log("    " + chalk.underline(match[1] + `/compare/${currBranch}...${branchname}?expand=1\n`));
  break;
}
