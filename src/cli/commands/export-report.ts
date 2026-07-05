import * as fs from "fs";
import * as path from "path";

export async function exportReportCommand(artifactsDir: string, destPath?: string): Promise<void> {
  const srcReportPath = path.join(path.resolve(process.cwd(), artifactsDir), "report.md");
  if (!fs.existsSync(srcReportPath)) {
    console.error(`Report markdown file not found in directory: ${artifactsDir}`);
    process.exit(1);
  }

  const destination = destPath 
    ? path.resolve(process.cwd(), destPath)
    : path.resolve(process.cwd(), "extracted_report.md");

  try {
    fs.copyFileSync(srcReportPath, destination);
    console.log(`Successfully exported report markdown to: ${destination}`);
  } catch (err: any) {
    console.error(`Failed to export report: ${err.message}`);
    process.exit(1);
  }
}
