#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { execa } from "execa";
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

// Check for staged changes before doing anything
const hasStagedChanges = await execa("git", ["diff", "--cached", "--quiet"]).then(
  () => false,
  () => true,
);
if (!hasStagedChanges) {
  log.error("Nothing staged to commit. Stage your changes first (git add).");
  process.exit(1);
}

if (fromMain) {
  const main = await defaultBranch();
  log.keep(`checking out main branch: ${chalk.green(main)}...`);
  await $`git checkout ${main}`;
}

const currBranch = await currentBranch();
if (currBranch === branchname) {
  log.error(`Already on branch '${branchname}'. Choose a different branch name.`);
  process.exit(1);
}

log.keep(`\nnew branch ${chalk.green(branchname)} -> ${chalk.green(currBranch)}`);
await $`git checkout -b ${branchname}`;
await $`git commit -m ${message}`;
log.keep(`created diff ${chalk.green(branchname)} ${chalk.yellow(`"${message}"`)}`);

const pushResult = await $`git push --set-upstream origin ${branchname}`;

// remote messages get printed to stderr for some reason
const lines = (pushResult.stderr ?? "").split("\n");
if (verbose) {
  log.verbose("logging push lines...");
  log.keep(lines.join("\n"));
  log.verbose("end of push lines.");
}

// Try to extract the PR URL from git's remote message
let foundPrUrl = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf("Create a pull request for") === -1) {
    continue;
  }
  const match = /(https?.*)\/pull\/new/gm.exec(lines[i + 1]);
  if (match) {
    log.keep(`\nCreate a pull request to ${chalk.green(currBranch)} <- ${chalk.green(branchname)}:`);
    log.keep("    " + chalk.underline(match[1] + `/compare/${currBranch}...${branchname}?expand=1\n`));
    foundPrUrl = true;
  }
  break;
}

// Fallback: construct PR URL from remote origin
if (!foundPrUrl) {
  try {
    const remoteResult = await execa("git", ["remote", "get-url", "origin"]);
    const remoteUrl = remoteResult.stdout.trim();
    // Extract owner/repo from SSH or HTTPS remote URLs
    const repoMatch = remoteUrl.match(/(?:github\.com)[:/](.+?)(?:\.git)?$/);
    if (repoMatch) {
      const compareUrl = `https://github.com/${repoMatch[1]}/compare/${currBranch}...${branchname}?expand=1`;
      log.keep(`\nCreate a pull request to ${chalk.green(currBranch)} <- ${chalk.green(branchname)}:`);
      log.keep("    " + chalk.underline(compareUrl + "\n"));
    }
  } catch {
    // Non-GitHub remote or no remote configured — skip PR URL
  }
}
