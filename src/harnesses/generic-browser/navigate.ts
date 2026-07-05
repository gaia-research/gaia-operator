import type { Page } from "playwright";

export async function navigateToUrl(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
}
