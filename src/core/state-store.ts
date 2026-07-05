import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

export class StateStore {
  private baseDir: string;

  constructor() {
    const operatorHome = process.env.GAIA_OPERATOR_HOME || ".gaia-operator";
    this.baseDir = path.resolve(process.cwd(), operatorHome);
    this.ensureDirsExist();
  }

  private ensureDirsExist(): void {
    const subDirs = ["state", "sessions", "traces", "artifacts"];
    for (const dir of subDirs) {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getTracesDir(): string {
    return path.join(this.baseDir, "traces");
  }

  getArtifactsDir(taskId?: string): string {
    if (taskId) {
      const taskDir = path.join(this.baseDir, "artifacts", taskId);
      if (!fs.existsSync(taskDir)) {
        fs.mkdirSync(taskDir, { recursive: true });
      }
      return taskDir;
    }
    return path.join(this.baseDir, "artifacts");
  }

  getSessionsDir(): string {
    return path.join(this.baseDir, "sessions");
  }

  saveSession(platform: string, key: string, data: any): void {
    const sessionFile = path.join(this.getSessionsDir(), `${platform}_session.json`);
    let sessionData: Record<string, any> = {};
    if (fs.existsSync(sessionFile)) {
      try {
        sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
      } catch {
        // ignore malformed session
      }
    }
    sessionData[key] = data;
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2), "utf-8");
  }

  getSession(platform: string, key: string): any {
    const sessionFile = path.join(this.getSessionsDir(), `${platform}_session.json`);
    if (!fs.existsSync(sessionFile)) return null;
    try {
      const sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
      return sessionData[key] || null;
    } catch {
      return null;
    }
  }

  clearSession(platform: string): void {
    const sessionFile = path.join(this.getSessionsDir(), `${platform}_session.json`);
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
  }
}
