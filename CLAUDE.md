# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@mrkev/gg` is a TypeScript CLI tool providing interactive, opinionated git workflow commands. It installs multiple binaries (`gg`, `gg-go`, `gg-branch`, etc.) that wrap common git operations with interactive prompts and branch visualization.

## Commands

```bash
pnpm build          # build all binaries to dist/
pnpm dev            # watch mode (rollup --watch)
pnpm gg             # build then run dist/bundle.js
```

No test framework is configured — there are no automated tests.

## Architecture

### Build System

Rollup compiles each `src/cmd/gg*.ts` file into a standalone ESM binary in `dist/`. Native `.node` files (from nodegit/libgit2) are extracted to `dist/libs/`. `postinstall` rebuilds nodegit from source.

### Command Structure

Each command has two parts:
- **`src/cmd/gg-*.ts`** — CLI entry point (commander.js parsing, shebang line)
- **`src/lib/gg-*.ts`** — Business logic (imported by both the standalone binary and the main `gg` dispatcher)

The main `src/cmd/gg.ts` aggregates all subcommands into a single `gg <subcommand>` interface.

### Git Operations

Commands use two mechanisms:
- **nodegit** (libgit2 bindings) — branch inspection, status, commit metadata; accessed via `src/repo.ts` (repo discovery) and `src/branches.ts` (branch queries)
- **execa / child_process** — actual git mutations (checkout, commit, push, rebase) via `src/exec.ts`

### Branch Dependency Tracking

`src/RefDeps.ts` infers parent-branch relationships by walking commit history, enabling branch visualization in the interactive branch switcher. `src/branches.ts` provides `getTrunkRef()` to identify the default branch.

### Interactive UI

`src/CustomListPrompt.ts` is a custom inquirer prompt used for branch selection. `src/status.ts` renders color-coded git status output using `src/ansi.ts` utilities.

## Code Style

Prettier config (from package.json): `printWidth: 120`, `trailingComma: "all"`.
TypeScript strict mode is enabled. Target is ES2017, modules are ESNext.
