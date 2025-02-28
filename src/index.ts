#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { PackageJson } from "./types/PackageJson";
import { createCommitCommand } from "./commands/commit/command";
import { createChangelogCommand } from "./commands/changelog/command";
import { createBranchCommand } from "./commands/branch/command";
import { createVersionCommand } from "./commands/version/command";

const packageJson: PackageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8")
);

const program = new Command();

program
  .name(packageJson.name ?? "Git Release Manager")
  .description(
    packageJson.description ??
      "Tools to manage your git releases and versioning"
  )
  .version(
    packageJson.version ?? "0.0.0",
    "-v, --version",
    "Show the current version number"
  )
  .helpOption("-h, --help", "Display help information");

program
  .option("--config <path>", "Specify a custom config file path")
  .option("--environment <env>", "Set a specific environment to use");


  createCommitCommand(program)
  createChangelogCommand(program)
  createBranchCommand(program)
  createVersionCommand(program)


program.action(() => {
  console.log("Please specify a command or use --help for usage information");
  process.exit(1);
});

program.parse(process.argv);
