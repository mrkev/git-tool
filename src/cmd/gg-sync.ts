#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import { defaultBranch } from "../lib/branch";
import { ggDelmerged } from "../lib/gg";

const program = new Command();

program
  // TODO: make default true?
  .option("-s, --shallow", "dont delmerge")
  .option("-v, --verbose", "print extra information");
program.parse(process.argv);

const { shallow, verbose } = program.opts();

// TODO: check rebase?
const main = await defaultBranch();
verbose && console.log("verbose: default branch", main);
const $ = execa({ all: true, stdout: ["pipe", "inherit"] });
await $`git checkout ${main}`;
await $`git pull`;

if (!shallow) {
  // TODO fix ggDelmerged();
  // await ggDelmerged();
}
