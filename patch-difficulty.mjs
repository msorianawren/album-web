import fs from 'fs';
import path from 'path';

const files = [
  "src/games/engines/echo-chimes/EchoChimesGame.tsx",
  "src/games/engines/feather-merge/FeatherMergeGame.tsx",
  "src/games/engines/memory-garden/MemoryGardenGame.tsx",
  "src/games/engines/quiet-meadow/QuietMeadowGame.tsx",
  "src/games/engines/snake/SnakeGame.tsx",
  "src/games/engines/wren-flight/WrenFlightGame.tsx",
  "src/games/engines/zen-cairn/ZenCairnGame.tsx"
];

for (const rel of files) {
  const p = path.join("D:/Projects/album-web", rel);
  let content = fs.readFileSync(p, 'utf-8');
  
  // Find JSON.stringify({ gameSlug: "..." })
  content = content.replace(
    /body:\s*JSON\.stringify\(\{\s*gameSlug:\s*"(.*?)"\s*\}\)/g,
    'body: JSON.stringify({ gameSlug: "$1", difficultyKey: typeof difficulty !== "undefined" ? difficulty : "standard" })'
  );
  
  fs.writeFileSync(p, content, 'utf-8');
  console.log("Patched", rel);
}
