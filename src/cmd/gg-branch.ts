#!/usr/bin/env node

import { Command } from "commander";
import { ggBranch } from "../lib/gg-branch";

const program = new Command();

program.argument("[branch]", "branch name").option("-d, --dry", "dry run (for testing)");

program.parse(process.argv);

const [branch] = program.args;
const { dry } = program.opts();

if (dry) {
  console.log("gg-branch called with", branch);
  process.exit(0);
}

console.log("TODO");

await ggBranch(branch || null);
