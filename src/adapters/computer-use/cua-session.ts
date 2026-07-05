export class CuaSessionManager {
  private activeSessionId: string | null = null;

  startSession(taskId: string): string {
    this.activeSessionId = `cua_${taskId}_${Date.now()}`;
    return this.activeSessionId;
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  endSession(): void {
    this.activeSessionId = null;
  }
}
