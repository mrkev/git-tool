#!/usr/bin/env node

import { Command } from "commander";
import { ggSend } from "./lib/gg-send";

const program = new Command();

program
  .option("-d, --dry", "dry run (for testing)")
  .argument("<branch_name>", "name of the branch to create")
  .argument("<commit_message>", "message to commit with");

program.parse(process.argv);

const [branch, message] = program.args;
const { dry } = program.opts();

if (dry) {
  console.log("would commit to branch", branch);
  console.log("would use commit message", message);
} else {
  await ggSend(branch, message);
}
