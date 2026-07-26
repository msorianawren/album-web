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
  
  if (content.includes("wren-feathers-update")) continue;
  
  const search = `setCompletion(json.data);`;
  const replace = `setCompletion(json.data);
            window.dispatchEvent(new CustomEvent("wren-feathers-update", {
              detail: { rewardGranted: json.data.rewardGranted, balanceAfter: json.data.balanceAfter }
            }));`;
            
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(p, content, 'utf-8');
    console.log("Updated", rel);
  } else {
    console.log("Could not find setCompletion(json.data); in", rel);
  }
}
