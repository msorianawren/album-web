import fs from 'fs';
import path from 'path';

const basePath = "D:/Projects/album-web/src/games/engines";

// Fix Snake
const snakePath = path.join(basePath, "snake/SnakeGame.tsx");
if (fs.existsSync(snakePath)) {
  let content = fs.readFileSync(snakePath, 'utf-8');
  content = content.replace(
    /typeof difficulty !== "undefined" \? difficulty : "standard"/g,
    'speed'
  );
  fs.writeFileSync(snakePath, content, 'utf-8');
}

// Fix Quiet Meadow
const meadowPath = path.join(basePath, "quiet-meadow/QuietMeadowGame.tsx");
if (fs.existsSync(meadowPath)) {
  let content = fs.readFileSync(meadowPath, 'utf-8');
  content = content.replace(
    /typeof difficulty !== "undefined" \? difficulty : "standard"/g,
    'difficulty'
  );
  fs.writeFileSync(meadowPath, content, 'utf-8');
}

// Fix the rest
const standardGames = [
  "echo-chimes/EchoChimesGame.tsx",
  "feather-merge/FeatherMergeGame.tsx",
  "memory-garden/MemoryGardenGame.tsx",
  "wren-flight/WrenFlightGame.tsx",
  "zen-cairn/ZenCairnGame.tsx"
];

for (const rel of standardGames) {
  const p = path.join(basePath, rel);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf-8');
    content = content.replace(
      /typeof difficulty !== "undefined" \? difficulty : "standard"/g,
      '"standard"'
    );
    fs.writeFileSync(p, content, 'utf-8');
  }
}
