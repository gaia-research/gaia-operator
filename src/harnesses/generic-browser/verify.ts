export function verifyPageLoad(content: string): boolean {
  return content.length > 0 && !content.toLowerCase().includes("error");
}
