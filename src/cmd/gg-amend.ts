#!/usr/bin/env node

import { Command } from "commander";
import { ggAmend } from "../lib/gg";

const program = new Command();

program.parse(process.argv);

await ggAmend();
