#!/usr/bin/env node

import { Command } from "commander";
import { execa } from "execa";
import { defaultBranch } from "../lib/branch";

const program = new Command();

program.parse(process.argv);

const $ = execa({ all: true, stdout: ["pipe", "inherit"] });
await $`git reset HEAD`;
