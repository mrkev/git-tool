#!/usr/bin/env node

import { Command } from "commander";
import { ggDelmerged } from "../lib/gg";
import { isRebasing } from "../utils";

const program = new Command();

program.option("-p, --profile", "print timing info");

program.parse(process.argv);

const { profile } = program.opts();

if (await isRebasing()) {
  console.error("Cannot delete merged branches while a rebase is in progress.");
  process.exit(1);
}

await ggDelmerged(profile ?? false);
