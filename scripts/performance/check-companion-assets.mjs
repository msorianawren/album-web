import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const stateNames = [
  "idle", "listening", "thinking", "answering", "waiting", "success",
  "celebration", "warning", "error", "unavailable", "sleeping",
];
const assets = [
  ...stateNames.map((name) => ({ file: `public/assistant/companion-v2/mira/${name}.webp`, maxBytes: 30_000 })),
  ...["fox", "owl", "panda", "rabbit", "red_panda", "deer"].map((name) => ({ file: `public/assistant/companion-v2/portraits/${name}.webp`, maxBytes: 30_000 })),
];

const failures = assets.flatMap(({ file, maxBytes }) => {
  const fullPath = join(process.cwd(), file);
  if (!existsSync(fullPath)) return [`Missing Companion asset: ${file}`];
  const bytes = statSync(fullPath).size;
  return bytes > maxBytes ? [`Companion asset exceeds ${maxBytes} bytes: ${file} (${bytes} bytes)`] : [];
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const totalBytes = assets.reduce((total, { file }) => total + statSync(join(process.cwd(), file)).size, 0);
console.log(`Companion asset budget passed: ${assets.length} local WebP assets, ${totalBytes} bytes total.`);
