#!/usr/bin/env node

import { Command } from "commander";
import { ggDelmerged } from "../lib/gg";
import { isRebasing } from "../utils";

const program = new Command();

program.parse(process.argv);

// TODO: don't if rebasing?
const rebasing = await isRebasing();

// TODO: fix delmerged
await ggDelmerged();
