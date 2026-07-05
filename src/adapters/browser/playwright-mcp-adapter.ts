export interface AccessibilityNode {
  role: string;
  name: string;
  description?: string;
  children?: AccessibilityNode[];
}

export class PlaywrightMcpAdapter {
  private enabled: boolean;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getAccessibilitySnapshot(url: string): Promise<AccessibilityNode> {
    if (!this.enabled) {
      throw new Error("Playwright MCP Adapter is disabled. Enable it in configuration.");
    }
    
    // Stub Accessibility Tree for LLMs
    return {
      role: "WebArea",
      name: "Reddit Search Results",
      children: [
        {
          role: "heading",
          name: "Struggling with browser agents blocking on Reddit"
        },
        {
          role: "link",
          name: "View discussion thread on Reddit"
        }
      ]
    };
  }
}
