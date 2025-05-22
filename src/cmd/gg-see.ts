#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";

const program = new Command();

program.parse(process.argv);

const $ = execa({ all: true, stdout: ["inherit"] });
await $`git show --no-patch --compact-summary --pretty=${"format:%h (%ar)"}`;
// await $`git show --no-patch --compact-summary --pretty="format:%h -> %p (%ar)"`;
