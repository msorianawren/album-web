import { readFile } from "node:fs/promises";

const files = [
  "src/lib/albums.ts",
  "src/lib/site-settings.ts",
  "src/lib/landing.ts",
];
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  if (/\.select\(\s*["'`]\*["'`]\s*\)/.test(source)) {
    failures.push(`${file} contains select("*")`);
  }
}

if (failures.length) throw new Error(failures.join("\n"));
console.log("Public data query-shape gate passed.");
