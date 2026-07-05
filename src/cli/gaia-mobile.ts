#!/usr/bin/env node

import { Command } from "commander";
import { MobileHandoffHarness } from "../harnesses/mobile-handoff/index.js";
import { ResultCapture } from "../harnesses/mobile-handoff/result-capture.js";
import { TermuxApiAdapter } from "../adapters/mobile/termux-api-adapter.js";
import { MobileReportGenerator } from "../harnesses/mobile-handoff/report.js";

const program = new Command();

program
  .name("gaia-mobile")
  .description("Gaia Operator: Mobile Handoff CLI for Termux/Android")
  .version("0.1.0");

// Command: validate
program
  .command("validate")
  .description("Validate task configuration and guardrails")
  .argument("<taskFile>", "Path to task YAML file")
  .action((taskFile) => {
    console.log(`Validating task: ${taskFile}`);
    const res = MobileHandoffHarness.validate(taskFile);
    if (res.success) {
      console.log(`✅ Success: ${res.message}`);
      process.exit(0);
    } else {
      console.error(`❌ Failure: ${res.message}`);
      if (res.violations) {
        console.error("Violations:");
        res.violations.forEach(v => console.error(`  - ${v}`));
      }
      process.exit(1);
    }
  });

// Command: prepare
program
  .command("prepare")
  .description("Prepare task and write handoff artifacts")
  .argument("<taskFile>", "Path to task YAML file")
  .action((taskFile) => {
    console.log(`Preparing handoff for task: ${taskFile}`);
    const res = MobileHandoffHarness.prepare(taskFile);
    if (res.success) {
      console.log(`✅ Success: ${res.message}`);
      console.log(`Artifacts written to:`);
      console.log(`  - .gaia-operator/mobile/handoffs/${res.taskId}/`);
      console.log(`  - artifacts/mobile-handoff/${res.taskId}/`);
      process.exit(0);
    } else {
      console.error(`❌ Failure: ${res.message}`);
      if (res.violations) {
        console.error("Violations:");
        res.violations.forEach(v => console.error(`  - ${v}`));
      }
      process.exit(1);
    }
  });

// Command: handoff
program
  .command("handoff")
  .description("Execute handoff (copy to clipboard, open URL, notify)")
  .argument("<taskFile>", "Path to task YAML file")
  .action((taskFile) => {
    console.log(`Executing handoff for task: ${taskFile}`);
    const res = MobileHandoffHarness.handoff(taskFile);
    if (res.success) {
      console.log(`✅ Success: ${res.message}`);
      process.exit(0);
    } else {
      console.error(`❌ Failure: ${res.message}`);
      process.exit(1);
    }
  });

// Command: result
program
  .command("result")
  .description("Record manual review outcome status for task")
  .argument("<taskId>", "Task identifier")
  .option("-s, --status <status>", "Status to record (posted, rejected, saved, etc.)")
  .option("-n, --notes <notes>", "Reviewer notes or comments")
  .action((taskId, options) => {
    if (!options.status) {
      console.error("❌ Error: --status option is required.");
      process.exit(1);
    }
    const res = ResultCapture.record({
      taskId,
      status: options.status,
      notes: options.notes
    });
    if (res.success) {
      console.log(`✅ ${res.message}`);
      // Generate summary
      const summary = MobileReportGenerator.generateMarkdownSummary(taskId);
      console.log("\n" + summary);
      process.exit(0);
    } else {
      console.error(`❌ Error: ${res.message}`);
      process.exit(1);
    }
  });

// Shortcut aliases as direct commands
program
  .command("posted")
  .description("Shortcut to mark a task as posted")
  .argument("<taskId>", "Task identifier")
  .option("-n, --notes <notes>", "Reviewer notes or comments")
  .action((taskId, options) => {
    const res = ResultCapture.record({
      taskId,
      status: "posted",
      notes: options.notes
    });
    if (res.success) {
      console.log(`✅ ${res.message}`);
      const summary = MobileReportGenerator.generateMarkdownSummary(taskId);
      console.log("\n" + summary);
      process.exit(0);
    } else {
      console.error(`❌ Error: ${res.message}`);
      process.exit(1);
    }
  });

program
  .command("rejected")
  .description("Shortcut to mark a task as rejected")
  .argument("<taskId>", "Task identifier")
  .option("-n, --notes <notes>", "Reviewer notes or comments")
  .action((taskId, options) => {
    const res = ResultCapture.record({
      taskId,
      status: "rejected",
      notes: options.notes
    });
    if (res.success) {
      console.log(`✅ ${res.message}`);
      const summary = MobileReportGenerator.generateMarkdownSummary(taskId);
      console.log("\n" + summary);
      process.exit(0);
    } else {
      console.error(`❌ Error: ${res.message}`);
      process.exit(1);
    }
  });

program
  .command("saved")
  .description("Shortcut to mark a task as saved")
  .argument("<taskId>", "Task identifier")
  .option("-n, --notes <notes>", "Reviewer notes or comments")
  .action((taskId, options) => {
    const res = ResultCapture.record({
      taskId,
      status: "saved_for_later",
      notes: options.notes
    });
    if (res.success) {
      console.log(`✅ ${res.message}`);
      const summary = MobileReportGenerator.generateMarkdownSummary(taskId);
      console.log("\n" + summary);
      process.exit(0);
    } else {
      console.error(`❌ Error: ${res.message}`);
      process.exit(1);
    }
  });

// Command: doctor
program
  .command("doctor")
  .description("Diagnose Termux, Termux:API command dependencies, and Android environment status")
  .action(() => {
    console.log("=== Gaia Mobile Doctor Diagnostic ===");
    console.log(`OS Platform: ${process.platform}`);
    console.log(`Running in Termux environment: ${TermuxApiAdapter.isTermux() ? "Yes ✅" : "No (Local/Mock Mode) ⚠️"}`);
    
    console.log("\n--- Executables Check ---");
    const cmds = [
      "termux-clipboard-set",
      "termux-clipboard-get",
      "termux-notification",
      "termux-open-url",
      "termux-share",
      "termux-info",
      "am"
    ];
    
    for (const cmd of cmds) {
      const avail = TermuxApiAdapter.isCommandAvailable(cmd);
      console.log(`- ${cmd.padEnd(22)}: ${avail ? "FOUND ✅" : "NOT FOUND ❌"}`);
    }

    console.log("\n--- Device Information ---");
    try {
      const info = TermuxApiAdapter.getDeviceInfo();
      console.log(JSON.stringify(info, null, 2));
    } catch (err: any) {
      console.log(`Error retrieving device info: ${err.message}`);
    }
  });

// Parse command line arguments
program.parse(process.argv);
