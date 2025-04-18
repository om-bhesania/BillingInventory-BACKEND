export function sanitizeString(str: string): string {
  return str.replace(/\0/g, ""); // remove null bytes
}
