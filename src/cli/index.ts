#!/usr/bin/env node

import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { validateTaskCommand } from "./commands/validate-task.js";
import { runTaskCommand } from "./commands/run-task.js";
import { replayTraceCommand } from "./commands/replay-trace.js";
import { exportReportCommand } from "./commands/export-report.js";
import { validateQueueEntryCommand, runQueueEntryCommand, exportDerivedTaskCommand } from "./commands/queue-commands.js";
import { PlatformPolicyRegistry } from "../policies/platform-policy-registry.js";

const program = new Command();

program
  .name("gaia-operator")
  .description("Gaia Operator: Browser Interaction & Platform Community Interaction Runtime")
  .version("0.1.0");

program
  .command("doctor")
  .description("Triage environment dependencies, CUA access, and CLI setups")
  .action(async () => {
    await doctorCommand();
  });

program
  .command("validate-task")
  .description("Validate task YAML/JSON schema compliance and platform policy rules")
  .argument("<taskFile>", "Path to task configuration file (YAML/JSON)")
  .action(async (taskFile) => {
    await validateTaskCommand(taskFile);
  });

program
  .command("run-task")
  .description("Load and run operator task safely under the policies model")
  .argument("<taskFile>", "Path to task configuration file (YAML/JSON)")
  .action(async (taskFile) => {
    await runTaskCommand(taskFile);
  });

program
  .command("replay-trace")
  .description("Replay execution trace step by step from JSON trace dump")
  .argument("<traceFile>", "Path to trace JSON file")
  .action(async (traceFile) => {
    await replayTraceCommand(traceFile);
  });

program
  .command("export-report")
  .description("Extract and export report markdown file from artifacts to a new location")
  .argument("<artifactsDir>", "Path to task artifacts directory containing report.md")
  .argument("[destination]", "Path to output destination report file")
  .action(async (artifactsDir, destination) => {
    await exportReportCommand(artifactsDir, destination);
  });

program
  .command("validate-queue-entry")
  .description("Validate a marketing-tasks queue markdown entry and inspect derived runner task")
  .argument("<queueFile>", "Path to queue markdown file")
  .action(async (queueFile) => {
    await validateQueueEntryCommand(queueFile);
  });

program
  .command("run-queue-entry")
  .description("Run a marketing-tasks queue entry directly after deriving a runner task")
  .argument("<queueFile>", "Path to queue markdown file")
  .action(async (queueFile) => {
    await runQueueEntryCommand(queueFile);
  });

program
  .command("export-derived-task")
  .description("Export the derived OperatorTask JSON for a queue entry")
  .argument("<queueFile>", "Path to queue markdown file")
  .argument("[destination]", "Path to output derived task JSON")
  .action(async (queueFile, destination) => {
    await exportDerivedTaskCommand(queueFile, destination);
  });

program
  .command("list-harnesses")
  .description("List all active interaction harnesses in the runtime")
  .action(() => {
    console.log("Registered Harnesses:");
    console.log("- reddit-research (Reddit search and pain points analysis)");
    console.log("- generic-browser (Static page observer)");
    console.log("- community-interaction (Gated write stub)");
  });

program
  .command("list-platforms")
  .description("List all registered platform names in the policy registry")
  .action(() => {
    console.log("Registered Platform Configurations:");
    const platforms = PlatformPolicyRegistry.getRegisteredPlatforms();
    for (const p of platforms) {
      console.log(`- ${p}`);
    }
  });

// Parse command line arguments
program.parse(process.argv);
