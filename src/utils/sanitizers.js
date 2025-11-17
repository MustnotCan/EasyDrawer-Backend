export function sanitizeString(str) {
  if (typeof str !== "string") return str;
  return JSON.stringify(str)
    .slice(1, -1) // remove quotes added by stringify
    .replace(/\0/g, ""); // remove NULL bytes
}
