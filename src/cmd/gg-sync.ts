#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import { isRebasing } from "../isRebasing";
import { defaultBranch } from "../lib/branch";
import { ggDelmerged } from "../lib/gg";
import { log } from "../utils";

const program = new Command();

program
  // TODO: make default true?
  .option("-s, --shallow", "dont delmerge")
  .option("-v, --verbose", "print extra information");
program.parse(process.argv);

const { shallow, verbose } = program.opts();

if (await isRebasing()) {
  log.error("Cannot sync while a rebase is in progress.");
  process.exit(1);
}

const main = await defaultBranch();
verbose && console.log("verbose: default branch", main);
const $ = execa({ all: true, stdout: ["pipe", "inherit"] });
await $`git checkout ${main}`;
await $`git pull`;

if (!shallow) {
  await ggDelmerged();
}
