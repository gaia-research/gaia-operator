import type { Page } from "playwright";

export async function observePage(page: Page): Promise<{ title: string; textContent: string }> {
  const title = await page.title();
  const textContent = await page.evaluate(() => document.body.innerText || "");
  return { title, textContent };
}
