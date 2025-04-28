#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";

const program = new Command();

program.argument("<commit_message>", "message to commit with");

program.parse(process.argv);

const [message] = program.args;
const { dry } = program.opts();

if (dry) {
  console.log("would use commit message", message);
  process.exit(0);
}

const $ = execa({ all: true, stdout: ["pipe", "inherit"] });
await $`git commit -m "${message}"`;
await $`git push`;
console.log("done.");
