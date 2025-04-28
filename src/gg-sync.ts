#!/usr/bin/env node

import { Command } from "commander";
import { ggSync } from "./lib/gg";

const program = new Command();

program
  // TODO: make default true?
  .option("-d, --delmerged", "delmerge");

program.parse(process.argv);

const { delmerged } = program.opts();

await ggSync();
